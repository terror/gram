use super::*;

#[tauri::command]
pub(crate) fn get_config(handle: AppHandle) -> Result<Config> {
  Config::load(&handle).map_err(Into::into)
}

#[tauri::command]
pub(crate) fn save_config(handle: AppHandle, config: Config) -> Result {
  config.save(&handle).map_err(Into::into)
}

#[tauri::command]
pub(crate) fn set_openai_api_key(handle: AppHandle, api_key: String) -> Result {
  let mut config = Config::load(&handle)?;
  config.openai_api_key = Some(api_key);
  config.save(&handle)?;
  Ok(())
}
