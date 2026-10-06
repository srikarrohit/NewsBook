use std::net::SocketAddr;

use axum::Router;
use axum::body::Bytes;
use axum::extract::{ConnectInfo, Path, State};
use axum::http::HeaderMap;
use axum::routing::{get, post};

use crate::AppState;
use crate::db::{self, AdCounter};
use crate::http::{
    ApiError, ApiResult, bad_request, forbidden, has_text, json_object, long_value, ok_json, ok_text, path_long,
    string_value,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/ads", post(create))
        .route("/ads/tile/{tile_id}", get(by_tile))
        .route("/ads/tile/{tile_id}/archived", get(archived_by_tile))
        .route("/ads/admin/{admin_id}", get(by_admin))
        .route("/ads/{id}", get(get_one).put(update).delete(delete))
        .route("/ads/{id}/view", post(track_view))
        .route("/ads/{id}/click", post(track_click))
        .route("/ads/{id}/dismissal", post(track_dismissal))
        .route("/ads/{id}/charge", post(track_charge))
}

async fn create(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let tile_id = body.get("tileId").filter(|v| !v.is_null());
    let admin_id = body.get("adminId").filter(|v| !v.is_null());
    let content = string_value(&body, "content");
    let image = string_value(&body, "image");

    let (Some(tile_id), Some(admin_id), Some(content)) = (tile_id, admin_id, content) else {
        return Err(bad_request("tileId, adminId and content are required"));
    };
    let (Some(tile_id), Some(admin_id)) = (long_value(Some(tile_id)), long_value(Some(admin_id))) else {
        return Err(bad_request("tileId and adminId must be numeric or numeric strings"));
    };
    let admin = db::user_by_id(&app.db, admin_id).await?;
    if admin.is_none_or(|u| u.role != "ADMIN") {
        return Err(forbidden("Only ADMIN users can create ads"));
    }
    let admin_tile = db::tile_by_admin(&app.db, admin_id).await?;
    if admin_tile.is_none_or(|t| t.id != tile_id) {
        return Err(forbidden("Admin cannot create ads for this tile"));
    }
    ok_json(db::insert_ad(&app.db, tile_id, admin_id, &content, image.as_deref()).await?)
}

async fn by_tile(State(app): State<AppState>, Path(tile_id): Path<String>) -> ApiResult {
    let tile_id = path_long(&tile_id)?;
    ok_json(db::ads_by_tile(&app.db, tile_id, false).await?)
}

async fn archived_by_tile(State(app): State<AppState>, Path(tile_id): Path<String>) -> ApiResult {
    let tile_id = path_long(&tile_id)?;
    ok_json(db::ads_by_tile(&app.db, tile_id, true).await?)
}

async fn by_admin(State(app): State<AppState>, Path(admin_id): Path<String>) -> ApiResult {
    let admin_id = path_long(&admin_id)?;
    ok_json(db::ads_by_admin(&app.db, admin_id).await?)
}

async fn get_one(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    match db::ad_by_id(&app.db, id).await? {
        Some(ad) => ok_json(ad),
        None => Err(ApiError::NotFound),
    }
}

async fn update(State(app): State<AppState>, Path(id): Path<String>, body: Bytes) -> ApiResult {
    let id = path_long(&id)?;
    let existing = db::ad_by_id(&app.db, id).await?.ok_or(ApiError::NotFound)?;
    let body = json_object(&body)?;
    let admin_id = long_value(body.get("adminId")).ok_or_else(|| bad_request("adminId is required and must be numeric"))?;
    if admin_id != existing.admin_id {
        return Err(forbidden("You can only edit your own ads"));
    }
    let content = Some(string_value(&body, "content")).filter(has_text).flatten();
    let image = Some(string_value(&body, "image")).filter(has_text).flatten();
    let updated = db::update_ad(&app.db, id, content.as_deref(), image.as_deref()).await?.ok_or(ApiError::NotFound)?;
    ok_json(updated)
}

/// First X-Forwarded-For hop (set by nginx), else the socket peer.
fn client_ip(headers: &HeaderMap, peer: SocketAddr) -> String {
    match headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        Some(forwarded) if !forwarded.is_empty() => forwarded.split(',').next().unwrap_or("").trim().to_owned(),
        _ => peer.ip().to_string(),
    }
}

async fn track_view(
    State(app): State<AppState>,
    Path(id): Path<String>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> ApiResult {
    let id = path_long(&id)?;
    let ip = client_ip(&headers, peer);
    // One view per IP address per ad - repeat visits don't inflate the count.
    if !ip.is_empty() {
        db::record_ad_view(&app.db, id, &ip).await?;
    }
    ok_text("Ad view tracked")
}

async fn track(app: AppState, id: String, counter: AdCounter, msg: &str) -> ApiResult {
    let id = path_long(&id)?;
    db::increment_ad_counter(&app.db, id, counter).await?;
    ok_text(msg)
}

async fn track_click(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    track(app, id, AdCounter::Clicks, "Ad click tracked").await
}

async fn track_dismissal(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    track(app, id, AdCounter::Dismissals, "Ad dismissal tracked").await
}

async fn track_charge(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    track(app, id, AdCounter::Charges, "Ad charge tracked").await
}

async fn delete(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    db::delete_ad(&app.db, id).await?;
    ok_text("Ad deleted successfully")
}

