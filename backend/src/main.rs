mod db;
mod gemini;
mod http;
mod import;
mod routes;
mod s3;
mod scheduler;

use std::env;
use std::error::Error;
use std::net::SocketAddr;
use std::sync::Arc;

pub struct Config {
    pub bind: String,
    pub database_url: String,
    pub s3_bucket: String,
    pub s3_region: String,
    pub gemini_api_key: String,
    pub gemini_model: String,
}

impl Config {
    fn from_env() -> Self {
        Config {
            bind: env_or("BIND_ADDR", "0.0.0.0:8080"),
            // mysql://user:pass@host:3306/newsbook - for RDS append
            // ?ssl-mode=verify_identity&ssl-ca=/etc/newsbook/rds-global-bundle.pem
            database_url: env_or("DATABASE_URL", ""),
            s3_bucket: env_or("AWS_S3_BUCKET", "newsbook-data"),
            s3_region: env_or("AWS_REGION", "ap-southeast-2"),
            gemini_api_key: env_or("GEMINI_API_KEY", ""),
            gemini_model: env_or("GEMINI_MODEL", "gemini-3.1-flash-lite"),
        }
    }
}

fn env_or(key: &str, default: &str) -> String {
    env::var(key).ok().filter(|v| !v.is_empty()).unwrap_or_else(|| default.to_string())
}

pub struct App {
    pub db: db::Pool,
    pub s3: s3::Storage,
    pub gemini: gemini::Gemini,
}

pub type AppState = Arc<App>;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,newsbook_backend=debug".into()),
        )
        .init();

    let config = Config::from_env();
    if config.database_url.is_empty() {
        return Err("DATABASE_URL is not set".into());
    }
    let pool = db::connect(&config.database_url).await?;

    let s3 = s3::Storage::new(&config.s3_bucket, &config.s3_region);

    // One-time migration commands (see deploy/MIGRATION.md).
    let args: Vec<String> = env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("import-h2-csv") => {
            let dir = args.get(2).ok_or("usage: newsbook-backend import-h2-csv <csv-dir>")?;
            return import::run(dir, &pool).await;
        }
        Some("migrate-photos") => {
            let (old_bucket_url, dirs) = match args.get(2).map(String::as_str) {
                Some("--from-bucket-url") => (args.get(3).map(String::as_str), args.get(4..).unwrap_or_default()),
                _ => (None, &args[2..]),
            };
            return import::migrate_photos(old_bucket_url, dirs, &pool, &s3).await;
        }
        _ => {}
    }

    db::init(&pool).await?;

    let app: AppState = Arc::new(App {
        db: pool,
        s3,
        gemini: gemini::Gemini::new(&config.gemini_api_key, &config.gemini_model),
    });

    if args.get(1).map(String::as_str) == Some("run-nightly-job") {
        return scheduler::archive_daily_content(&app).await.map_err(Into::into);
    }

    tokio::spawn(scheduler::run(app.clone()));

    let router = routes::router(app);
    let listener = tokio::net::TcpListener::bind(&config.bind).await?;
    tracing::info!("Listening on {}", config.bind);
    axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut s) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            s.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
