#!/usr/bin/env node
// B1 + FreePlay bridge for the Claude desktop app.
//
// B1: every tool call is forwarded to ChurchApps' MCP server (api.churchapps.org/mcp) with the user's B1 API key,
// exactly as the plain mcp-remote bridge did.
// FreePlay: lessons.church only accepts a ChurchApps login token, which an API key can't produce, so api_call paths
// under /lessons/* are sent straight to the LessonsApi using a token from the user's B1 email + password.
// Claude sees one set of tools either way.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const B1_MCP_URL = process.env.B1_MCP_URL || "https://api.churchapps.org/mcp";
const LOGIN_URL = process.env.B1_LOGIN_URL || "https://api.churchapps.org/membership/users/login";
const LESSONS_API = (process.env.LESSONS_API_URL || "https://api.lessons.church").replace(/\/$/, "");
// Claude passes an unfilled optional setting through as the literal "${user_config.x}" placeholder.
const setting = (v) => (v && !v.startsWith("${") ? v : "");
const API_KEY = setting(process.env.B1_API_KEY).trim();
const EMAIL = setting(process.env.B1_EMAIL).trim();
const PASSWORD = setting(process.env.B1_PASSWORD);
const MAX_BODY_BYTES = 64 * 1024;

const here = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_ROUTES = JSON.parse(fs.readFileSync(path.join(here, "lessons-routes.json"), "utf8"));
const ICON = fs.readFileSync(path.join(here, "..", "icon.png")).toString("base64");

const text = (obj) => ({ content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }] });
const fail = (msg) => ({ isError: true, ...text(msg) });
const isLessonsPath = (p) => p === "/lessons" || p.toLowerCase().startsWith("/lessons/");

// ---- B1 (remote MCP server) ----

let b1Client = null;
async function b1() {
  if (b1Client) return b1Client;
  if (!API_KEY) throw new Error("No B1 API key is set. Open Settings → Extensions → B1 (ChurchApps) in Claude and paste one.");
  const client = new Client({ name: "b1-claude-connect", version: "1.1.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(B1_MCP_URL), { requestInit: { headers: { Authorization: "Bearer " + API_KEY } } }));
  b1Client = client;
  return client;
}

async function callB1(name, args) {
  try {
    return await (await b1()).callTool({ name, arguments: args });
  } catch (err) {
    b1Client = null;
    return fail("B1 request failed: " + (err?.message || String(err)));
  }
}

async function b1ApiCall(method, p) {
  const result = await callB1("api_call", { method, path: p });
  try {
    return JSON.parse(result.content?.[0]?.text || "{}");
  } catch {
    return {};
  }
}

// ---- FreePlay (lessons.church) ----

let lessonsJwt = null;
let lessonsJwtExpires = 0;

async function lessonsToken(force = false) {
  if (!force && lessonsJwt && Date.now() < lessonsJwtExpires) return lessonsJwt;
  if (!EMAIL || !PASSWORD) throw new Error("FreePlay needs your B1 email and password. Add them in Settings → Extensions → B1 (ChurchApps) in Claude.");

  const res = await fetch(LOGIN_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PASSWORD }) });
  const data = await res.json().catch(() => ({}));
  const churches = data.userChurches || [];
  if (!res.ok || churches.length === 0) throw new Error("FreePlay sign-in failed — check the B1 email and password in the extension settings." + (data.errors ? " (" + data.errors.join("; ") + ")" : ""));

  // Use the same church the B1 key belongs to: the key can read only its own church record.
  let match = churches[0];
  if (churches.length > 1 && API_KEY) {
    for (const uc of churches) {
      const r = await b1ApiCall("GET", "/membership/churches/" + uc.church.id);
      if (r.status === 200) { match = uc; break; }
    }
  }
  lessonsJwt = match.jwt;
  lessonsJwtExpires = Date.now() + 60 * 60 * 1000;
  return lessonsJwt;
}

async function callLessons({ method, path: p, query, body }) {
  const url = new URL(LESSONS_API + p.substring("/lessons".length));
  for (const [k, v] of Object.entries(query || {})) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)));
    else url.searchParams.append(k, String(v));
  }
  const verb = method.toUpperCase();
  const hasBody = body !== undefined && verb !== "GET" && verb !== "DELETE";

  const send = async (token) =>
    fetch(url, {
      method: verb,
      headers: { Authorization: "Bearer " + token, ...(hasBody ? { "Content-Type": "application/json" } : {}) },
      body: hasBody ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(25000)
    });

  try {
    let res = await send(await lessonsToken());
    if (res.status === 401) res = await send(await lessonsToken(true));
    const raw = await res.text();
    const truncated = Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES;
    let out = truncated ? Buffer.from(raw, "utf8").subarray(0, MAX_BODY_BYTES).toString("utf8") : raw;
    if (!truncated) { try { out = raw ? JSON.parse(raw) : null; } catch { /* keep text */ } }
    return { isError: res.status >= 400, ...text({ status: res.status, truncated: truncated || undefined, body: out }) };
  } catch (err) {
    return fail(err?.name === "TimeoutError" ? "FreePlay request timed out." : (err?.message || "FreePlay request failed."));
  }
}

