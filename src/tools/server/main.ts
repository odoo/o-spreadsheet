const express = require("express");
const cors = require("cors");
// const bodyParser = require("body-parser");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());
// app.use(bodyParser.raw({ type: "application/octet-stream" }));
const aWss = expressWS.getWss("/");
const stateWss = expressWS.getWss("/sync-state");
let timestamp = 0;

let state = null;

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    console.log("/");
    // const msg = JSON.parse(message);
    Array.from(aWss.clients).forEach((client) => {
      if (client !== ws) {
        // @ts-ignore
        client.send(message);
      }
    });
    // if (msg.type === "multiuser_command") {
    //   console.log(JSON.stringify(msg.payload));
    // }
  });
});
app.ws("/sync-state", function (ws, req) {
  ws.on("message", function (message) {
    console.log("SyncState");
    console.log(message);
    if (!state) {
      console.log("New state");
      state = message;
    }
    ws.send(state);
  });
});
// app.post("/state_from_client", (req, res) => {
//   if (!state) {
//     console.log("New state");
//     state = req.body;
//   }
//   res.send(state);
// });
aWss.on("connection", () => {
  console.log("New connection");
});

app.post("/timestamp", (req, res) => {
  timestamp = timestamp + 1;
  console.log(`Timestamp: ${timestamp}`);
  res.send(JSON.stringify({ timestamp }));
});

function removeState() {
  console.log("Clear state");
  state = null;
}

// setInterval(removeState, 15000);

app.listen(9000);
