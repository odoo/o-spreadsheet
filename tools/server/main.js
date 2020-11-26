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
  ws.send(JSON.stringify({ type: "CONNECTION", messages }));
  log(`Connection: ${messages.length} messages sent`);
});

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}]: ${message}`);
}

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    const msg = JSON.parse(message);
    if (msg.type === "multiuser_command") {
      if (msg.payload.type === "REMOTE_REVISION") {
        log(JSON.stringify(msg.payload.commands));
      } else {
        log(JSON.stringify(msg.payload.toReplay));
      }
      const revisionId = msg.payload.revision;
      log(`Serveur revision: ${revision}, Client revision: ${revisionId}`);
      if (revision === revisionId) {
        messages.push(msg.payload);
        aWss.clients.forEach(function each(client) {
          client.send(JSON.stringify(msg.payload));
        });
        revision = msg.payload.newRevision;
        log(`New revision: ${revision}`);
      }        
    }
  });
});

app.listen(9000);
