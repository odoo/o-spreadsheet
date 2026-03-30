/**
 * Multi-file collaborative demo server.
 * This is not suitable for production use!
 */
const formData = require("express-form-data");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());
app.use(formData.parse());
app.use(formData.format());
app.use(formData.stream());
app.use(formData.union());

const FILES_DIR = "./logs/files";
const IMAGES_DIR = "./logs/images";

if (!fs.existsSync("./logs/")) fs.mkdirSync("./logs/");
if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR);

const logStream = fs.createWriteStream(`./logs/log-${Date.now()}`);
function log(msg) {
  const line = `[${new Date().toLocaleTimeString()}]: ${msg}`;
  console.log(line);
  logStream.write(line + "\r\n");
}

// ─── Virtual demo files ───────────────────────────────────────────────────────

const VIRTUAL_FILES = [
  { id: "virtual-demo-data", name: "Demo Spreadsheet" },
  { id: "virtual-empty", name: "Empty" },
  { id: "virtual-large-numbers", name: "Large Dataset - Numbers" },
  { id: "virtual-large-floats", name: "Large Dataset - Floats" },
  { id: "virtual-large-long-floats", name: "Large Dataset - Long Floats" },
  { id: "virtual-large-strings", name: "Large Dataset - Strings" },
  { id: "virtual-large-formulas", name: "Large Dataset - Formulas" },
  { id: "virtual-large-formulas-squished", name: "Large Dataset - Formulas Squished" },
  { id: "virtual-large-array-formulas", name: "Large Dataset - Array Formulas" },
  { id: "virtual-large-vectorized-formulas", name: "Large Dataset - Vectorized Formulas" },
  { id: "virtual-large-split-vlookup", name: "Large Dataset - Split Vlookup" },
  { id: "virtual-pivot", name: "Pivot Dataset" },
];

const VIRTUAL_IDS = new Set(VIRTUAL_FILES.map((f) => f.id));

// ─── Per-file session state ───────────────────────────────────────────────────

const sessions = {}; // { [fileId]: { messages, serverRevisionId } }

function sessionFilePath(fileId) {
  return path.join(FILES_DIR, `${fileId}.session.json`);
}
function metaFilePath(fileId) {
  return path.join(FILES_DIR, `${fileId}.meta.json`);
}
function snapshotFilePath(fileId) {
  return path.join(FILES_DIR, `${fileId}.snapshot.json`);
}

function loadSession(fileId) {
  if (sessions[fileId]) return sessions[fileId];
  const session = { messages: [], serverRevisionId: "START_REVISION" };
  const sf = sessionFilePath(fileId);
  if (fs.existsSync(sf)) {
    const data = JSON.parse(fs.readFileSync(sf, "utf8"));
    session.messages = data.messages || [];
    if (session.messages.length) {
      session.serverRevisionId = session.messages[session.messages.length - 1].nextRevisionId;
    }
    log(`Loaded ${session.messages.length} messages for ${fileId}`);
  }
  sessions[fileId] = session;
  return session;
}

function saveSession(fileId) {
  const session = sessions[fileId];
  if (!session) return;
  fs.writeFileSync(sessionFilePath(fileId), JSON.stringify({ messages: session.messages }));
}

// Pre-load all existing file sessions on startup
for (const { id } of VIRTUAL_FILES) loadSession(id);
for (const name of fs.readdirSync(FILES_DIR)) {
  if (name.endsWith(".meta.json")) {
    const fileId = name.replace(".meta.json", "");
    if (!VIRTUAL_IDS.has(fileId)) loadSession(fileId);
  }
}

// Save all sessions on graceful shutdown
["SIGINT", "SIGUSR1", "SIGUSR2", "SIGTERM"].forEach((sig) => {
  process.on(sig, (code) => {
    for (const fileId of Object.keys(sessions)) saveSession(fileId);
    process.exit(code);
  });
});

// ─── WebSocket clients per file ───────────────────────────────────────────────

const fileClients = {}; // { [fileId]: Set<ws> }

function broadcastToFile(fileId, message) {
  const clients = fileClients[fileId];
  if (!clients) return;
  for (const ws of clients) ws.send(message);
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function listUserFiles() {
  return fs
    .readdirSync(FILES_DIR)
    .filter((n) => n.endsWith(".meta.json"))
    .map((n) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(FILES_DIR, n), "utf8"));
      } catch (_) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.createdAt - b.createdAt);
}

function getFileMeta(fileId) {
  if (VIRTUAL_IDS.has(fileId)) return VIRTUAL_FILES.find((f) => f.id === fileId);
  const mf = metaFilePath(fileId);
  if (!fs.existsSync(mf)) return null;
  return JSON.parse(fs.readFileSync(mf, "utf8"));
}

// ─── HTTP: file management ────────────────────────────────────────────────────

