set dotenv-load

export EDITOR := 'nvim'

dev:
  bun run tauri dev

dev-deps:
  cargo install typeshare-cli

forbid:
  ./bin/forbid

fmt:
  prettier --write .
  cd src-tauri && cargo fmt

gen-types:
  typeshare -l typescript -o src/lib/types.ts .
