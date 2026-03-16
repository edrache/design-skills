#!/usr/bin/env bash
set -euo pipefail

# Zmienne środowiskowe z domyślnymi wartościami
REMOTE_USER="${REMOTE_USER:-deploy}"
REMOTE_HOST="${REMOTE_HOST:-aneta131.mikrus.xyz}"
REMOTE_PORT="${REMOTE_PORT:-10131}"
BASE_REMOTE_DIR="${BASE_REMOTE_DIR:-/cytrus/katalog1}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519_mikrus_deploy}"

MODE="dry-run"
DELETE_REMOTE="0"
APP_NAME=""

show_help() {
  echo "Użycie: $(basename "$0") [opcje] <nazwa_aplikacji>"
  echo ""
  echo "Wysyła bieżący katalog na serwer (rsync over SSH)."
  echo "Aplikacja trafi do: $BASE_REMOTE_DIR/<nazwa_aplikacji>"
  echo ""
  echo "Opcje:"
  echo "  --go        Uruchamia faktyczny deploy (domyślnie jest tryb testowy --dry-run)"
  echo "  --delete    Usuwa z serwera pliki, których nie ma już w bieżącym katalogu"
  echo "  -h, --help  Pokazuje ten komunikat"
}

# Parsowanie argumentów
while [[ $# -gt 0 ]]; do
  case "$1" in
    --go)
      MODE="go"
      shift
      ;;
    --delete)
      DELETE_REMOTE="1"
      shift
      ;;
    -h|--help)
      show_help
      exit 0
      ;;
    -*)
      echo "Nieznana opcja: $1"
      show_help
      exit 1
      ;;
    *)
      if [[ -z "$APP_NAME" ]]; then
        APP_NAME="$1"
      else
        echo "Zbyt dużo argumentów: $1"
        show_help
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$APP_NAME" ]]; then
  echo "Błąd: Podaj nazwę aplikacji (katalogu docelowego na serwerze)."
  show_help
  exit 1
fi

REMOTE_DIR="$BASE_REMOTE_DIR/$APP_NAME"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Brak wymaganego polecenia: $1"
    exit 1
  fi
}

require_cmd ssh
require_cmd rsync

if [[ -f "$SSH_KEY" ]]; then
  SSH_OPTS=(
    -p "$REMOTE_PORT"
    -i "$SSH_KEY"
    -o IdentitiesOnly=yes
    -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
  )
else
  echo "Uwaga: Klucz SSH nie istnieje: $SSH_KEY. Próba połączenia domyślnie..."
  SSH_OPTS=(
    -p "$REMOTE_PORT"
    -o StrictHostKeyChecking=yes
    -o UserKnownHostsFile="$HOME/.ssh/known_hosts"
  )
fi

echo "► Sprawdzanie i tworzenie katalogu zdalnego: $REMOTE_DIR"
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$REMOTE_DIR'"

RSYNC_ARGS=(
  -az
  --human-readable
  --itemize-changes
  --exclude ".git/"
  --exclude ".github/"
  --exclude "node_modules/"
  --exclude "output/"
  --exclude ".env"
  --exclude ".env.*"
  --exclude "*.pem"
  --exclude "*.key"
  --exclude "id_*"
  --exclude ".DS_Store"
  --exclude "universal-deploy/"
)

if [[ "$MODE" == "dry-run" ]]; then
  RSYNC_ARGS+=(--dry-run)
  echo "► Tryb DRY-RUN: Żadne modyfikacje na serwerze nie zostaną wykonane."
else
  echo "► Tryb LIVE: Wdrażanie aplikacji na serwer."
fi

if [[ "$DELETE_REMOTE" == "1" ]]; then
  RSYNC_ARGS+=(--delete)
  echo "► Tryb usuwania włączony (--delete)."
fi

APP_DIR_SLASH="./"

if [[ -f "$SSH_KEY" ]]; then
  RSYNC_SSH_CMD="ssh -p $REMOTE_PORT -i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$HOME/.ssh/known_hosts"
else
  RSYNC_SSH_CMD="ssh -p $REMOTE_PORT -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$HOME/.ssh/known_hosts"
fi

rsync "${RSYNC_ARGS[@]}" \
  -e "$RSYNC_SSH_CMD" \
  "$APP_DIR_SLASH" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"

echo ""
if [[ "$MODE" == "dry-run" ]]; then
  echo "✔ Test zakończony pomyślnie. Aby wdrożyć naprawdę, wykonaj z flagą: --go"
else
  echo "✔ Wdrożenie zakończone pomyślnie! Pliki poszły do $REMOTE_DIR."
fi
