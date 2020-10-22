const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;

app.use(cors());
app.use(express.json());

const aWss = expressWS.getWss("/");
let timestamp = 0;

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    // const msg = JSON.parse(message);
    console.log(message);
    aWss.clients.forEach(function each(client) {
      // if (client !== ws) {
      client.send(message);
      // }
    });
    // if (msg.type === "multiuser_command") {
    //   console.log(JSON.stringify(msg.payload));
    // }
  });
});

app.post("/timestamp", (req, res) => {
  timestamp = timestamp + 1;
  console.log(`Timestamp: ${timestamp}`);
  res.send(JSON.stringify({ timestamp }));
});

app.listen(9000);
