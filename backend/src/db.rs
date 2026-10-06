//! MySQL storage (Amazon RDS in production). The schema mirrors what Hibernate generated
//! for the old H2 database - same table/column names, VARCHAR(255) limits, NOT NULL and
//! UNIQUE constraints - so data imported from H2 behaves identically. Text compares
//! with utf8mb4_0900_as_cs: case- and trailing-space-sensitive like H2, which matters for
//! username/password lookups (MySQL's default collation is case-insensitive).
//! Timestamps are server-local DATETIMEs, as the Java app's LocalDateTime.now() was.

use chrono::{Local, NaiveDateTime};
use serde::Serialize;
use sqlx::mysql::{MySqlPool, MySqlPoolOptions, MySqlRow};
use sqlx::{Executor, MySql, Row};

pub type Pool = MySqlPool;
pub type Result<T> = std::result::Result<T, sqlx::Error>;

const DTO_FORMAT: &str = "%Y-%m-%d %H:%M:%S";

pub fn now() -> NaiveDateTime {
    Local::now().naive_local()
}

fn dto_ts(t: NaiveDateTime) -> String {
    t.format(DTO_FORMAT).to_string()
}

pub async fn connect(url: &str) -> Result<Pool> {
    MySqlPoolOptions::new()
        .max_connections(5)
        .min_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect(url)
        .await
}

