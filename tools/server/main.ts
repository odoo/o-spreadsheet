const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

const PORT = 9000;
const revisionLog = [];
const toProcess = [];
const clients = [];

app.use(cors());
app.use(express.json());

const aWss = expressWS.getWss("/");
const startTimestamp = 0;
let nextId = 0;
let timestamp = 0;
let schedulerStarted = false;

expressWS.getWss().on("connection", (ws) => {
  log("Connection");
  clients.push(ws);
});

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    log("/");
    const msg = JSON.parse(message);
    if (msg.type === "multiuser_command") {
      toProcess.push([msg.payload, ws]);
      startScheduler();
      // console.log(JSON.stringify(msg.payload));
      // aWss.clients.forEach(function each(client) {
      //   client.send(JSON.stringify(msg));
      // });
    }
  });
});

function startScheduler() {
  if (!schedulerStarted) {
    log("Starting scheduler");
    schedulerStarted = true;
    let m = toProcess.shift();
    while (m) {
      let [message, ws] = m;
      //todo transformation
      const rev = message.revision;
      console.log(message);
      log(`rev: ${rev}`);
      log(`timestamp: ${timestamp}`);
      if (rev === timestamp + 1) {
        revisionLog.push(message);
        timestamp += 1;
        ws.send(
          JSON.stringify({
            type: "ACK",
            revision: timestamp,
          })
        );
        for (let client of clients) {
          if (client !== ws) {
            log(`Sending command at revision ${timestamp}`);
            client.send(
              JSON.stringify({
                type: "COMMAND",
                revision: timestamp,
                command: message.command,
              })
            );
          }
        }
      }
      m = toProcess.shift();
    }
    schedulerStarted = false;
  }
}

app.post("/timestamp", (req, res) => {
  timestamp = timestamp + 1;
  console.log(`Timestamp: ${timestamp}`);
  res.send(JSON.stringify({ timestamp }));
});

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}]: ${message}`);
}

app.listen(PORT);
console.log(`Server listenning on ${PORT}...`);