// ---- Tools: the B1 server's tools, with FreePlay folded in ----

const server = new McpServer({
  name: "b1-churchapps",
  title: "ChurchApps",
  version: "1.1.0",
  websiteUrl: "https://churchapps.org",
  icons: [{ src: "data:image/png;base64," + ICON, mimeType: "image/png" }]
});

server.registerTool(
  "list_endpoints",
  {
    title: "List API endpoints",
    description:
      "Lists every ChurchApps endpoint Claude can call — B1 (people, groups, attendance, giving, plans, website content…) plus FreePlay / lessons.church under /lessons/* (classrooms, schedules, venues, lessons, playlists) — optionally filtered by path substring or HTTP method. Call this first to discover what api_call can invoke. When working on /content/* routes (building B1App pages) call describe_page_builder first.",
    inputSchema: {
      filter: z.string().optional().describe("Case-insensitive substring matched against the path. E.g. 'people', 'classrooms'."),
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).optional().describe("Limit to a single HTTP verb.")
    }
  },
  async (args) => {
    const needle = args.filter?.toLowerCase();
    const lessons = LESSONS_ROUTES.filter((r) => (!needle || r.path.toLowerCase().includes(needle)) && (!args.method || r.method === args.method));
    const remote = await callB1("list_endpoints", args);
    if (remote.isError) return lessons.length ? text({ total: lessons.length, endpoints: lessons, note: "B1 endpoints unavailable: " + remote.content?.[0]?.text }) : remote;
    let b1List = { total: 0, endpoints: [] };
    try { b1List = JSON.parse(remote.content[0].text); } catch { /* leave empty */ }
    const endpoints = [...(b1List.endpoints || []), ...lessons.map((r) => ({ ...r, likelyScopes: ["FreePlay — uses your B1 login"] }))];
    return text({ total: endpoints.length, endpoints });
  }
);

server.registerTool(
  "describe_endpoint",
  {
    title: "Describe API endpoint",
    description: "Returns a summary and (where available) a curated request/response example for one endpoint. Use this after list_endpoints before calling POST/PUT. FreePlay (/lessons/*) POST bodies are arrays of objects; include an id to update instead of create.",
    inputSchema: {
      method: z.string().describe("HTTP verb, e.g. 'GET' or 'POST'."),
      path: z.string().describe("Full path as returned by list_endpoints, e.g. '/membership/people/:id' or '/lessons/classrooms'.")
    }
  },
  async (args) => {
    if (!isLessonsPath(args.path)) return callB1("describe_endpoint", args);
    const entry = LESSONS_ROUTES.find((r) => r.method === args.method.toUpperCase() && r.path === args.path);
    if (!entry) return fail(`No FreePlay endpoint matches ${args.method} ${args.path}. Call list_endpoints with filter 'lessons'.`);
    return text({
      ...entry,
      service: "FreePlay / lessons.church (LessonsApi)",
      notes: "Runs as your own B1 login. Call a GET first to see the response shape, then mirror it. POST bodies are ARRAYS of objects; include id to update. DELETE /lessons/venues/:id also deletes every section, role and action under it."
    });
  }
);

server.registerTool(
  "api_call",
  {
    title: "Call the ChurchApps API",
    description:
      "Invokes a ChurchApps endpoint as you. B1 paths (e.g. /membership/people) run with your B1 API key's permissions. Paths starting with /lessons/ are FreePlay (lessons.church) and run as your B1 login. Response bodies above 64 KB are truncated; use query parameters to narrow results.",
    inputSchema: {
      method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).describe("HTTP verb."),
      path: z.string().describe("Path including any module prefix, e.g. '/membership/people' or '/lessons/classrooms' for FreePlay."),
      query: z.record(z.any()).optional().describe("Optional query-string parameters as a flat object."),
      body: z.any().optional().describe("Optional JSON request body. For most POST endpoints this is an array of model objects.")
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  },
  async (args) => {
    const p = args.path.startsWith("/") ? args.path : "/" + args.path;
    return isLessonsPath(p) ? callLessons({ ...args, path: p }) : callB1("api_call", { ...args, path: p });
  }
);

server.registerTool(
  "describe_page_builder",
  {
    title: "B1App page builder guide",
    description: "Returns the guide for building B1App website pages via the /content/* endpoints: the Page→Section→Element model, every elementType and its answersJSON shape, and a worked example. Call this once whenever the task involves creating or editing page content.",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  },
  async () => callB1("describe_page_builder", {})
);

await server.connect(new StdioServerTransport());
