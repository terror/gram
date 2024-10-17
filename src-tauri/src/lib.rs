use {
  crate::{
    config::Config,
    error::{Error, Result},
    ipc::*,
  },
  futures::StreamExt,
  reqwest::Client,
  serde::{Deserialize, Serialize},
  std::fs,
  tauri::{AppHandle, Manager},
  thiserror::Error,
  typeshare::typeshare,
};

mod config;
mod error;

#[macro_use]
mod ipc;

#[derive(Debug)]
#[typeshare]
enum Provider {
  OpenAI,
  Ollama,
}

#[derive(Debug)]
#[typeshare]
enum MessageKind {
  User,
  Assistant,
}

#[derive(Debug)]
#[typeshare]
struct Message {
  kind: MessageKind,
  content: String,
}

#[derive(Debug)]
#[typeshare]
struct Chat {
  id: String,
  name: String,
  messages: Vec<Message>,
  provider: Provider,
  model: String,
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