const SCHEMA: &[&str] = &[
    "CREATE TABLE IF NOT EXISTS users (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
        tile_id BIGINT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs",
    "CREATE TABLE IF NOT EXISTS tiles (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tile_id VARCHAR(255) NOT NULL UNIQUE,
        admin_id BIGINT NOT NULL,
        admin_username VARCHAR(255) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NULL,
        name VARCHAR(255) NULL,
        image VARCHAR(255) NULL,
        priority INT NULL,
        state VARCHAR(255) NULL,
        district VARCHAR(255) NULL,
        INDEX idx_tiles_admin (admin_id),
        INDEX idx_tiles_location (district, state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs",
    "CREATE TABLE IF NOT EXISTS posts (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tile_id VARCHAR(255) NOT NULL,
        admin_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        image TEXT NULL,
        tag VARCHAR(255) NOT NULL,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NULL,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        publish_at DATETIME(6) NOT NULL,
        INDEX idx_posts_tile (tile_id, archived, created_at),
        INDEX idx_posts_admin (admin_id, archived, created_at),
        INDEX idx_posts_publish (publish_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs",
    "CREATE TABLE IF NOT EXISTS ads (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tile_id BIGINT NOT NULL,
        admin_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        image TEXT NULL,
        tag VARCHAR(255) NOT NULL,
        views INT NOT NULL DEFAULT 0,
        clicks INT NOT NULL DEFAULT 0,
        dismissals INT NOT NULL DEFAULT 0,
        charges INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL,
        updated_at DATETIME(6) NULL,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        INDEX idx_ads_tile (tile_id, archived, created_at),
        INDEX idx_ads_admin (admin_id, archived, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs",
    "CREATE TABLE IF NOT EXISTS ad_views (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ad_id BIGINT NOT NULL,
        ip_address VARCHAR(255) NOT NULL,
        viewed_at DATETIME(6) NOT NULL,
        UNIQUE KEY uk_ad_views_ad_ip (ad_id, ip_address)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs",
];

pub const TABLES: &[&str] = &["users", "tiles", "posts", "ads", "ad_views"];

pub async fn create_schema(pool: &Pool) -> Result<()> {
    for statement in SCHEMA {
        pool.execute(*statement).await?;
    }
    Ok(())
}

/// Schema plus the data.sql seed: the super admin account, only if missing so a
/// password changed later is never overwritten.
pub async fn init(pool: &Pool) -> Result<()> {
    create_schema(pool).await?;
    sqlx::query(
        "INSERT INTO users (id, username, password, role, tile_id, created_at, updated_at)
         SELECT 1, 'superadmin', 'SuperSecret123!', 'SUPER_ADMIN', NULL, ?, ?
         FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1)",
    )
    .bind(now())
    .bind(now())
    .execute(pool)
    .await?;
    Ok(())
}

// ---------------------------------------------------------------- users

pub struct User {
    pub id: i64,
    pub username: String,
    pub password: String,
    pub role: String,
    pub tile_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserDto {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub tile_id: Option<i64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminAccountDto {
    pub id: i64,
    pub username: String,
    pub password: String,
    pub tile_id: Option<i64>,
    pub state: Option<String>,
    pub district: Option<String>,
}

impl User {
    pub fn dto(self) -> UserDto {
        UserDto { id: self.id, username: self.username, role: self.role, tile_id: self.tile_id }
    }
}

const USER_COLS: &str = "id, username, password, role, tile_id";

fn user_row(r: MySqlRow) -> Result<User> {
    Ok(User {
        id: r.try_get(0)?,
        username: r.try_get(1)?,
        password: r.try_get(2)?,
        role: r.try_get(3)?,
        tile_id: r.try_get(4)?,
    })
}

pub async fn user_by_id(pool: &Pool, id: i64) -> Result<Option<User>> {
    sqlx::query(&format!("SELECT {USER_COLS} FROM users WHERE id = ?"))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .map(user_row)
        .transpose()
}

pub async fn user_by_username(pool: &Pool, username: &str) -> Result<Option<User>> {
    sqlx::query(&format!("SELECT {USER_COLS} FROM users WHERE username = ?"))
        .bind(username)
        .fetch_optional(pool)
        .await?
        .map(user_row)
        .transpose()
}

pub async fn user_by_credentials(pool: &Pool, username: &str, password: &str) -> Result<Option<User>> {
    sqlx::query(&format!("SELECT {USER_COLS} FROM users WHERE username = ? AND password = ?"))
        .bind(username)
        .bind(password)
        .fetch_optional(pool)
        .await?
        .map(user_row)
        .transpose()
}

pub async fn users_by_role(pool: &Pool, role: &str) -> Result<Vec<User>> {
    sqlx::query(&format!("SELECT {USER_COLS} FROM users WHERE role = ? ORDER BY id"))
        .bind(role)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(user_row)
        .collect()
}

pub async fn insert_user(pool: &Pool, username: &str, password: &str, role: &str) -> Result<User> {
    let ts = now();
    let result = sqlx::query(
        "INSERT INTO users (username, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(username)
    .bind(password)
    .bind(role)
    .bind(ts)
    .bind(ts)
    .execute(pool)
    .await?;
    Ok(User {
        id: result.last_insert_id() as i64,
        username: username.to_owned(),
        password: password.to_owned(),
        role: role.to_owned(),
        tile_id: None,
    })
}

pub async fn set_user_tile(pool: &Pool, user_id: i64, tile_id: i64) -> Result<Option<User>> {
    if user_by_id(pool, user_id).await?.is_none() {
        return Ok(None);
    }
    sqlx::query("UPDATE users SET tile_id = ? WHERE id = ?").bind(tile_id).bind(user_id).execute(pool).await?;
    user_by_id(pool, user_id).await
}

// ---------------------------------------------------------------- tiles

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TileDto {
    pub id: i64,
    pub tile_id: String,
    pub name: Option<String>,
    pub image: Option<String>,
    pub priority: Option<i32>,
    pub state: Option<String>,
    pub district: Option<String>,
}

const TILE_COLS: &str = "id, tile_id, name, image, priority, state, district";

fn tile_row(r: MySqlRow) -> Result<TileDto> {
    Ok(TileDto {
        id: r.try_get(0)?,
        tile_id: r.try_get(1)?,
        name: r.try_get(2)?,
        image: r.try_get(3)?,
        priority: r.try_get(4)?,
        state: r.try_get(5)?,
        district: r.try_get(6)?,
    })
}

async fn tile_list(pool: &Pool, where_clause: &str, args: &[&str]) -> Result<Vec<TileDto>> {
    let sql = format!("SELECT {TILE_COLS} FROM tiles {where_clause} ORDER BY id");
    let mut query = sqlx::query(&sql);
    for arg in args {
        query = query.bind(*arg);
    }
    query.fetch_all(pool).await?.into_iter().map(tile_row).collect()
}

pub async fn all_tiles(pool: &Pool) -> Result<Vec<TileDto>> {
    tile_list(pool, "", &[]).await
}

pub async fn tiles_by_district(pool: &Pool, district: &str) -> Result<Vec<TileDto>> {
    tile_list(pool, "WHERE district = ?", &[district]).await
}

pub async fn tiles_by_state_and_district(pool: &Pool, state: &str, district: &str) -> Result<Vec<TileDto>> {
    tile_list(pool, "WHERE state = ? AND district = ?", &[state, district]).await
}

pub async fn tile_by_id(pool: &Pool, id: i64) -> Result<Option<TileDto>> {
    sqlx::query(&format!("SELECT {TILE_COLS} FROM tiles WHERE id = ?"))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .map(tile_row)
        .transpose()
}

pub async fn tile_by_admin(pool: &Pool, admin_id: i64) -> Result<Option<TileDto>> {
    sqlx::query(&format!("SELECT {TILE_COLS} FROM tiles WHERE admin_id = ? ORDER BY id LIMIT 1"))
        .bind(admin_id)
        .fetch_optional(pool)
        .await?
        .map(tile_row)
        .transpose()
}

pub struct NewTile<'a> {
    pub tile_id: String,
    pub admin_id: Option<i64>,
    pub admin_username: Option<&'a str>,
    pub name: Option<String>,
    pub image: Option<String>,
    pub priority: Option<i32>,
    pub state: Option<String>,
    pub district: Option<String>,
}

pub async fn insert_tile(pool: &Pool, t: NewTile<'_>) -> Result<TileDto> {
    let ts = now();
    let result = sqlx::query(
        "INSERT INTO tiles (tile_id, admin_id, admin_username, created_at, updated_at, name, image, priority, state, district)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(t.tile_id)
    .bind(t.admin_id)
    .bind(t.admin_username)
    .bind(ts)
    .bind(ts)
    .bind(t.name)
    .bind(t.image)
    .bind(t.priority)
    .bind(t.state)
    .bind(t.district)
    .execute(pool)
    .await?;
    Ok(tile_by_id(pool, result.last_insert_id() as i64).await?.expect("inserted tile"))
}

#[derive(Default)]
pub struct TileUpdate {
    pub name: Option<String>,
    pub image: Option<String>,
    pub tile_id: Option<String>,
    pub priority: Option<i32>,
    pub state: Option<String>,
    pub district: Option<String>,
}

pub async fn update_tile(pool: &Pool, id: i64, u: TileUpdate) -> Result<Option<TileDto>> {
    if tile_by_id(pool, id).await?.is_none() {
        return Ok(None);
    }
    sqlx::query(
        "UPDATE tiles SET name = COALESCE(?, name), image = COALESCE(?, image), tile_id = COALESCE(?, tile_id),
         priority = COALESCE(?, priority), state = COALESCE(?, state), district = COALESCE(?, district),
         updated_at = ? WHERE id = ?",
    )
    .bind(u.name)
    .bind(u.image)
    .bind(u.tile_id)
    .bind(u.priority)
    .bind(u.state)
    .bind(u.district)
    .bind(now())
    .bind(id)
    .execute(pool)
    .await?;
    tile_by_id(pool, id).await
}

pub async fn assign_admin_to_tile(pool: &Pool, tile_id: i64, admin_id: i64, admin_username: &str) -> Result<()> {
    sqlx::query("UPDATE tiles SET admin_id = ?, admin_username = ? WHERE id = ?")
        .bind(admin_id)
        .bind(admin_username)
        .bind(tile_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn delete_tile(pool: &Pool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM tiles WHERE id = ?").bind(id).execute(pool).await?;
    Ok(())
}

async fn images(pool: &Pool, table: &str) -> Result<Vec<Option<String>>> {
    sqlx::query(&format!("SELECT image FROM {table}"))
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(|r| r.try_get(0))
        .collect()
}

/// Points every image reference equal to `from` (in tiles, posts and ads) at `to`.
pub async fn replace_image_reference(pool: &Pool, from: &str, to: &str) -> Result<u64> {
    let mut changed = 0;
    for table in ["tiles", "posts", "ads"] {
        changed += sqlx::query(&format!("UPDATE {table} SET image = ? WHERE image = ?"))
            .bind(to)
            .bind(from)
            .execute(pool)
            .await?
            .rows_affected();
    }
    Ok(changed)
}

/// Distinct image references starting with `prefix` (exact, not a LIKE pattern).
pub async fn image_references_with_prefix(pool: &Pool, prefix: &str) -> Result<Vec<String>> {
    let mut query = sqlx::query(
        "SELECT image FROM tiles WHERE LEFT(image, CHAR_LENGTH(?)) = ?
         UNION SELECT image FROM posts WHERE LEFT(image, CHAR_LENGTH(?)) = ?
         UNION SELECT image FROM ads WHERE LEFT(image, CHAR_LENGTH(?)) = ?",
    );
    for _ in 0..6 {
        query = query.bind(prefix);
    }
    query.fetch_all(pool).await?.into_iter().map(|r| r.try_get(0)).collect()
}

pub async fn tile_images(pool: &Pool) -> Result<Vec<Option<String>>> {
    images(pool, "tiles").await
}

// ---------------------------------------------------------------- posts

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostDto {
    pub id: i64,
    pub tile_id: String,
    pub admin_id: i64,
    pub content: String,
    pub image: Option<String>,
    pub tag: String,
    pub created_at: String,
    pub archived: bool,
    pub publish_at: Option<String>,
}

const POST_COLS: &str = "id, tile_id, admin_id, content, image, tag, created_at, archived, publish_at";

fn post_row(r: MySqlRow) -> Result<PostDto> {
    Ok(PostDto {
        id: r.try_get(0)?,
        tile_id: r.try_get(1)?,
        admin_id: r.try_get(2)?,
        content: r.try_get(3)?,
        image: r.try_get(4)?,
        tag: r.try_get(5)?,
        created_at: dto_ts(r.try_get(6)?),
        archived: r.try_get(7)?,
        publish_at: r.try_get::<Option<NaiveDateTime>, _>(8)?.map(dto_ts),
    })
}

fn post_query(where_clause: &str) -> String {
    format!("SELECT {POST_COLS} FROM posts WHERE {where_clause} ORDER BY created_at DESC, id DESC")
}

async fn post_list(query: sqlx::query::Query<'_, MySql, sqlx::mysql::MySqlArguments>, pool: &Pool) -> Result<Vec<PostDto>> {
    query.fetch_all(pool).await?.into_iter().map(post_row).collect()
}

pub async fn post_by_id(pool: &Pool, id: i64) -> Result<Option<PostDto>> {
    sqlx::query(&format!("SELECT {POST_COLS} FROM posts WHERE id = ?"))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .map(post_row)
        .transpose()
}

pub async fn posts_by_tile(pool: &Pool, tile_id: &str) -> Result<Vec<PostDto>> {
    post_list(sqlx::query(&post_query("tile_id = ? AND archived = FALSE")).bind(tile_id), pool).await
}

pub async fn published_posts_by_tile(pool: &Pool, tile_id: &str) -> Result<Vec<PostDto>> {
    let sql = post_query("tile_id = ? AND archived = FALSE AND publish_at <= ?");
    post_list(sqlx::query(&sql).bind(tile_id).bind(now()), pool).await
}

pub async fn posts_by_admin(pool: &Pool, admin_id: i64) -> Result<Vec<PostDto>> {
    post_list(sqlx::query(&post_query("admin_id = ? AND archived = FALSE")).bind(admin_id), pool).await
}

/// Nightly: posts whose publish date has arrived leave the feeds but are kept (with
/// their S3 image and text) instead of being deleted.
pub async fn archive_published_posts(pool: &Pool) -> Result<u64> {
    let ts = now();
    Ok(sqlx::query("UPDATE posts SET archived = TRUE, updated_at = ? WHERE archived = FALSE AND publish_at <= ?")
        .bind(ts)
        .bind(ts)
        .execute(pool)
        .await?
        .rows_affected())
}

pub async fn all_posts(pool: &Pool) -> Result<Vec<PostDto>> {
    post_list(sqlx::query(&post_query("TRUE")), pool).await
}

pub struct NewPost<'a> {
    pub tile_id: &'a str,
    pub admin_id: i64,
    pub content: &'a str,
    pub image: Option<&'a str>,
    pub tag: &'a str,
    pub publish_at: NaiveDateTime,
}

pub async fn insert_post(pool: &Pool, p: NewPost<'_>) -> Result<PostDto> {
    let ts = now();
    let result = sqlx::query(
        "INSERT INTO posts (tile_id, admin_id, content, image, tag, created_at, updated_at, archived, publish_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)",
    )
    .bind(p.tile_id)
    .bind(p.admin_id)
    .bind(p.content)
    .bind(p.image)
    .bind(p.tag)
    .bind(ts)
    .bind(ts)
    .bind(p.publish_at)
    .execute(pool)
    .await?;
    Ok(post_by_id(pool, result.last_insert_id() as i64).await?.expect("inserted post"))
}

pub struct PostUpdate<'a> {
    pub content: Option<&'a str>,
    pub image: Option<&'a str>,
    pub tag: Option<&'a str>,
    pub publish_at: Option<NaiveDateTime>,
}

pub async fn update_post(pool: &Pool, id: i64, u: PostUpdate<'_>) -> Result<Option<PostDto>> {
    sqlx::query(
        "UPDATE posts SET content = COALESCE(?, content), image = COALESCE(?, image), tag = COALESCE(?, tag),
         publish_at = COALESCE(?, publish_at) WHERE id = ?",
    )
    .bind(u.content)
    .bind(u.image)
    .bind(u.tag)
    .bind(u.publish_at)
    .bind(id)
    .execute(pool)
    .await?;
    post_by_id(pool, id).await
}

pub async fn delete_post(pool: &Pool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM posts WHERE id = ?").bind(id).execute(pool).await?;
    Ok(())
}

// ---------------------------------------------------------------- ads

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdDto {
    pub id: i64,
    pub tile_id: i64,
    pub admin_id: i64,
    pub content: String,
    pub image: Option<String>,
    pub tag: String,
    pub views: i32,
    pub clicks: i32,
    pub dismissals: i32,
    pub charges: i32,
    pub created_at: String,
    pub archived: bool,
}

const AD_COLS: &str = "id, tile_id, admin_id, content, image, tag, views, clicks, dismissals, charges, created_at, archived";

fn ad_row(r: MySqlRow) -> Result<AdDto> {
    Ok(AdDto {
        id: r.try_get(0)?,
        tile_id: r.try_get(1)?,
        admin_id: r.try_get(2)?,
        content: r.try_get(3)?,
        image: r.try_get(4)?,
        tag: r.try_get(5)?,
        views: r.try_get(6)?,
        clicks: r.try_get(7)?,
        dismissals: r.try_get(8)?,
        charges: r.try_get(9)?,
        created_at: dto_ts(r.try_get(10)?),
        archived: r.try_get(11)?,
    })
}

fn ad_query(where_clause: &str) -> String {
    format!("SELECT {AD_COLS} FROM ads WHERE {where_clause} ORDER BY created_at DESC, id DESC")
}

pub async fn ad_by_id<'e, E: sqlx::Executor<'e, Database = MySql>>(executor: E, id: i64) -> Result<Option<AdDto>> {
    sqlx::query(&format!("SELECT {AD_COLS} FROM ads WHERE id = ?"))
        .bind(id)
        .fetch_optional(executor)
        .await?
        .map(ad_row)
        .transpose()
}

pub async fn ads_by_tile(pool: &Pool, tile_id: i64, archived: bool) -> Result<Vec<AdDto>> {
    sqlx::query(&ad_query("tile_id = ? AND archived = ?"))
        .bind(tile_id)
        .bind(archived)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(ad_row)
        .collect()
}

pub async fn ads_by_admin(pool: &Pool, admin_id: i64) -> Result<Vec<AdDto>> {
    sqlx::query(&ad_query("admin_id = ? AND archived = FALSE"))
        .bind(admin_id)
        .fetch_all(pool)
        .await?
        .into_iter()
        .map(ad_row)
        .collect()
}

pub async fn ad_images(pool: &Pool) -> Result<Vec<Option<String>>> {
    images(pool, "ads").await
}

pub async fn insert_ad(pool: &Pool, tile_id: i64, admin_id: i64, content: &str, image: Option<&str>) -> Result<AdDto> {
    let ts = now();
    let result = sqlx::query(
        "INSERT INTO ads (tile_id, admin_id, content, image, tag, views, clicks, dismissals, charges, created_at, updated_at, archived)
         VALUES (?, ?, ?, ?, 'tag ad', 0, 0, 0, 0, ?, ?, FALSE)",
    )
    .bind(tile_id)
    .bind(admin_id)
    .bind(content)
    .bind(image)
    .bind(ts)
    .bind(ts)
    .execute(pool)
    .await?;
    Ok(ad_by_id(pool, result.last_insert_id() as i64).await?.expect("inserted ad"))
}

pub async fn update_ad(pool: &Pool, id: i64, content: Option<&str>, image: Option<&str>) -> Result<Option<AdDto>> {
    sqlx::query("UPDATE ads SET content = COALESCE(?, content), image = COALESCE(?, image) WHERE id = ?")
        .bind(content)
        .bind(image)
        .bind(id)
        .execute(pool)
        .await?;
    ad_by_id(pool, id).await
}

#[derive(Clone, Copy)]
pub enum AdCounter {
    Views,
    Clicks,
    Dismissals,
    Charges,
}

pub async fn increment_ad_counter<'e, E: sqlx::Executor<'e, Database = MySql>>(
    executor: E,
    id: i64,
    counter: AdCounter,
) -> Result<()> {
    let column = match counter {
        AdCounter::Views => "views",
        AdCounter::Clicks => "clicks",
        AdCounter::Dismissals => "dismissals",
        AdCounter::Charges => "charges",
    };
    sqlx::query(&format!("UPDATE ads SET {column} = {column} + 1 WHERE id = ?")).bind(id).execute(executor).await?;
    Ok(())
}

/// One view per IP per ad: the unique (ad_id, ip_address) key makes a repeat insert a
/// no-op, so the count only moves for a new address - even under concurrent requests.
pub async fn record_ad_view(pool: &Pool, ad_id: i64, ip: &str) -> Result<()> {
    let mut tx = pool.begin().await?;
    if ad_by_id(&mut *tx, ad_id).await?.is_none() {
        return Ok(());
    }
    let inserted = sqlx::query("INSERT IGNORE INTO ad_views (ad_id, ip_address, viewed_at) VALUES (?, ?, ?)")
        .bind(ad_id)
        .bind(ip)
        .bind(now())
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if inserted == 1 {
        increment_ad_counter(&mut *tx, ad_id, AdCounter::Views).await?;
    }
    tx.commit().await
}

pub async fn archive_all_active_ads(pool: &Pool) -> Result<u64> {
    Ok(sqlx::query("UPDATE ads SET archived = TRUE WHERE archived = FALSE").execute(pool).await?.rows_affected())
}

pub async fn delete_ad(pool: &Pool, id: i64) -> Result<()> {
    sqlx::query("DELETE FROM ads WHERE id = ?").bind(id).execute(pool).await?;
    Ok(())
}
