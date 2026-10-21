# Connect B1 to Claude

Use your church's [B1 / ChurchApps](https://churchapps.org) data with Claude: ask in plain English to look up people, update groups, edit website pages, check attendance, build forms, and more.

This uses the B1 MCP server that ChurchApps runs at `https://api.churchapps.org/mcp`, with your own B1 API key.

| Where you use Claude | Works? | How |
|---|---|---|
| **Claude desktop app** (Mac / Windows) | ✅ | Run the installer below |
| **Claude Code** (terminal) | ✅ | One command, below |
| **claude.ai in a browser / phone app** | ❌ not yet | B1's server needs to add sign-in (OAuth) first |

## 1. Get a B1 API key
Log into **B1Admin as yourself** and create an API key. Give it only the areas you want Claude to use (for example *content* for website pages, *people* and *groups* for membership).

The key works only for your church, and only with the permissions you choose. Treat it like a password; you can delete it in B1Admin any time.

## 2a. Claude desktop app

You need [Node.js](https://nodejs.org) (LTS) installed; the Claude app uses a small bridge (`mcp-remote`) to reach B1.

**Mac:** download this repo, then in Terminal:
```bash
bash install-mac.sh
```

**Windows:** download this repo, then in PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File .\install-windows.ps1
```

The installer asks for your key (it isn't shown on screen), checks it with B1 and shows which church it belongs to, backs up your Claude settings, and adds B1. Then **quit Claude completely and reopen it**.

<details><summary>Manual setup instead</summary>

Add this to `claude_desktop_config.json` (Mac: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`), replacing `YOUR_KEY`:

```json
{
  "mcpServers": {
    "b1": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.churchapps.org/mcp", "--header", "Authorization:${B1_AUTH}"],
      "env": { "B1_AUTH": "Bearer YOUR_KEY" }
    }
  }
}
```
On a Mac, if Claude can't find `npx`, use its full path (run `which npx`).
</details>

## 2b. Claude Code
```bash
claude mcp add --scope user --transport http b1 https://api.churchapps.org/mcp --header "Authorization: Bearer YOUR_KEY"
```

## 3. Try it
Open a new chat and ask things like:
- "List the groups in our church."
- "Who joined the Prayer Partners group this month?"
- "Add a new page to our website called Events."

The Claude app asks your permission before it uses B1 tools, and changes can only reach the church your key belongs to.

## Tips
- **One key per person**, so each can be turned off on its own.
- Claude reads B1's endpoint list itself (`list_endpoints`, `describe_endpoint`), so you don't need to know the API.
- Website pages: B1 strips inline styles and scripts, so ask Claude to use CSS classes in a `<style>` block.

## License
MIT
