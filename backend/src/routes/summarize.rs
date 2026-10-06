use axum::Router;
use axum::body::Bytes;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::post;
use serde_json::json;

use crate::AppState;
use crate::http::{ApiError, ApiResult, bad_request, has_text, json_object, ok_json, string_value};

pub fn routes() -> Router<AppState> {
    Router::new().route("/summarize", post(summarize))
}

async fn summarize(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let text = string_value(&body, "text");
    if !has_text(&text) {
        return Err(bad_request("text is required"));
    }
    match app.gemini.summarize(&text.unwrap()).await {
        Ok(summary) => ok_json(json!({ "summary": summary })),
        Err(e) => Err(ApiError::Text(StatusCode::BAD_GATEWAY, format!("Failed to summarize: {e}"))),
    }
}
