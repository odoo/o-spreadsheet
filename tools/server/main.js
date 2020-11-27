const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

const aWss = expressWS.getWss("/");
const messages = []; // { id: UID, message: NetworkMessage }

let revision = "START_REVISION";

expressWS.getWss().on("connection", (ws) => {
  for (const message of messages) {
    ws.send(JSON.stringify(message));
  }
  log(`Connection: ${messages.length} messages sent`);
});

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}]: ${message}`);
}

function logMessage(msg) {
  if (msg.type === "REMOTE_REVISION") {
    log(JSON.stringify(msg.commands));
  } else {
    log(JSON.stringify(msg));
  }
}

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    const msg = JSON.parse(message).payload;
    logMessage(msg);
    const revisionId = msg.revisionId;
    if (msg.type === "REMOTE_REVISION") {
      log(`Serveur revision: ${revision}, Client revision: ${revisionId}`);
    }
    if (revision === revisionId || msg.type !== "REMOTE_REVISION") {
      aWss.clients.forEach(function each(client) {
        client.send(JSON.stringify(msg));
      });
      if (msg.type === "REMOTE_REVISION") {
        messages.push(msg);
        revision = msg.revision.id;
        log(`New revision: ${revision}`);
      }
    }
  });
});

app.listen(9000);
