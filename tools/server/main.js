const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

const aWss = expressWS.getWss("/");
const messages = []; // { id: UID, message: NetworkMessage }

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
      log(JSON.stringify(msg.payload.commands));
      messages.push(msg.payload);
      aWss.clients.forEach(function each(client) {
        client.send(JSON.stringify(msg.payload));
      });
    }
  });
});

app.listen(9000);
