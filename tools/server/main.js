const express = require("express");
const cors = require("cors");
const fs = require("fs");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

let messages = [];

// Creating the log file for this specific session
if (!fs.existsSync("./logs/")) {
  fs.mkdirSync("./logs/");
}
const logFile = fs.createWriteStream(`./logs/log-${Date.now()}`);

// restoring the messages of the previous sessions
const currentSessionFile = "./logs/session.json";
if (fs.existsSync(currentSessionFile)) {
  messages = JSON.parse(fs.readFileSync(currentSessionFile));
  log(`loaded ${messages.length} messages from ${currentSessionFile}`);
}

// save the messages before exiting gracefully
[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, () => {
    log(`writing ${messages.length} messages to ${currentSessionFile}`);
    fs.writeFileSync(currentSessionFile, JSON.stringify(messages));
    process.exit();
  });
});

// setup the socket connection for the clients to connect
let serverRevisionId = "START_REVISION";

const aWss = expressWS.getWss("/");
expressWS.getWss().on("connection", (ws) => {
  log(`Connection: ${messages.length} messages have been sent`);
});

function log(message) {
  const msg = `[${new Date().toLocaleTimeString()}]: ${message}`;
  console.log(msg);
  logFile.write(msg + "\r\n");
}

function logMessage(msg) {
  log(msg.type);
  switch (msg.type) {
    case "REMOTE_REVISION":
      log(`Revision: ${msg.nextRevisionId} : ${JSON.stringify(msg.revision.commands)}`);
      break;
    case "REVISION_UNDONE":
      log(`Undo: ${msg.undoneRevisionId}`);
      break;
    case "REVISION_REDONE":
      log(`Redo: ${msg.redoneRevisionId}`);
      break;
  }
}

function broadcast(message) {
  aWss.clients.forEach(function each(client) {
    client.send(message);
  });
}

app.get("/", function (req, res) {
  res.send(messages);
});

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    const msg = JSON.parse(message);
    logMessage(msg);

    switch (msg.type) {
      case "REMOTE_REVISION":
      case "REVISION_UNDONE":
      case "REVISION_REDONE":
        if (msg.serverRevisionId === serverRevisionId) {
          serverRevisionId = msg.nextRevisionId;
          messages.push(msg);
          broadcast(message);
        } else {
          log(`Rejected: ${message}`);
        }
        break;
      case "CLIENT_JOINED":
      case "CLIENT_LEFT":
      case "CLIENT_MOVED":
        broadcast(message);
        break;
    }
    // logMessage(msg);
    // const revisionId = msg.revisionId;
    // if (msg.type === "REMOTE_REVISION") {
    //   log(`Serveur revision: ${revision}, Client revision: ${revisionId}`);
    // }
    // if (revision === revisionId || msg.type !== "REMOTE_REVISION") {
    //   aWss.clients.forEach(function each(client) {
    //     client.send(JSON.stringify({...msg, revisionId: msg.revision.id}));
    //   });
    //   if (msg.type === "REMOTE_REVISION") {
    //     messages.push(msg);
    //     revision = msg.revision.id;
    //     log(`New revision: ${revision}`);
    //   }
    // }
  });
});

app.listen(9000, () => {
  console.log("connected to :9000");
});
