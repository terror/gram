set dotenv-load

export EDITOR := 'nvim'

dev:
  bun run tauri dev

forbid:
  ./bin/forbid
