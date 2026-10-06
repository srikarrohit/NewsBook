mod admin;
mod ads;
mod images;
mod posts;
mod summarize;
mod tiles;
mod users;

pub use posts::content_key;

use std::time::Duration;

use axum::Router;
use axum::http::{HeaderName, Method, StatusCode};
use axum::middleware;
use tower_http::cors::{Any, CorsLayer};

use crate::AppState;
use crate::http::{ApiError, not_found_route, spring_error_bodies};

pub fn router(app: AppState) -> Router {
    let api = Router::new()
        .merge(tiles::routes())
        .merge(posts::routes())
        .merge(ads::routes())
        .merge(users::routes())
        .merge(admin::routes())
        .merge(images::routes())
        .merge(summarize::routes())
        .with_state(app);

    // @CrossOrigin(origins = "*") on every controller.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::HEAD, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers(Any)
        .expose_headers(Vec::<HeaderName>::new())
        .max_age(Duration::from_secs(1800));

    Router::new()
        .nest("/api", api)
        .fallback(|| async { not_found_route() })
        .method_not_allowed_fallback(|| async { ApiError::Spring(StatusCode::METHOD_NOT_ALLOWED) })
        .layer(middleware::from_fn(spring_error_bodies))
        .layer(cors)
}
