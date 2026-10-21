#!/bin/bash
# Connect B1 (ChurchApps) to the Claude desktop app on a Mac.
# Usage:  bash install-mac.sh
# Needs Node.js (https://nodejs.org) for the small "mcp-remote" bridge the Claude app uses.
set -euo pipefail

B1_MCP_URL="https://api.churchapps.org/mcp"
CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

# 1. Find Node / npx
NPX="$(command -v npx || true)"
for p in /opt/homebrew/bin/npx /usr/local/bin/npx "$HOME/.local/node/bin/npx"; do
  [ -z "$NPX" ] && [ -x "$p" ] && NPX="$p"
done
if [ -z "$NPX" ]; then
  echo "Node.js is required. Install the LTS version from https://nodejs.org, then run this again."
  exit 1
fi
NODE_DIR="$(dirname "$NPX")"

# 2. Ask for the key (hidden)
echo "Create an API key in B1Admin (logged in as yourself), then paste it here."
read -r -s -p "B1 API key: " KEY; echo
KEY="$(printf %s "$KEY" | tr -d '[:space:]')"
[ -n "$KEY" ] || { echo "No key entered."; exit 1; }

# 3. Check the key and show which church it belongs to
RESP="$(curl -s -H "Authorization: Bearer $KEY" -H "Accept: application/json" https://api.churchapps.org/membership/churches || true)"
CHURCH="$(printf %s "$RESP" | "$NODE_DIR/node" -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{let j=JSON.parse(s);j=Array.isArray(j)?j:[j];
const c=j.map(x=>x&&x.church?x.church:x).find(x=>x&&x.name);console.log(c?`${c.name}${c.city?", "+c.city:""}${c.state?" "+c.state:""}`:"")}catch(e){console.log("")}})')"
if [ -z "$CHURCH" ]; then
  echo "That key didn't work with B1. Check it and try again."; exit 1
fi
read -r -p "This key belongs to: $CHURCH. Connect it to Claude? [y/N] " OK
[[ "$OK" =~ ^[Yy] ]] || { echo "Cancelled."; exit 0; }

# 4. Add B1 to the Claude app settings (keeps everything else; makes a backup)
mkdir -p "$(dirname "$CONFIG")"
[ -f "$CONFIG" ] && cp "$CONFIG" "$CONFIG.bak-$(date +%Y%m%d%H%M%S)"
B1_KEY="$KEY" B1_NPX="$NPX" B1_NODE_DIR="$NODE_DIR" B1_URL="$B1_MCP_URL" CONFIG="$CONFIG" "$NODE_DIR/node" -e '
const fs=require("fs"),f=process.env.CONFIG;
let d={};try{d=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}
d.mcpServers=d.mcpServers||{};
d.mcpServers.b1={command:process.env.B1_NPX,
  args:["-y","mcp-remote",process.env.B1_URL,"--header","Authorization:${B1_AUTH}"],
  env:{B1_AUTH:"Bearer "+process.env.B1_KEY,PATH:process.env.B1_NODE_DIR+":/usr/bin:/bin"}};
fs.writeFileSync(f,JSON.stringify(d,null,2));fs.chmodSync(f,0o600);'
unset KEY

echo "Done. Quit the Claude app (Cmd+Q) and open it again; B1 will show up in its connectors."
if command -v claude >/dev/null 2>&1; then
  echo "Claude Code is installed too. To add B1 there, run:"
  echo "  claude mcp add --scope user --transport http b1 $B1_MCP_URL --header \"Authorization: Bearer YOUR_KEY\""
fi
