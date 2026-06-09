use jieba_rs::Jieba;
use napi::{Error, Result, Status};
use napi_derive::napi;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Deserialize)]
struct SearchDoc {
  id: u32,
  #[serde(rename = "type")]
  doc_type: String,
  title: String,
  #[serde(default)]
  content: String,
}

#[derive(Debug, Serialize)]
struct SearchHit {
  id: u32,
  #[serde(rename = "type")]
  doc_type: String,
  title: String,
  score: f64,
}

fn to_napi_error(err: impl std::fmt::Display) -> Error {
  Error::new(Status::InvalidArg, err.to_string())
}

fn tokens(jieba: &Jieba, text: &str) -> Vec<String> {
  let mut seen = HashSet::new();
  let mut out = Vec::new();

  for token in jieba.cut(text, false) {
    let token = token.trim().to_lowercase();
    if token.chars().count() < 2 {
      continue;
    }
    if seen.insert(token.clone()) {
      out.push(token);
    }
  }

  out
}

#[napi]
pub fn search(docs_json: String, keyword: String) -> Result<String> {
  let keyword = keyword.trim().to_lowercase();
  if keyword.is_empty() {
    return Ok("[]".to_string());
  }

  let docs: Vec<SearchDoc> = serde_json::from_str(&docs_json).map_err(to_napi_error)?;
  let jieba = Jieba::new();
  let mut query_tokens = tokens(&jieba, &keyword);
  if query_tokens.is_empty() {
    query_tokens.push(keyword.clone());
  }

  let mut hits = Vec::new();

  for doc in docs {
    let title = doc.title.to_lowercase();
    let content = doc.content.to_lowercase();
    let full_text = format!("{} {}", title, content);
    let mut score = 0.0;

    if title.contains(&keyword) {
      score += 10.0;
    }
    if content.contains(&keyword) {
      score += 5.0;
    }

    for token in &query_tokens {
      if title.contains(token) {
        score += 3.0;
      }
      if full_text.contains(token) {
        score += 1.0;
      }
    }

    if score > 0.0 {
      hits.push(SearchHit {
        id: doc.id,
        doc_type: doc.doc_type,
        title: doc.title,
        score,
      });
    }
  }

  hits.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
  serde_json::to_string(&hits).map_err(to_napi_error)
}
