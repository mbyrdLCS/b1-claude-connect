# Connect B1 to Claude

Ask Claude about your church's **B1 / ChurchApps** data in plain English — look up people, check attendance, update groups, edit your website, build forms, and more.

**Setup takes about 10 minutes. No technical skills needed.**

---

## Before you start — you'll need 3 things

| ✅ | What | Where to get it |
|---|---|---|
| 1 | **The Claude app** on your Mac or Windows computer (not just the website) | Download free: **[claude.com/download](https://claude.com/download)** |
| 2 | **A Claude account**, signed in to the app. We recommend **Claude Pro** — free accounts run out of messages quickly. | Sign up / upgrade: **[claude.ai](https://claude.ai)** |
| 3 | **Your B1 login** with permission to create an API key | **[admin.b1.church](https://admin.b1.church)** |

> 📱 **Using Claude on a phone or in a web browser?** That doesn't work yet — it's coming. For now, use the Claude app on a computer.
>
> 💬 **Using ChatGPT?** Not yet either — also coming.

---

## Step 1 — Install the Claude app

1. Go to **[claude.com/download](https://claude.com/download)** and download the app for your computer.
2. Install it:
   - **Mac:** open the downloaded file and drag **Claude** into your **Applications** folder.
   - **Windows:** run the downloaded installer.
3. Open Claude and **sign in**.

Already have it? Skip to Step 2.

---

## Step 2 — Create your B1 key

The key is what lets Claude talk to *your* church's B1. Think of it like a password just for Claude.

1. Log into **[B1Admin](https://admin.b1.church)** as **yourself**.
2. Click **Settings** in the top menu, then **Developer** — or go straight to **[admin.b1.church/settings/developer](https://admin.b1.church/settings/developer)**.
   *(Don't see Settings? Your B1 login needs permission to manage church settings — ask your church's B1 administrator.)*
3. On the **API Keys** tab, click **New API Key**.
4. **Name:** type `Claude`. Leave **Expires** empty (or pick a date if you want it to stop working later).
5. **Scopes:** check only what you want Claude to be able to do. Each area has a **read** box (look only) and a **write** box (make changes) — for example check **people:read** to let Claude look up people, or **content:write** to let it change website pages. Not sure? Start with just the **read** boxes; you can make a new key with more later.
6. Click **Save**. A box shows your new key — click **Copy**. ⚠️ **It's only shown once**, so paste it somewhere safe or go straight to Step 3.

🔒 The key only works for your church and only for what you allow. You can delete it in B1Admin any time to turn Claude's access off.

---

## Step 3 — Add B1 to Claude (one click)

1. **[Click here to download the B1 extension](https://github.com/mbyrdLCS/b1-claude-connect/releases/latest/download/b1-churchapps.mcpb)** (`b1-churchapps.mcpb`).
2. **Double-click** the downloaded file. Claude opens and shows **B1 (ChurchApps)**.
3. Click **Install**.
4. When it asks for your **B1 API key**, paste the key from Step 2 and save.
5. **Quit Claude completely** (Mac: **Cmd+Q** · Windows: right-click the Claude icon in the taskbar → **Quit**) and open it again.

> Didn't open when you double-clicked? In Claude go to **Settings → Extensions → Advanced settings → Install Extension…** and choose the downloaded file.

---

## Step 4 — Try it!

Start a **new chat** in the Claude app and ask:

- *"List the groups in our church."*
- *"Who joined the Prayer Partners group this month?"*
- *"Add a new page to our website called Events."*

The first time, Claude asks permission to use B1 — click **Allow**. Claude always asks before using B1, and it can only reach your own church.

---

## Questions

**Is my church's data safe?**
Your key stays on your computer (the Claude app stores it securely). It's never put in this download or shared. Claude can only do what your key allows, and only for your church.

**How do I turn it off?**
Delete the key in B1Admin, or in Claude go to **Settings → Extensions** and turn **B1 (ChurchApps)** off.

**Can several people at our church use it?**
Yes — each person should create **their own** key so each can be turned off separately.

**Something isn't working?**
Ask for help at **[ChurchApps support](https://github.com/ChurchApps/ChurchAppsSupport/issues)**.

---

<details>
<summary><b>For tech helpers</b> — Claude Code, installer scripts, manual setup, building the extension</summary>

### What this is
B1's MCP server is run by ChurchApps at `https://api.churchapps.org/mcp` and uses your B1 API key as a `Bearer` token. The extension bundles [`mcp-remote`](https://www.npmjs.com/package/mcp-remote) so the Claude desktop app can reach it with no separate Node.js install.

### Claude Code
```bash
claude mcp add --scope user --transport http b1 https://api.churchapps.org/mcp --header "Authorization: Bearer YOUR_KEY"
```

### Installer scripts (alternative to the extension; need [Node.js](https://nodejs.org))
- **Mac:** `bash install-mac.sh`
- **Windows:** `powershell -ExecutionPolicy Bypass -File .\install-windows.ps1`

They ask for the key (hidden), check it with B1 and show which church it belongs to, back up your Claude settings, and add B1. Then quit and reopen Claude.

### Manual setup
Add to `claude_desktop_config.json` (Mac: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`), replacing `YOUR_KEY`:

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
On a Mac, if Claude can't find `npx`, use its full path (`which npx`).

### Build the extension
`sh scripts/build-mcpb.sh` → `dist/b1-churchapps.mcpb`

### Web, phone and ChatGPT
claude.ai (web/mobile) and ChatGPT connectors sign in with OAuth, which the B1 server doesn't support yet — see [ChurchApps/ChurchAppsSupport#1318](https://github.com/ChurchApps/ChurchAppsSupport/issues/1318).

### Tips
- Claude reads B1's endpoint list itself (`list_endpoints`, `describe_endpoint`), so you don't need to know the API.
- Website pages: B1 strips inline styles and scripts, so ask Claude to use CSS classes in a `<style>` block.

</details>

## License
MIT
