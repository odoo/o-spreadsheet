// const Automerge = require("automerge");
// const Websocket = require("ws");

// const ws = new Websocket("ws://localhost:9000");

// let docs1 = Automerge.from({ cards: ["Test"] });
// const save = Automerge.save(docs1);
// // let docs2 = Automerge.init();
// // docs2 = Automerge.merge(docs2, docs1);

// ws.on("open", () => {
//   // docs1 = Automerge.change(docs1, "", (doc) => {
//   //   doc.cards.push("Test");
//   // });
//   ws.send(JSON.stringify(save));
//   setTimeout(() => {
//     const before = docs1;
//     docs1 = Automerge.change(docs1, "", (doc) => doc.cards.push("Blabla"));
//     ws.send(JSON.stringify(Automerge.getChanges(before, docs1)));
//   }, 1000);
// });

// let first = true;
// let docs2;

// ws.on("message", (data) => {
//   if (first) {
//     docs2 = Automerge.load(JSON.parse(data));
//     first = false;
//   } else {
//     docs2 = Automerge.applyChanges(docs2, JSON.parse(data));
//   }
//   // docs2 = Automerge.applyChanges(docs2, JSON.parse(data));
//   console.log(docs1.cards);
//   console.log(docs2.cards);
// });
