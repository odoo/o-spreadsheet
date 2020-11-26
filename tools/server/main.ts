const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

const aWss = expressWS.getWss("/");
let timestamp = 0;

expressWS.getWss().on("connection", (ws) => {
  log("Connection");
  //clients.push(ws);
});

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}]: ${message}`);
}

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    const msg = JSON.parse(message);
    if (msg.type === "multiuser_command") {
      console.log(JSON.stringify(msg.payload));
      aWss.clients.forEach(function each(client) {
        client.send(JSON.stringify(msg));
      });
    }
  });
});

app.post("/timestamp", (req, res) => {
  timestamp = timestamp + 1;
  console.log(`Timestamp: ${timestamp}`);
  res.send(JSON.stringify({ timestamp }));
});

app.listen(9000);
