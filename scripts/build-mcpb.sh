#!/bin/sh
# Build the one-click Claude desktop extension: dist/b1-churchapps.mcpb
set -e
cd "$(dirname "$0")/.."
STAGE=$(mktemp -d)
cp -R mcpb/. "$STAGE/"
(cd "$STAGE/server" && npm install --omit=dev --silent)
npx --yes @anthropic-ai/mcpb validate "$STAGE/manifest.json"
mkdir -p dist
npx --yes @anthropic-ai/mcpb pack "$STAGE" dist/b1-churchapps.mcpb
rm -rf "$STAGE"
