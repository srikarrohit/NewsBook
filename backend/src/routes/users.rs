use axum::Router;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::routing::{get, post, put};

use crate::AppState;
use crate::db;
use crate::http::{ApiError, ApiResult, bad_request, bind_string, json_object, ok_json, path_long};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/users/login", post(login))
        .route("/users/{id}", get(get_one))
        .route("/users/{id}/tile/{tile_id}", put(set_tile))
}

async fn login(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let username = bind_string(&body, "username")?;
    let password = bind_string(&body, "password")?;
    let user = match (&username, &password) {
        (Some(u), Some(p)) => db::user_by_credentials(&app.db, u, p).await?,
        _ => None,
    };
    let username = username.unwrap_or_default();
    match user {
        Some(user) => {
            tracing::info!("Login success for username='{username}'");
            ok_json(user.dto())
        }
        None => {
            tracing::warn!("Login failed for username='{username}'");
            Err(bad_request("Invalid username or password"))
        }
    }
}

async fn get_one(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    match db::user_by_id(&app.db, id).await? {
        Some(user) => ok_json(user.dto()),
        None => Err(ApiError::NotFound),
    }
}

async fn set_tile(State(app): State<AppState>, Path((id, tile_id)): Path<(String, String)>) -> ApiResult {
    let (id, tile_id) = (path_long(&id)?, path_long(&tile_id)?);
    match db::set_user_tile(&app.db, id, tile_id).await? {
        Some(user) => ok_json(user.dto()),
        None => Err(ApiError::NotFound),
    }
}
