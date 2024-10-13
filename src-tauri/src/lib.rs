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
  #[error("Failed to read config file: {0}")]
  Io(#[from] std::io::Error),
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
      set_openai_api_key,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
