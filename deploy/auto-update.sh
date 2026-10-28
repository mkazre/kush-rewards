#!/bin/bash
# Cron (every 5 minutes): if GitHub has a newer build on the `deploy` branch, pull it and install.
# The repository is public, so no credentials are needed.
set -uo pipefail

REPO="${KUSH_REPO:-$HOME/repositories/kush-rewards}"
cd "$REPO" || exit 1

git fetch --quiet origin deploy || exit 1
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/deploy)" ]; then
  git reset --quiet --hard origin/deploy
  bash "$REPO/deploy/install.sh"
fi
