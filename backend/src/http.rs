//! Response and request helpers that reproduce Spring MVC's wire behaviour, so the
//! existing apps (which read error bodies with `res.text()`) see identical responses:
//! - controller messages are plain-text bodies,
//! - `ResponseEntity.notFound().build()` is an empty 404,
//! - framework-level failures (bad path variable, malformed JSON, unhandled exception,
//!   unknown route) are Spring Boot's JSON error document.

use axum::Json;
use axum::extract::Request;
use axum::http::{StatusCode, header};
use axum::middleware::Next;
use axum::response::{IntoResponse, Response};
use serde::Serialize;
use serde_json::{Map, Value, json};

pub type ApiResult = Result<Response, ApiError>;
pub type JsonObject = Map<String, Value>;

pub enum ApiError {
    /// A controller's own `ResponseEntity.status(..).body("...")`.
    Text(StatusCode, String),
    /// `ResponseEntity.notFound().build()`.
    NotFound,
    /// A failure Spring itself would have answered with its JSON error document.
    Spring(StatusCode),
    /// An unhandled exception: logged, then a Spring 500 document.
    Internal(String),
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        ApiError::Internal(e.to_string())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::Text(status, msg) => text(status, msg),
            ApiError::NotFound => StatusCode::NOT_FOUND.into_response(),
            ApiError::Spring(status) => spring_error(status),
            ApiError::Internal(msg) => {
                tracing::error!("Unhandled error: {msg}");
                spring_error(StatusCode::INTERNAL_SERVER_ERROR)
            }
        }
    }
}

pub fn text(status: StatusCode, msg: impl Into<String>) -> Response {
    (status, [(header::CONTENT_TYPE, "text/plain;charset=UTF-8")], msg.into()).into_response()
}

pub fn ok_text(msg: &str) -> ApiResult {
    Ok(text(StatusCode::OK, msg))
}

pub fn ok_json<T: Serialize>(value: T) -> ApiResult {
    Ok(Json(value).into_response())
}

pub fn bad_request(msg: impl Into<String>) -> ApiError {
    ApiError::Text(StatusCode::BAD_REQUEST, msg.into())
}

pub fn forbidden(msg: impl Into<String>) -> ApiError {
    ApiError::Text(StatusCode::FORBIDDEN, msg.into())
}

pub fn not_found_route() -> ApiError {
    ApiError::Spring(StatusCode::NOT_FOUND)
}

#[derive(Clone)]
struct SpringErrorMarker;

fn spring_error(status: StatusCode) -> Response {
    let mut res = status.into_response();
    res.extensions_mut().insert(SpringErrorMarker);
    res
}

/// Fills in Spring's error document, which needs the request path.
pub async fn spring_error_bodies(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_owned();
    let res = next.run(req).await;
    if res.extensions().get::<SpringErrorMarker>().is_none() {
        return res;
    }
    let status = res.status();
    let body = json!({
        "timestamp": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, false),
        "status": status.as_u16(),
        "error": status.canonical_reason().unwrap_or(""),
        "path": path,
    });
    (status, Json(body)).into_response()
}

// ---------------------------------------------------------------- request parsing

/// A `@PathVariable Long` (Spring trims before converting).
pub fn path_long(raw: &str) -> Result<i64, ApiError> {
    raw.trim().parse().map_err(|_| ApiError::Spring(StatusCode::BAD_REQUEST))
}

/// A `@RequestBody` that must be a JSON object.
pub fn json_object(body: &[u8]) -> Result<JsonObject, ApiError> {
    match serde_json::from_slice(body) {
        Ok(Value::Object(map)) => Ok(map),
        _ => Err(ApiError::Spring(StatusCode::BAD_REQUEST)),
    }
}

// `Map<String, Object>` bodies: the controllers use instanceof checks, so a value of the
// wrong JSON type reads as absent rather than as an error.

/// `request.get(k) instanceof String ? (String) request.get(k) : null`
pub fn string_value(body: &JsonObject, key: &str) -> Option<String> {
    body.get(key).and_then(Value::as_str).map(str::to_owned)
}

/// `((Number) value).longValue()` - Some only for JSON numbers.
pub fn number_value(value: &Value) -> Option<i64> {
    let n = value.as_number()?;
    n.as_i64().or_else(|| n.as_u64().map(|u| u as i64)).or_else(|| n.as_f64().map(|f| f as i64))
}

/// AdController.parseLongValue: a number, or a string Long.parseLong accepts.
pub fn long_value(value: Option<&Value>) -> Option<i64> {
    match value? {
        Value::Number(_) => number_value(value?),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}

// Typed DTO bodies: Jackson coerces scalars between types, and rejects the request when
// it can't.

pub fn bind_string(body: &JsonObject, key: &str) -> Result<Option<String>, ApiError> {
    match body.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(Value::String(s)) => Ok(Some(s.clone())),
        Some(Value::Number(n)) => Ok(Some(n.to_string())),
        Some(Value::Bool(b)) => Ok(Some(b.to_string())),
        Some(_) => Err(ApiError::Spring(StatusCode::BAD_REQUEST)),
    }
}

pub fn bind_long(body: &JsonObject, key: &str) -> Result<Option<i64>, ApiError> {
    match body.get(key) {
        None | Some(Value::Null) => Ok(None),
        Some(v @ Value::Number(_)) => Ok(number_value(v)),
        Some(Value::String(s)) if s.trim().is_empty() => Ok(None),
        Some(Value::String(s)) => s.trim().parse().map(Some).map_err(|_| ApiError::Spring(StatusCode::BAD_REQUEST)),
        Some(_) => Err(ApiError::Spring(StatusCode::BAD_REQUEST)),
    }
}

pub fn bind_int(body: &JsonObject, key: &str) -> Result<Option<i32>, ApiError> {
    match bind_long(body, key)? {
        None => Ok(None),
        Some(v) => i32::try_from(v).map(Some).map_err(|_| ApiError::Spring(StatusCode::BAD_REQUEST)),
    }
}

/// `s != null && !s.trim().isEmpty()`
pub fn has_text(s: &Option<String>) -> bool {
    s.as_deref().is_some_and(|s| !s.trim().is_empty())
}
