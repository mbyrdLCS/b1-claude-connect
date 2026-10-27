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

> 📱 **Using Claude in a web browser or on your phone, or using ChatGPT?** Skip the key: jump to **[Sign in with B1 (web, phone, ChatGPT)](#sign-in-with-b1-web-phone-chatgpt)**. You just paste one web address and log in with your B1 account.

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
4. When it asks for your **B1 API key**, paste the key from Step 2.
5. **Using FreePlay?** Also enter your **B1 email** and **B1 password**. FreePlay (lessons.church) doesn't accept API keys, so Claude signs in to it as you. Not using FreePlay? Leave these two empty — everything else works with just the key.
6. Click **Save**.
7. **Quit Claude completely** (Mac: **Cmd+Q** · Windows: right-click the Claude icon in the taskbar → **Quit**) and open it again.

> Didn't open when you double-clicked? In Claude go to **Settings → Extensions → Advanced settings → Install Extension…** and choose the downloaded file.

---

## Step 4 — Try it!

Start a **new chat** in the Claude app and ask:

- *"List the groups in our church."*
- *"Who joined the Prayer Partners group this month?"*
- *"Add a new page to our website called Events."*

The first time, Claude asks permission to use B1 — click **Allow**. Claude always asks before using B1, and it can only reach your own church.

---

## Sign in with B1 (web, phone, ChatGPT)

No key and no download: you add B1 by its web address and log in with your B1 account. You choose which church and what Claude or ChatGPT may do on B1's sign-in screen.

**B1's address:** `https://api.churchapps.org/mcp`

### Claude (claude.ai, phone app, and desktop app)
1. On **[claude.ai](https://claude.ai)**, open **Settings → Connectors** and click **Add custom connector**.
2. Name it `B1`, paste `https://api.churchapps.org/mcp`, and click **Add**.
3. Click **Connect**. A B1 sign-in page opens: log in, pick your church and what to allow, and approve.
4. In a chat, turn **B1** on from the tools menu and ask away. It also shows up in the Claude phone and desktop apps on the same account.

Custom connectors need a paid Claude plan (Pro or higher); on Team/Enterprise plans an admin may need to add it first.

### ChatGPT
1. In ChatGPT, open **Settings → Apps & Connectors → Advanced settings** and turn on **Developer mode**.
2. Back in **Apps & Connectors**, click **Create**, name it `B1`, and paste `https://api.churchapps.org/mcp` as the server URL.
3. For authentication choose **OAuth**, then create it and sign in with your B1 account when asked.
4. In a new chat, pick **B1** from the tools/connectors menu.

Developer mode is available on paid ChatGPT plans; menu names can shift a little as ChatGPT updates.

🔒 To turn it off, remove the connector in Claude or ChatGPT. Signing in this way never shares your B1 password with Claude or ChatGPT.

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
B1's MCP server is run by ChurchApps at `https://api.churchapps.org/mcp` and uses your B1 API key as a `Bearer` token. The extension runs a small local server (`mcpb/server/index.js`) that forwards every B1 tool call there with the key, and sends `api_call` paths under `/lessons/*` straight to FreePlay's API (`https://api.lessons.church`) using a token from the optional B1 email + password — lessons.church only accepts login tokens, not API keys. Claude sees one set of tools: `list_endpoints` includes FreePlay's routes, generated from LessonsApi into `mcpb/server/lessons-routes.json`. The Claude desktop app supplies Node.js, so nothing extra is installed.

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

### Web, phone and ChatGPT (OAuth)
The B1 MCP server supports OAuth 2.1 sign-in (Protected Resource Metadata at `/.well-known/oauth-protected-resource`, Dynamic Client Registration, PKCE S256; consent screen in B1Admin), so claude.ai, the Claude apps and ChatGPT can add it as a custom connector by URL. Added in [ChurchApps/ChurchAppsSupport#1318](https://github.com/ChurchApps/ChurchAppsSupport/issues/1318). Scopes include `workflows:read` / `workflows:write`.

### Tips
- Claude reads B1's endpoint list itself (`list_endpoints`, `describe_endpoint`), so you don't need to know the API.
- Website pages: B1 strips inline styles and scripts, so ask Claude to use CSS classes in a `<style>` block.

</details>

## License
MIT
