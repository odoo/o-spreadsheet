const Y = require("yjs");
const Websocket = require("ws");

const ws = new Websocket("ws://localhost:9000");

const doc1 = new Y.Doc();
const doc2 = new Y.Doc();
const map1 = doc1.getMap("hello");
// const map2 = doc2.getMap("hello");

ws.on("open", () => {
  doc1.on("updateV2", (update) => {
    ws.send(update);
  });
  map1.set("world", 5);
});

ws.on("message", (data) => {
  Y.applyUpdateV2(doc2, data);
  //   console.log(doc1.getMap("hello"));
  //   console.log(map1.get("world"));
  console.log(doc1.getMap("hello").get("world"));
  console.log("**************");
  //   console.log(doc2.getMap("hello"));
  console.log(doc2.getMap("hello").get("world"));
});
