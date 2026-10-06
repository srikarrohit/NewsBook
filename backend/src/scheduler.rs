use std::collections::HashSet;

use chrono::{Days, FixedOffset, Utc};

use crate::AppState;
use crate::db;
use crate::routes::content_key;

/// Runs every day at IST midnight (Asia/Kolkata has no DST, so a fixed +05:30 offset).
pub async fn run(app: AppState) {
    let ist = FixedOffset::east_opt(5 * 3600 + 30 * 60).expect("valid offset");
    loop {
        let now = Utc::now().with_timezone(&ist);
        let next_midnight = (now.date_naive() + Days::new(1))
            .and_hms_opt(0, 0, 0)
            .and_then(|t| t.and_local_timezone(ist).single())
            .expect("IST midnight exists");
        let wait = (next_midnight - now).to_std().unwrap_or_default();
        tokio::time::sleep(wait).await;
        if let Err(e) = archive_daily_content(&app).await {
            tracing::error!("Midnight job failed: {e}");
        }
    }
}

/// Already-published posts are archived - out of the feeds, but kept along with their S3
/// image and text; posts still scheduled for a future date are left alone. Ads are
/// archived too, so their stats remain visible in the Archived Ads view. Finally, S3 is
/// swept for uploads that never ended up attached to a saved post/ad/tile.
pub async fn archive_daily_content(app: &AppState) -> Result<(), String> {
    let posts = db::archive_published_posts(&app.db).await.map_err(|e| e.to_string())?;
    let ads = db::archive_all_active_ads(&app.db).await.map_err(|e| e.to_string())?;
    tracing::info!("Midnight job: archived {posts} published post(s) and {ads} ad(s)");

    let keep = active_s3_keys(app).await.map_err(|e| e.to_string())?;
    app.s3.sweep_unreferenced("images/", &keep).await?;
    app.s3.sweep_unreferenced("content/", &keep).await?;
    Ok(())
}

async fn active_s3_keys(app: &AppState) -> db::Result<HashSet<String>> {
    let mut keys = HashSet::new();
    for post in db::all_posts(&app.db).await? {
        keys.extend(app.s3.key_from_url(post.image.as_deref()));
        keys.insert(content_key(post.id));
    }
    // Archived ads keep their images for the stats view.
    for image in db::ad_images(&app.db).await?.into_iter().chain(db::tile_images(&app.db).await?) {
        keys.extend(app.s3.key_from_url(image.as_deref()));
    }
    Ok(keys)
}
