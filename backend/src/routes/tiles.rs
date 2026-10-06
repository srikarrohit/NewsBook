use axum::Router;
use axum::body::Bytes;
use axum::extract::{Path, Query, State};
use axum::routing::get;

use crate::AppState;
use crate::db::{self, NewTile, TileUpdate};
use crate::http::{ApiError, ApiResult, bind_int, bind_string, json_object, ok_json, ok_text, path_long};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/tiles", get(list).post(create))
        .route("/tiles/{id}", get(get_one).put(update).delete(delete))
}

/// First value of a query parameter, like `@RequestParam` with repeated keys.
pub fn query_param<'a>(params: &'a [(String, String)], key: &str) -> Option<&'a str> {
    params.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
}

async fn list(State(app): State<AppState>, Query(params): Query<Vec<(String, String)>>) -> ApiResult {
    let state = query_param(&params, "state").map(str::trim).filter(|s| !s.is_empty());
    let district = query_param(&params, "district").map(str::trim).filter(|s| !s.is_empty());
    let tiles = match (state, district) {
        (Some(state), Some(district)) => {
            let exact = db::tiles_by_state_and_district(&app.db, state, district).await?;
            // Fall back to a district-only match so grids whose state wasn't recorded
            // (registered before state tracking existed) still show up for readers.
            if exact.is_empty() { db::tiles_by_district(&app.db, district).await? } else { exact }
        }
        (None, Some(district)) => db::tiles_by_district(&app.db, district).await?,
        _ => db::all_tiles(&app.db).await?,
    };
    ok_json(tiles)
}

async fn get_one(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    match db::tile_by_id(&app.db, id).await? {
        Some(tile) => ok_json(tile),
        None => Err(ApiError::NotFound),
    }
}

async fn create(State(app): State<AppState>, body: Bytes) -> ApiResult {
    let body = json_object(&body)?;
    let tile_id = bind_string(&body, "tileId")?
        .unwrap_or_else(|| format!("tile_{}", chrono::Utc::now().timestamp_millis()));
    // Like the Java version this sets no admin, which the NOT NULL admin_id column
    // rejects - tiles are created through /admin/register instead.
    let tile = db::insert_tile(&app.db,
        NewTile {
            tile_id,
            admin_id: None,
            admin_username: None,
            name: bind_string(&body, "name")?,
            image: bind_string(&body, "image")?,
            priority: Some(0),
            state: None,
            district: None,
        },
    ).await?;
    ok_json(tile)
}

async fn update(State(app): State<AppState>, Path(id): Path<String>, body: Bytes) -> ApiResult {
    let id = path_long(&id)?;
    let body = json_object(&body)?;
    let update = TileUpdate {
        name: bind_string(&body, "name")?,
        image: bind_string(&body, "image")?,
        tile_id: bind_string(&body, "tileId")?.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()),
        priority: bind_int(&body, "priority")?,
        state: bind_string(&body, "state")?,
        district: bind_string(&body, "district")?,
    };
    match db::update_tile(&app.db, id, update).await? {
        Some(tile) => ok_json(tile),
        None => Err(ApiError::NotFound),
    }
}

async fn delete(State(app): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let id = path_long(&id)?;
    db::delete_tile(&app.db, id).await?;
    ok_text("Tile deleted successfully")
}
