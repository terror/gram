use super::*;

#[tauri::command]
pub(crate) fn get_config(handle: AppHandle) -> Result<Config> {
  Config::load(&handle).map_err(Into::into)
}

#[tauri::command]
pub(crate) fn save_config(handle: AppHandle, config: Config) -> Result {
  config.save(&handle).map_err(Into::into)
}

#[derive(Debug, Serialize, Deserialize)]
#[typeshare]
pub(crate) struct OllamaRequest {
  model: String,
  prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[typeshare]
pub(crate) struct OllamaResponse {
  response: String,
}

async fn try_pull_ollama_model(model: &str) -> Result {
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

    if !(pull_response.get("status").and_then(|s| s.as_str())
      == Some("success"))
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
pub(crate) async fn send_ollama_message(
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
pub(crate) fn set_openai_api_key(handle: AppHandle, api_key: String) -> Result {
  let mut config = Config::load(&handle)?;
  config.openai_api_key = Some(api_key);
  config.save(&handle)?;
  Ok(())
}
