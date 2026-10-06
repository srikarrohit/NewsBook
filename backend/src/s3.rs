//! Post images and text backups. The bucket grants public read via its bucket policy
//! (not object ACLs - new buckets have ACLs disabled), so uploads set no ACL.

use std::collections::HashSet;

use s3::Bucket;
use s3::creds::Credentials;
use s3::region::Region;

pub struct Storage {
    bucket: Result<Box<Bucket>, String>,
    url_prefix: String,
}

impl Storage {
    /// Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY, ~/.aws/credentials
    /// or the instance role - never from config files in the repo. A missing credential
    /// only fails the S3 calls themselves, like the Java SDK's lazy provider chain.
    pub fn new(bucket_name: &str, region: &str) -> Self {
        let bucket = (|| {
            let region: Region = region.parse().map_err(|e| format!("invalid AWS region {region}: {e}"))?;
            let credentials = Credentials::default().map_err(|e| format!("no AWS credentials: {e}"))?;
            Bucket::new(bucket_name, region, credentials).map_err(|e| e.to_string())
        })();
        if let Err(e) = &bucket {
            tracing::warn!("S3 unavailable: {e}");
        }
        Storage { bucket, url_prefix: format!("https://{bucket_name}.s3.{region}.amazonaws.com/") }
    }

    fn bucket(&self) -> Result<&Bucket, String> {
        self.bucket.as_deref().map_err(Clone::clone)
    }

    pub fn public_url(&self, key: &str) -> String {
        format!("{}{key}", self.url_prefix)
    }

    /// The object key back out of a URL produced by public_url(), or None if it isn't ours.
    pub fn key_from_url(&self, url: Option<&str>) -> Option<String> {
        url?.strip_prefix(&self.url_prefix).map(str::to_owned)
    }

    pub async fn upload_bytes(&self, key: &str, data: &[u8], content_type: Option<&str>) -> Result<String, String> {
        // S3's own default when the client sends no Content-Type.
        let content_type = content_type.unwrap_or("binary/octet-stream");
        self.bucket()?.put_object_with_content_type(key, data, content_type).await.map_err(|e| e.to_string())?;
        Ok(self.public_url(key))
    }

    pub async fn upload_text(&self, key: &str, text: &str) -> Result<String, String> {
        self.upload_bytes(key, text.as_bytes(), Some("text/plain; charset=utf-8")).await
    }

    /// Best-effort: a missing/already-deleted object shouldn't block the caller.
    pub async fn delete_object(&self, key: &str) {
        let result = match self.bucket() {
            Ok(bucket) => bucket.delete_object(key).await.map(|_| ()).map_err(|e| e.to_string()),
            Err(e) => Err(e),
        };
        if let Err(e) = result {
            tracing::warn!("Failed to delete S3 object {key}: {e}");
        }
    }

    pub async fn list_keys(&self, prefix: &str) -> Result<Vec<String>, String> {
        let pages = self.bucket()?.list(prefix.to_owned(), None).await.map_err(|e| e.to_string())?;
        Ok(pages.into_iter().flat_map(|page| page.contents).map(|object| object.key).collect())
    }

    /// Deletes every object under a prefix whose key isn't in keep - cleans up uploads
    /// that never ended up attached to a saved post/ad/tile.
    pub async fn sweep_unreferenced(&self, prefix: &str, keep: &HashSet<String>) -> Result<(), String> {
        for key in self.list_keys(prefix).await? {
            if !keep.contains(&key) {
                tracing::info!("Sweeping orphaned S3 object: {key}");
                self.delete_object(&key).await;
            }
        }
        Ok(())
    }
}
