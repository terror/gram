use futures::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;
use thiserror::Error;

type Result<T = (), E = Error> = std::result::Result<T, E>;

#[derive(Error, Debug)]
enum Error {
  #[error("Failed to get app directory")]
  AppDir,
  #[error("Failed to download model: {0}")]
  DownloadModel(String),
  #[error("Failed to read config file: {0}")]
  Io(#[from] std::io::Error),
  #[error("Failed to send request: {0}")]
  Request(#[from] reqwest::Error),
  #[error("Failed to parse config file: {0}")]
  Serde(#[from] serde_json::Error),
}

impl From<Error> for tauri::ipc::InvokeError {
  fn from(err: Error) -> Self {
    tauri::ipc::InvokeError::from(err.to_string())
  }
}

#[derive(Debug, Serialize, Deserialize)]
struct Config {
  openai_api_key: Option<String>,
}

impl Default for Config {
  fn default() -> Self {
    Config {
      openai_api_key: None,
    }
  }
}

impl Config {
  fn load(handle: &AppHandle) -> Result<Self> {
    let path = handle
      .path()
      .config_dir()
      .map_err(|_| Error::AppDir)
      .map(|app_dir| app_dir.join("config.json"))?;

    if path.exists() {
      Ok(serde_json::from_str(&fs::read_to_string(path)?)?)
    } else {
      let default_config = Config::default();
      default_config.save(&handle)?;
      Ok(default_config)
    }
  }

  fn save(&self, handle: &AppHandle) -> Result {
    let path = handle
      .path()
      .config_dir()
      .map_err(|_| Error::AppDir)
      .map(|app_dir| app_dir.join("config.json"))?;

    fs::create_dir_all(path.parent().unwrap())?;
    fs::write(&path, serde_json::to_string_pretty(self)?)?;

    Ok(())
  }
}

#[tauri::command]
fn get_config(handle: AppHandle) -> Result<Config> {
  Config::load(&handle).map_err(Into::into)
}

#[tauri::command]
fn save_config(handle: AppHandle, config: Config) -> Result {
  config.save(&handle).map_err(Into::into)
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaRequest {
  model: String,
  prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaResponse {
  response: String,
}

async fn pull_model_if_needed(model: &str) -> Result {
  let client = Client::new();

  let response = client
    .get("http://localhost:11434/api/tags")
    .send()
    .await?
    .json::<serde_json::Value>()
    .await?;

  let models = response.get("models");

  let model_exists = models
    .into_iter()
    .any(|m| m.get("name").and_then(|name| name.as_str()) == Some(model));

  if !model_exists {
    let pull_response = client
      .post("http://localhost:11434/api/pull")
      .json(&serde_json::json!({ "name": model }))
      .send()
      .await?
      .json::<serde_json::Value>()
      .await?;

    if !(pull_response.get("status").and_then(|s| s.as_str()) == Some("success"))
    {
      return Err(Error::DownloadModel(format!(
        "Failed to pull model: {}",
        model
      )));
    }
  }

  Ok(())
}

#[tauri::command]
async fn send_ollama_message(
  model: String,
  message: String,
) -> Result<Vec<OllamaResponse>> {
  // pull_model_if_needed(&model).await?;

  let client = Client::new();

  let request = OllamaRequest {
    model,
    prompt: message,
  };

  let response_stream = client
    .post("http://localhost:11434/api/generate")
    .json(&request)
    .send()
    .await?
    .bytes_stream();

  let mut responses = vec![];
  let mut buffer = String::new();

  tokio::pin!(response_stream);

  while let Some(chunk) = response_stream.next().await {
    match chunk {
      Ok(bytes) => {
        let text = String::from_utf8_lossy(&bytes);
        buffer.push_str(&text);
        if let Ok(response) = serde_json::from_str::<OllamaResponse>(&buffer) {
          responses.push(response);
          buffer.clear();
        }
      }
      Err(err) => {
        eprintln!("Error reading chunk: {}", err);
        return Err(Error::Request(err.into()));
      }
    }
  }

  Ok(responses)
}

#[tauri::command]
fn set_openai_api_key(handle: AppHandle, api_key: String) -> Result {
  let mut config = Config::load(&handle)?;
  config.openai_api_key = Some(api_key);
  config.save(&handle)?;
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      send_ollama_message,
      set_openai_api_key,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
