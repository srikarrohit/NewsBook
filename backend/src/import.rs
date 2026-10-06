//! One-time migration from the Java app's H2 database. deploy/export-h2-csv.sh writes
//! one CSV per table with H2's CSVWRITE; this loads them into an empty MySQL database,
//! keeping every id so references between tables (and S3 content/{id}.txt keys) hold.

use std::collections::HashMap;
use std::error::Error;
use std::path::Path;

use chrono::NaiveDateTime;
use sqlx::Row;

use crate::db;
use crate::s3::Storage;

/// Must match NULL_MARKER in deploy/export-h2-csv.sh. CSVWRITE quotes every non-null
/// value, so this unquoted marker is how a NULL is told apart from an empty string.
const NULL_MARKER: &str = "__H2_NULL__";

#[derive(Clone, Copy)]
enum Kind {
    Int,
    Text,
    Bool,
    Timestamp,
}

enum Value {
    Null,
    Int(i64),
    Text(String),
    Bool(bool),
    Timestamp(NaiveDateTime),
}

const TABLES: &[(&str, &[(&str, Kind)])] = &[
    ("users", &[
        ("id", Kind::Int), ("username", Kind::Text), ("password", Kind::Text), ("role", Kind::Text),
        ("tile_id", Kind::Int), ("created_at", Kind::Timestamp), ("updated_at", Kind::Timestamp),
    ]),
    ("tiles", &[
        ("id", Kind::Int), ("tile_id", Kind::Text), ("admin_id", Kind::Int), ("admin_username", Kind::Text),
        ("created_at", Kind::Timestamp), ("updated_at", Kind::Timestamp), ("name", Kind::Text), ("image", Kind::Text),
        ("priority", Kind::Int), ("state", Kind::Text), ("district", Kind::Text),
    ]),
    ("posts", &[
        ("id", Kind::Int), ("tile_id", Kind::Text), ("admin_id", Kind::Int), ("content", Kind::Text),
        ("image", Kind::Text), ("tag", Kind::Text), ("created_at", Kind::Timestamp), ("updated_at", Kind::Timestamp),
        ("archived", Kind::Bool), ("publish_at", Kind::Timestamp),
    ]),
    ("ads", &[
        ("id", Kind::Int), ("tile_id", Kind::Int), ("admin_id", Kind::Int), ("content", Kind::Text),
        ("image", Kind::Text), ("tag", Kind::Text), ("views", Kind::Int), ("clicks", Kind::Int),
        ("dismissals", Kind::Int), ("charges", Kind::Int), ("created_at", Kind::Timestamp),
        ("updated_at", Kind::Timestamp), ("archived", Kind::Bool),
    ]),
    ("ad_views", &[
        ("id", Kind::Int), ("ad_id", Kind::Int), ("ip_address", Kind::Text), ("viewed_at", Kind::Timestamp),
    ]),
];

fn convert(raw: &str, kind: Kind) -> Result<Value, Box<dyn Error>> {
    if raw == NULL_MARKER {
        return Ok(Value::Null);
    }
    Ok(match kind {
        Kind::Text => Value::Text(raw.to_owned()),
        Kind::Int => Value::Int(raw.trim().parse()?),
        Kind::Bool => Value::Bool(match raw.trim().to_ascii_uppercase().as_str() {
            "TRUE" | "1" => true,
            "FALSE" | "0" => false,
            other => return Err(format!("not a boolean: {other}").into()),
        }),
        Kind::Timestamp => Value::Timestamp(
            NaiveDateTime::parse_from_str(raw.trim(), "%Y-%m-%d %H:%M:%S%.f")
                .or_else(|_| NaiveDateTime::parse_from_str(raw.trim(), "%Y-%m-%dT%H:%M:%S%.f"))
                .map_err(|e| format!("bad timestamp {raw:?}: {e}"))?,
        ),
    })
}

/// A column added after this row's H2 schema (e.g. publish_at) gets the Java default.
fn missing_column_default(name: &str) -> Value {
    match name {
        "publish_at" => Value::Timestamp(db::now()),
        "archived" => Value::Bool(false),
        "views" | "clicks" | "dismissals" | "charges" => Value::Int(0),
        _ => Value::Null,
    }
}

