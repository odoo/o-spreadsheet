const Y = require("yjs");
const Websocket = require("ws");

const ws = new Websocket("ws://localhost:9000");

const doc2 = new Y.Doc();
// const map2 = doc2.getMap("hello");

ws.on("message", (data) => {
  Y.applyUpdateV2(doc2, data);
  //   console.log(doc1.getMap("hello"));
  //   console.log(map1.get("world"));
  //   console.log(doc2.getMap("hello"));
  console.log(doc2.getMap("hello").get("world"));
});
