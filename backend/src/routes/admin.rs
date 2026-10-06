use axum::Router;
use axum::body::Bytes;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use serde_json::json;

use super::tiles::query_param;
use crate::AppState;
use crate::db::{self, AdminAccountDto, NewTile, User};
use crate::http::{ApiError, ApiResult, bad_request, bind_int, bind_long, bind_string, forbidden, json_object, ok_json};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/admin/register", post(register))
        .route("/admin/list-admins", get(list_admins))
        .route("/admin/create-admin", post(create_admin))
}

async fn is_super_admin(pool: &db::Pool, username: &str) -> db::Result<bool> {
    Ok(db::user_by_username(pool, username).await?.is_some_and(|u| u.role == "SUPER_ADMIN"))
}

async fn create_admin_user(pool: &db::Pool, username: &str, password: &str) -> Result<User, ApiError> {
    if db::user_by_username(pool, username).await?.is_some() {
        tracing::warn!("Duplicate user creation prevented: username={username}");
        return Err(ApiError::Text(StatusCode::CONFLICT, format!("Username already exists: {username}")));
    }
    let user = db::insert_user(pool, username, password, "ADMIN").await?;
    tracing::info!("Created user id={} username={}", user.id, user.username);
    Ok(user)
}

/// Register a new tile and create an admin user assigned to it.
async fn register(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let username = bind_string(&body, "username")?;
    let password = bind_string(&body, "password")?;
    let tile_name = bind_string(&body, "tileName")?;
    let tile_image = bind_string(&body, "tileImage")?;
    let priority = bind_int(&body, "priority")?;
    let state = bind_string(&body, "state")?;
    let district = bind_string(&body, "district")?;
    let created_by = bind_string(&body, "createdBy")?;

    let (Some(username), Some(password), Some(tile_name), Some(created_by)) = (username, password, tile_name, created_by)
    else {
        return Err(bad_request("username, password, tileName and createdBy are required"));
    };
    if !is_super_admin(&app.db, &created_by).await? {
        return Err(forbidden("Only SUPER_ADMIN can register a new grid"));
    }
    let state = state.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty());
    let district = district.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty());
    let (Some(state), Some(district)) = (state, district) else {
        return Err(bad_request("state and district are required"));
    };

    let user = create_admin_user(&app.db, &username, &password).await?;
    let tile = db::insert_tile(&app.db,
        NewTile {
            tile_id: format!("tile_{}", chrono::Utc::now().timestamp_millis()),
            admin_id: Some(user.id),
            admin_username: Some(&user.username),
            name: Some(tile_name),
            image: tile_image,
            priority: Some(priority.unwrap_or(0)),
            state: Some(state),
            district: Some(district),
        },
    ).await?;
    db::set_user_tile(&app.db, user.id, tile.id).await?;
    // The user DTO is the one captured at creation, before its tile was assigned.
    ok_json(json!([user.dto(), tile]))
}

/// List all admin accounts with their credentials (super-admin action).
async fn list_admins(State(app): State<AppState>, Query(params): Query<Vec<(String, String)>>) -> ApiResult {
    let requested_by = query_param(&params, "requestedBy").ok_or(ApiError::Spring(StatusCode::BAD_REQUEST))?;
    if !is_super_admin(&app.db, requested_by).await? {
        return Err(forbidden("Only SUPER_ADMIN can view admin accounts"));
    }
    let mut accounts = Vec::new();
    for user in db::users_by_role(&app.db, "ADMIN").await? {
        let tile = match user.tile_id {
            Some(tile_id) => db::tile_by_id(&app.db, tile_id).await?,
            None => None,
        };
        let (state, district) = tile.map(|t| (t.state, t.district)).unwrap_or_default();
        accounts.push(AdminAccountDto {
            id: user.id,
            username: user.username,
            password: user.password,
            tile_id: user.tile_id,
            state,
            district,
        });
    }
    ok_json(accounts)
}

/// Create an admin user assigned to an existing tile (super-admin action).
async fn create_admin(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let username = bind_string(&body, "username")?;
    let password = bind_string(&body, "password")?;
    let tile_id = bind_long(&body, "tileId")?;
    let created_by = bind_string(&body, "createdBy")?;
    let (Some(username), Some(password), Some(tile_id), Some(created_by)) = (username, password, tile_id, created_by)
    else {
        return Err(bad_request("username, password, tileId and createdBy are required"));
    };
    if !is_super_admin(&app.db, &created_by).await? {
        return Err(forbidden("Only SUPER_ADMIN can create admin users for a grid"));
    }
    if db::tile_by_id(&app.db, tile_id).await?.is_none() {
        return Err(ApiError::Text(StatusCode::NOT_FOUND, format!("Tile not found for id: {tile_id}")));
    }
    let user = create_admin_user(&app.db, &username, &password).await?;
    db::set_user_tile(&app.db, user.id, tile_id).await?;
    db::assign_admin_to_tile(&app.db, tile_id, user.id, &user.username).await?;
    ok_json(user.dto())
}
