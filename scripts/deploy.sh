#!/usr/bin/env bash
# Deploy krpex.in safely: pull, install, build into .next-build, swap it in only if the build
# succeeded, restart, health-check, and roll back to the previous build if the check fails.
# Usage: scripts/deploy.sh [--no-pull]
set -euo pipefail
cd "$(dirname "$0")/.."

APP=nxtai
HEALTH=http://127.0.0.1:3000/api/health
log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

if [[ "${1:-}" != "--no-pull" ]]; then
  log "Pulling latest code"
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo "Uncommitted changes in tracked files; commit or stash them first (or use --no-pull)." >&2
    exit 1
  fi
  git pull --ff-only
fi

# What this build is, for /admin/system (read at start by lib/system/heartbeat.ts). Taken before building,
# because the build itself touches tsconfig.json.
commit=$(git rev-parse --short HEAD)
subject=$(git log -1 --pretty=%s)
dirty=false
[[ -n "$(git status --porcelain --untracked-files=no)" ]] && dirty=true

log "Installing dependencies"
pnpm install --frozen-lockfile

log "Building into .next-build (the live site keeps running)"
rm -rf .next-build
NEXT_DIST_DIR=.next-build pnpm build

node -e 'require("fs").writeFileSync(".next-build/krpex-build.json", JSON.stringify({ commit: process.argv[1], subject: process.argv[2], dirty: process.argv[3] === "true", built_at: new Date().toISOString() }))' "$commit" "$subject" "$dirty"

log "Swapping in the new build"
rm -rf .next-prev
[[ -d .next ]] && mv .next .next-prev
mv .next-build .next

log "Restarting $APP"
# Plain restart keeps the clean environment pm2 was started with. Never pass --update-env:
# it would copy this shell's variables into the app.
pm2 restart "$APP" >/dev/null

ok=0
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null --max-time 5 "$HEALTH" 2>/dev/null; then ok=1; break; fi
  sleep 1
done

if [[ $ok -ne 1 ]]; then
  log "Health check FAILED, rolling back"
  if [[ -d .next-prev ]]; then
    rm -rf .next-failed && mv .next .next-failed && mv .next-prev .next
    pm2 restart "$APP" >/dev/null
    echo "Rolled back. The failed build is in .next-failed for inspection."
  fi
  exit 1
fi

leak=$(tr '\0' '\n' < "/proc/$(pm2 pid "$APP")/environ" | grep -ci claude || true)
if [[ "$leak" != "0" ]]; then
  echo "WARNING: the app process has $leak CLAUDE* variables; recreate it with a clean environment (see memory notes)." >&2
fi

log "Deployed $(git rev-parse --short HEAD): $(curl -fsS "$HEALTH")"
