const Y = require("yjs");
const Websocket = require("ws");

const ws = new Websocket("ws://localhost:9000");

const doc1 = new Y.Doc();
const map1 = doc1.getMap("hello");
// const map2 = doc2.getMap("hello");

ws.on("open", () => {
  doc1.on("updateV2", (update) => {
    ws.send(update);
  });
  map1.set("world", 5);
});