app.get("/files", (req, res) => {
  const virtualList = VIRTUAL_FILES.map((f) => ({
    ...f,
    isVirtual: true,
    messageCount: (sessions[f.id] || { messages: [] }).messages.length,
  }));
  const userList = listUserFiles().map((f) => ({
    ...f,
    messageCount: (sessions[f.id] || { messages: [] }).messages.length,
  }));
  res.json([...virtualList, ...userList]);
});

app.post("/files", (req, res) => {
  const { name, snapshot } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const now = Date.now();
  const meta = { id, name, createdAt: now, lastModified: now, isVirtual: false };
  fs.writeFileSync(metaFilePath(id), JSON.stringify(meta));
  if (snapshot) fs.writeFileSync(snapshotFilePath(id), JSON.stringify(snapshot));
  sessions[id] = { messages: [], serverRevisionId: "START_REVISION" };
  log(`Created file: ${name} (${id})`);
  res.json(meta);
});

app.get("/files/:id", (req, res) => {
  const { id } = req.params;
  const meta = getFileMeta(id);
  if (!meta) return res.status(404).json({ error: "not found" });
  const session = loadSession(id);
  let snapshot = null;
  if (!VIRTUAL_IDS.has(id)) {
    const sf = snapshotFilePath(id);
    if (fs.existsSync(sf)) snapshot = JSON.parse(fs.readFileSync(sf, "utf8"));
  }
  res.json({ ...meta, messages: session.messages, snapshot });
});

app.delete("/files/:id", (req, res) => {
  const { id } = req.params;
  if (VIRTUAL_IDS.has(id)) return res.status(403).json({ error: "cannot delete virtual files" });
  if (!fs.existsSync(metaFilePath(id))) return res.status(404).json({ error: "not found" });
  fs.rmSync(metaFilePath(id));
  const sf = sessionFilePath(id);
  if (fs.existsSync(sf)) fs.rmSync(sf);
  const snf = snapshotFilePath(id);
  if (fs.existsSync(snf)) fs.rmSync(snf);
  delete sessions[id];
  log(`Deleted file: ${id}`);
  res.json({ ok: true });
});

app.post("/files/:id/rename", (req, res) => {
  const { id } = req.params;
  if (VIRTUAL_IDS.has(id)) return res.status(403).json({ error: "cannot rename virtual files" });
  const mf = metaFilePath(id);
  if (!fs.existsSync(mf)) return res.status(404).json({ error: "not found" });
  const meta = JSON.parse(fs.readFileSync(mf, "utf8"));
  meta.name = req.body.name;
  meta.lastModified = Date.now();
  fs.writeFileSync(mf, JSON.stringify(meta));
  res.json(meta);
});

app.post("/files/:id/clear", (req, res) => {
  const { id } = req.params;
  sessions[id] = { messages: [], serverRevisionId: "START_REVISION" };
  saveSession(id);
  log(`Cleared history for: ${id}`);
  res.json({ ok: true });
});

// ─── HTTP: image upload (unchanged) ──────────────────────────────────────────

app.post("/upload-image", (req, res) => {
  try {
    if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);
    const stream = req.files["image"];
    const inputName = path.basename(stream.path);
    fs.readdir(IMAGES_DIR, (err, files) => {
      if (err) {
        log(err);
        return;
      }
      const outPath = path.join(IMAGES_DIR, files.length + inputName);
      const ws = fs.createWriteStream(outPath);
      ws.on("finish", () => res.send("../" + outPath));
      stream.pipe(ws);
    });
  } catch (err) {
    log(err);
    throw err;
  }
});

// ─── WebSocket: per-file collaboration ───────────────────────────────────────

app.ws("/files/:id", (ws, req) => {
  const fileId = req.params.id;
  if (!fileClients[fileId]) fileClients[fileId] = new Set();
  fileClients[fileId].add(ws);
  const session = loadSession(fileId);
  log(`WS connect: ${fileId} (${session.messages.length} messages)`);

  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    switch (msg.type) {
      case "REMOTE_REVISION":
      case "REVISION_UNDONE":
      case "REVISION_REDONE":
        if (msg.serverRevisionId === session.serverRevisionId) {
          session.serverRevisionId = msg.nextRevisionId;
          session.messages.push(msg);
          broadcastToFile(fileId, message);
        } else {
          log(
            `File ${fileId}: revision mismatch. Expected ${session.serverRevisionId}, got ${msg.serverRevisionId}`
          );
        }
        break;
      case "CLIENT_JOINED":
      case "CLIENT_LEFT":
      case "CLIENT_MOVED":
        broadcastToFile(fileId, message);
        break;
    }
  });

  ws.on("close", () => {
    fileClients[fileId].delete(ws);
    log(`WS disconnect: ${fileId}`);
  });
});

app.listen(9090, () => log("Server listening on :9090"));
