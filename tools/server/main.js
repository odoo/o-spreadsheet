const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

const aWss = expressWS.getWss("/");
const updates = [{ id: "START_STATE" }]; // { id: UID, message: NetworkMessage }

expressWS.getWss().on("connection", (ws) => {
  let nbr = 0;
  for (let i = 1; i < updates.length; i++) {
    const msg = Object.assign({ previousTransactionId: updates[i - 1].id }, updates[i].message);
    ws.send(JSON.stringify(msg));
    nbr++;
  }
  log(`Connection: ${nbr} messages sent`);
});

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}]: ${message}`);
}

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    const msg = JSON.parse(message);
    if (msg.type === "multiuser_command") {
      log(JSON.stringify(msg.payload.commands));
      const previousTransactionId = updates[updates.length - 1].id;
      updates.push({
        id: msg.payload.transactionId,
        message: msg.payload,
      });
      aWss.clients.forEach(function each(client) {
        client.send(JSON.stringify(Object.assign({ previousTransactionId }, msg.payload)));
      });
    }
  });
});

app.listen(9000);
