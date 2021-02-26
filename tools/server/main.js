const express = require("express");
const cors = require("cors");
const fs = require("fs");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

let messages = [];
let serverRevisionId = "START_REVISION";

// Creating the log file for this specific session
if (!fs.existsSync("./logs/")) {
  fs.mkdirSync("./logs/");
}
const logFile = fs.createWriteStream(`./logs/log-${Date.now()}`);

// restoring the messages of the previous sessions
const currentSessionFile = "./logs/session.json";
if (fs.existsSync(currentSessionFile)) {
  messages = JSON.parse(fs.readFileSync(currentSessionFile));
  if (messages.length) {
    serverRevisionId = messages[messages.length - 1].nextRevisionId
  }
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
  switch (msg.type) {
    case "REMOTE_REVISION":
      log(`${msg.type}: ${msg.nextRevisionId} : ${JSON.stringify(msg.commands)}`);
      break;
    case "REVISION_UNDONE":
      log(`${msg.type}: ${msg.undoneRevisionId}`);
      break;
    case "REVISION_REDONE":
      log(`${msg.type}: ${msg.redoneRevisionId}`);
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

app.get("/clear", function (req, res) {
  messages = [];
  serverRevisionId = "START_REVISION";
  log("History cleared");
  res.send("Cleared");
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
          log(`Server revision ${serverRevisionId} != message revision ${msg.serverRevisionId}. Message rejected ${message}`);
        }
        break;
      case "CLIENT_JOINED":
      case "CLIENT_LEFT":
      case "CLIENT_MOVED":
        broadcast(message);
        break;
    }
  });
});

app.listen(9000, () => {
  console.log("connected to :9000");
});
