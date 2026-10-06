use serde_json::{Value, json};

pub struct Gemini {
    client: reqwest::Client,
    api_key: String,
    model: String,
}

impl Gemini {
    pub fn new(api_key: &str, model: &str) -> Self {
        Gemini { client: reqwest::Client::new(), api_key: api_key.to_owned(), model: model.to_owned() }
    }

    pub async fn summarize(&self, text: &str) -> Result<String, String> {
        if self.api_key.trim().is_empty() {
            return Err("GEMINI_API_KEY is not configured".into());
        }
        let body = json!({
            "contents": [{ "parts": [{ "text": format!("Summarize the following text in 2-3 concise sentences:\n\n{text}") }] }]
        });
        let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent", self.model);
        let response = self
            .client
            .post(url)
            .query(&[("key", &self.api_key)])
            .json(&body)
            .send()
            .await
            .map_err(|e| e.without_url().to_string())?;
        let status = response.status();
        if !status.is_success() {
            let detail = response.text().await.unwrap_or_default();
            return Err(format!("{status}: \"{detail}\""));
        }
        let response: Value = response.json().await.map_err(|e| e.without_url().to_string())?;
        response["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(|s| s.trim().to_owned())
            .ok_or_else(|| "Gemini returned no candidates".into())
    }
}
