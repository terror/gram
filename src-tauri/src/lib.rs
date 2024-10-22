use {
  crate::{
    config::Config,
    error::{Error, Result},
    ipc::*,
  },
  serde::{Deserialize, Serialize},
  std::fs,
  tauri::{AppHandle, Manager},
  thiserror::Error,
  typeshare::typeshare,
};

mod chat;
mod config;
mod error;

#[macro_use]
mod ipc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      set_openai_api_key,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