pub async fn run(csv_dir: &str, pool: &db::Pool) -> Result<(), Box<dyn Error>> {
    db::create_schema(pool).await?;
    for table in db::TABLES {
        let rows: i64 = sqlx::query(&format!("SELECT COUNT(*) FROM {table}")).fetch_one(pool).await?.try_get(0)?;
        if rows > 0 {
            return Err(format!(
                "table {table} already has {rows} row(s) - import only into an empty database (run it before the app's first start)"
            )
            .into());
        }
    }

    let mut tx = pool.begin().await?;
    for (table, columns) in TABLES {
        let path = Path::new(csv_dir).join(format!("{table}.csv"));
        let mut reader = csv::Reader::from_path(&path).map_err(|e| format!("{}: {e}", path.display()))?;
        let header: HashMap<String, usize> =
            reader.headers()?.iter().enumerate().map(|(i, h)| (h.to_ascii_lowercase(), i)).collect();
        let indexes: Vec<Option<usize>> = columns.iter().map(|(name, _)| header.get(*name).copied()).collect();
        let names: Vec<&str> = columns.iter().map(|(name, _)| *name).collect();
        let sql = format!("INSERT INTO {table} ({}) VALUES ({})", names.join(", "), vec!["?"; names.len()].join(", "));

        let mut count = 0;
        for record in reader.records() {
            let record = record?;
            let mut query = sqlx::query(&sql);
            for ((name, kind), index) in columns.iter().zip(&indexes) {
                let value = match index.and_then(|i| record.get(i)) {
                    Some(raw) => convert(raw, *kind).map_err(|e| format!("{table}.{name}: {e}"))?,
                    None => missing_column_default(name),
                };
                query = match value {
                    Value::Null => query.bind(None::<String>),
                    Value::Int(v) => query.bind(v),
                    Value::Text(v) => query.bind(v),
                    Value::Bool(v) => query.bind(v),
                    Value::Timestamp(v) => query.bind(v),
                };
            }
            query.execute(&mut *tx).await.map_err(|e| format!("{table} row {}: {e}", count + 1))?;
            count += 1;
        }
        println!("{table}: imported {count} row(s)");
    }
    tx.commit().await?;

    // Continue each table's ids where H2 would have (its next id is often past MAX(id)),
    // so new rows never reuse an id that S3 content keys have already seen.
    let identity = Path::new(csv_dir).join("_identity.csv");
    if identity.exists() {
        for record in csv::Reader::from_path(&identity)?.records() {
            let record = record?;
            let (Some(table), Some(next)) = (record.get(0), record.get(1)) else { continue };
            if !db::TABLES.contains(&table) {
                continue;
            }
            let next: i64 = next.trim().parse()?;
            // MySQL keeps the larger of this and MAX(id) + 1.
            sqlx::query(&format!("ALTER TABLE {table} AUTO_INCREMENT = {next}")).execute(pool).await?;
            println!("{table}: next id {next}");
        }
    }

    println!("Import complete");
    Ok(())
}

fn content_type_for(name: &str) -> &'static str {
    match name.rsplit('.').next().map(str::to_ascii_lowercase).as_deref() {
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("png") => "image/png",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("heic") => "image/heic",
        _ => "binary/octet-stream",
    }
}

/// Puts every photo in the configured S3 bucket and repoints the database at it:
/// - "/images/<file>" references (photos the Java app served from the server's disk) are
///   uploaded from the first of `dirs` that has the file;
/// - references under `old_bucket_url` (the previous bucket, e.g. Sydney) are copied over.
/// Post text backups (content/<id>.txt) are re-written from the database. References
/// whose photo can't be found are left unchanged and reported.
pub async fn migrate_photos(
    old_bucket_url: Option<&str>,
    dirs: &[String],
    pool: &db::Pool,
    s3: &Storage,
) -> Result<(), Box<dyn Error>> {
    let mut prefixes = vec!["/images/"];
    prefixes.extend(old_bucket_url);
    let http = reqwest::Client::new();
    let (mut moved, mut missing) = (0, Vec::new());

    for prefix in prefixes {
        let references = db::image_references_with_prefix(pool, prefix).await?;
        println!("{} reference(s) under {prefix}", references.len());
        for reference in references {
            let rest = &reference[prefix.len()..];
            let (key, bytes) = if prefix == "/images/" {
                let found = dirs.iter().map(|d| Path::new(d).join(rest)).find(|p| p.is_file());
                (format!("images/{rest}"), found.map(std::fs::read).transpose()?)
            } else {
                let response = http.get(&reference).send().await?;
                let bytes = if response.status().is_success() { Some(response.bytes().await?.to_vec()) } else { None };
                (rest.to_owned(), bytes)
            };
            let Some(bytes) = bytes else {
                missing.push(reference);
                continue;
            };
            let url = s3.upload_bytes(&key, &bytes, Some(content_type_for(&key))).await?;
            let rows = db::replace_image_reference(pool, &reference, &url).await?;
            println!("{reference} -> {url} ({rows} row(s))");
            moved += 1;
        }
    }
    println!("Moved {moved} photo(s) to S3");
    if !missing.is_empty() {
        println!("Not found (references left unchanged): {missing:?}");
    }

    let posts = db::all_posts(pool).await?;
    for post in &posts {
        s3.upload_text(&crate::routes::content_key(post.id), &post.content).await?;
    }
    println!("Backed up text of {} post(s) to S3", posts.len());
    Ok(())
}
