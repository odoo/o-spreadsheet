import cors from "cors";
import express from "express";
import expressWS from "express-ws";
import { ConflictResolver } from "../helpers/conflict_resolver";

const expressWSInstance = expressWS(express());

const app = expressWSInstance.app;

const PORT = 9000;

app.use(cors());
app.use(express.json());

const conflictResolver = new ConflictResolver();

const aWss = expressWSInstance.getWss();

expressWSInstance.getWss().on("connection", (ws: WebSocket) => {
  log("Connection");
});

app.ws("/", function (ws, req) {
  ws.on("open", (event) => {
    console.log(event);
    const history = conflictResolver.getUpdateHistory();
    if (history !== undefined) {
      ws.send(
        JSON.stringify({
          updates: history.updates,
          stateVector: history.stateVector,
          // clientId: ?
        })
      );
    }
  });
  ws.on("message", async function (message: string) {
    log("/");
    const msg = JSON.parse(message);
    log(message.length);
    let { stateVector, updates, clientId } = msg;
    updates = conflictResolver.resolveConflicts(stateVector, updates);
    aWss.clients.forEach(function each(client) {
      if (client !== ws) {
        // (?) send global order as decided by the server; clients execute updates in this global order
        // => probably no: websocket message order is garanteed
        client.send(
          JSON.stringify({
            updates,
            stateVector,
            clientId,
          })
        );
      }
    });
  });
});

function log(message: any) {
  console.log(`[${new Date().toLocaleTimeString()}]: ${message}`);
}

app.listen(PORT);
log(`Server listenning on ${PORT}...`);
