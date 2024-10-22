use super::*;

pub(crate) type Result<T = (), E = Error> = std::result::Result<T, E>;

#[derive(Error, Debug)]
pub(crate) enum Error {
  #[error("Failed to get app directory")]
  AppDir,
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
