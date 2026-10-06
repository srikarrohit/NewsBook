use axum::Router;
use axum::extract::{DefaultBodyLimit, Multipart, Path, State};
use axum::http::{StatusCode, header};
use axum::response::IntoResponse;
use axum::routing::{get, post};
use serde_json::json;

use crate::AppState;
use crate::http::{ApiError, ApiResult, bad_request, ok_json};

/// spring.servlet.multipart.max-request-size
const MAX_UPLOAD_BYTES: usize = 20 * 1024 * 1024;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/images/upload", post(upload).layer(DefaultBodyLimit::max(MAX_UPLOAD_BYTES)))
        .route("/images/{*name}", get(legacy_image))
}

fn too_large() -> ApiError {
    ApiError::Text(StatusCode::PAYLOAD_TOO_LARGE, "Image is too large. Please choose a smaller photo.".into())
}

async fn upload(State(app): State<AppState>, mut multipart: Multipart) -> ApiResult {
    let mut file = None;
    loop {
        let field = match multipart.next_field().await {
            Ok(Some(field)) => field,
            Ok(None) => break,
            Err(e) if e.status() == StatusCode::PAYLOAD_TOO_LARGE => return Err(too_large()),
            Err(_) => return Err(ApiError::Spring(StatusCode::BAD_REQUEST)),
        };
        if field.name() != Some("file") {
            continue;
        }
        let filename = field.file_name().unwrap_or_default().replace('\\', "/");
        let content_type = field.content_type().map(str::to_owned);
        let bytes = match field.bytes().await {
            Ok(bytes) => bytes,
            Err(e) if e.status() == StatusCode::PAYLOAD_TOO_LARGE => return Err(too_large()),
            Err(_) => return Err(ApiError::Spring(StatusCode::BAD_REQUEST)),
        };
        file = Some((filename, content_type, bytes));
        break;
    }
    // Missing part: Spring's MissingServletRequestPartException.
    let (filename, content_type, bytes) = file.ok_or(ApiError::Spring(StatusCode::BAD_REQUEST))?;
    if bytes.is_empty() {
        return Err(bad_request("No file selected"));
    }

    let ext = match filename.rfind('.') {
        Some(i) if i > 0 => &filename[i..],
        _ => "",
    };
    let key = format!("images/{}{ext}", uuid::Uuid::new_v4());
    match app.s3.upload_bytes(&key, &bytes, content_type.as_deref()).await {
        Ok(url) => ok_json(json!({ "url": url })),
        Err(e) => {
            tracing::error!("Image upload failed: {e}");
            Err(ApiError::Text(StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to upload image: {e}")))
        }
    }
}

/// Photos once lived on the server's disk under /api/images/. They are all in S3 now
/// (`newsbook-backend migrate-photos`), so any old path redirects to its S3 copy.
async fn legacy_image(State(app): State<AppState>, Path(name): Path<String>) -> impl IntoResponse {
    (StatusCode::FOUND, [(header::LOCATION, app.s3.public_url(&format!("images/{name}")))])
}
