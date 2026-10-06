use axum::Router;
use axum::body::Bytes;
use axum::extract::{Path, State};
use axum::routing::get;
use chrono::NaiveDateTime;

use crate::AppState;
use crate::db::{self, NewPost, PostDto, PostUpdate};
use crate::http::{
    ApiError, ApiResult, bad_request, forbidden, has_text, json_object, number_value, ok_json, ok_text, path_long,
    string_value,
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/posts", axum::routing::post(create))
        .route("/posts/tile/{tile_id}", get(by_tile))
        .route("/posts/tile/{tile_id}/published", get(published_by_tile))
        .route("/posts/admin/{admin_id}", get(by_admin))
        .route("/posts/{id}", get(get_one).put(update).delete(delete))
}

/// `LocalDateTime.parse`: ISO local date-time, seconds and fraction optional. An
/// unparseable value was an unhandled exception (500) in the Java app.
fn parse_publish_at(raw: &str) -> Result<NaiveDateTime, ApiError> {
    NaiveDateTime::parse_from_str(raw, "%Y-%m-%dT%H:%M:%S%.f")
        .or_else(|_| NaiveDateTime::parse_from_str(raw, "%Y-%m-%dT%H:%M"))
        .map_err(|e| ApiError::Internal(format!("Text '{raw}' could not be parsed: {e}")))
}

fn admin_id_from(value: Option<&serde_json::Value>) -> Result<i64, ApiError> {
    let value = value.filter(|v| !v.is_null()).ok_or_else(|| bad_request("adminId is required"))?;
    number_value(value).ok_or_else(|| bad_request("adminId must be a number"))
}

async fn create(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let tile_id = string_value(&body, "tileId");
    let admin_id = body.get("adminId").filter(|v| !v.is_null());
    let content = string_value(&body, "content");
    let image = string_value(&body, "image");
    let tag = string_value(&body, "tag");
    let publish_at = string_value(&body, "publishAt");

    let (Some(tile_id), Some(admin_id), Some(content)) = (tile_id, admin_id, content) else {
        return Err(bad_request("tileId, adminId and content are required"));
    };
    if !has_text(&publish_at) {
        return Err(bad_request("publishAt is required"));
    }
    let admin_id = number_value(admin_id).ok_or_else(|| bad_request("adminId must be a number"))?;

    let admin_tile = {
        let admin = db::user_by_id(&app.db, admin_id).await?;
        if admin.is_none_or(|u| u.role != "ADMIN") {
            return Err(forbidden("Only ADMIN users can create posts"));
        }
        db::tile_by_admin(&app.db, admin_id).await?.ok_or_else(|| forbidden("Admin is not assigned to any tile"))?
    };
    let requested_tile_id: i64 = tile_id.parse().map_err(|_| bad_request("Invalid tileId format"))?;
    if requested_tile_id != admin_tile.id {
        return Err(forbidden("Admin cannot create posts for this tile"));
    }

    let publish_at = parse_publish_at(publish_at.as_deref().unwrap_or_default())?;
    let tag = if has_text(&tag) { tag.unwrap() } else { "General".to_owned() };
    let post = db::insert_post(&app.db,
        NewPost {
            tile_id: &tile_id,
            admin_id,
            content: &content,
            image: image.as_deref(),
            tag: &tag,
            publish_at,
        },
    ).await?;
    backup_content(&app, &post).await;
    ok_json(post)
}

async fn by_tile(State(app): State<AppState>, Path(tile_id): Path<String>) -> ApiResult {
    ok_json(db::posts_by_tile(&app.db, &tile_id).await?)
}

/// Reader-facing feed: excludes posts scheduled for a future publish date.
async fn published_by_tile(State(app): State<AppState>, Path(tile_id): Path<String>) -> ApiResult {
    ok_json(db::published_posts_by_tile(&app.db, &tile_id).await?)
}

async fn by_admin(State(app): State<AppState>, Path(admin_id): Path<String>) -> ApiResult {
    let admin_id = path_long(&admin_id)?;
    ok_json(db::posts_by_admin(&app.db, admin_id).await?)
}

async fn get_one(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    match db::post_by_id(&app.db, id).await? {
        Some(post) => ok_json(post),
        None => Err(ApiError::NotFound),
    }
}

async fn update(State(app): State<AppState>, Path(id): Path<String>, body: Bytes) -> ApiResult {
    let id = path_long(&id)?;
    let existing = db::post_by_id(&app.db, id).await?.ok_or(ApiError::NotFound)?;
    let body = json_object(&body)?;
    let admin_id = admin_id_from(body.get("adminId"))?;
    if admin_id != existing.admin_id {
        return Err(forbidden("You can only edit your own posts"));
    }

    let non_blank = |key| Some(string_value(&body, key)).filter(has_text).flatten();
    let publish_at = match non_blank("publishAt") {
        Some(raw) => Some(parse_publish_at(&raw)?),
        None => None,
    };
    let (content, image, tag) = (non_blank("content"), non_blank("image"), non_blank("tag"));
    let updated = db::update_post(&app.db,
        id,
        PostUpdate { content: content.as_deref(), image: image.as_deref(), tag: tag.as_deref(), publish_at },
    ).await?
    .ok_or(ApiError::NotFound)?;
    backup_content(&app, &updated).await;
    ok_json(updated)
}

async fn delete(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    let existing = db::post_by_id(&app.db, id).await?;
    if let Some(post) = existing {
        delete_s3_assets(&app, &post).await;
        db::delete_post(&app.db, id).await?;
    }
    ok_text("Post deleted successfully")
}

pub fn content_key(post_id: i64) -> String {
    format!("content/{post_id}.txt")
}

async fn backup_content(app: &AppState, post: &PostDto) {
    if let Err(e) = app.s3.upload_text(&content_key(post.id), &post.content).await {
        tracing::warn!("Failed to back up post {} content to S3: {e}", post.id);
    }
}

pub async fn delete_s3_assets(app: &AppState, post: &PostDto) {
    if let Some(key) = app.s3.key_from_url(post.image.as_deref()) {
        app.s3.delete_object(&key).await;
    }
    app.s3.delete_object(&content_key(post.id)).await;
}
