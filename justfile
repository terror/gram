set dotenv-load

export EDITOR := 'nvim'

dev:
  bun run tauri dev

forbid:
  ./bin/forbid

fmt:
  prettier --write .
  cd src-tauri && cargo fmt
