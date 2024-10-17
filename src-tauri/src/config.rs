use super::*;

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct Config {
  pub(crate) openai_api_key: Option<String>,
}

impl Default for Config {
  fn default() -> Self {
    Config {
      openai_api_key: None,
    }
  }
}

impl Config {
  pub(crate) fn load(handle: &AppHandle) -> Result<Self> {
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

  pub(crate) fn save(&self, handle: &AppHandle) -> Result {
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
