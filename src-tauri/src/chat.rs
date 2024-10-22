use super::*;

#[derive(Debug, Serialize, Deserialize)]
#[typeshare]
enum Provider {
  OpenAI,
  Ollama,
}

#[derive(Debug, Serialize, Deserialize)]
#[typeshare]
enum Role {
  User,
  Assistant,
}

#[derive(Debug, Serialize, Deserialize)]
#[typeshare]
struct Message {
  role: Role,
  content: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[typeshare]
struct Chat {
  id: String,
  name: String,
  messages: Vec<Message>,
  provider: Provider,
  model: String,
}
