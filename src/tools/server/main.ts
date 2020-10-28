const express = require("express");
const cors = require("cors");
const expressWS = require("express-ws")(express());
const app = expressWS.app;
const gzip = require("gzip-js");

const bodyParser = require("body-parser");

app.use(cors());
// app.use(express.json());
app.use(bodyParser.raw());
const aWss = expressWS.getWss("/");
const stateWss = expressWS.getWss("/sync-state");

const demoData = {
  version: 5,
  sheets: [
    {
      id: "12345",
      name: "Sheet1",
      colNumber: 26,
      rowNumber: 120,
      cols: { 1: {}, 3: {} },
      rows: {},
      cells: {
        A21: { content: "Sheet2 => B2:" },
        B2: { content: "Owl is awesome", style: 1 },
        B4: { content: "Numbers", style: 4 },
        B21: { content: "=Sheet2!B2", style: 7 },
        C1: { content: "CF =42" },
        C4: { content: "12.4" },
        C5: { content: "42" },
        C7: { content: "3" },
        B9: { content: "Formulas", style: 5 },
        C9: { content: "= SUM ( C4 : C5 )" },
        C10: { content: "=SUM(C4:C7)" },
        D10: { content: "note that C7 is empty" },
        C11: { content: "=-(3 + C7 *SUM(C4:C7))" },
        C12: { content: "=SUM(C9:C11)" },
        D12: { content: "this is a sum of sums" },
        B14: { content: "Errors", style: 6 },
        C14: { content: "=C14" },
        C15: { content: "=(+" },
        C16: { content: "=C15" },
        F2: { content: "italic blablah", style: 2 },
        F3: { content: "strikethrough", style: 3 },
        H2: { content: "merged content" },
        C20: { content: "left", border: 1 },
        E20: { content: "top", border: 2 },
        G20: { content: "all", border: 3 },
        K3: { border: 3 },
        B17: { content: "=WAIT(1000)" },
        G13: { content: "=A1+A2+A3+A4+A5+A6+A7+A8+A9+A10+A11+A12+A13+A14+A15+A16+A17+A18" },
        C23: { content: "0.43", format: "0.00%" },
        C24: { content: "10", format: "#,##0.00" },
        C25: { content: "10.123", format: "#,##0.00" },
        G1: { content: "CF color scale:" },
        G2: { content: "5" },
        G3: { content: "8" },
        G4: { content: "9" },
        G5: { content: "15" },
        G6: { content: "22" },
        G8: { content: "30" },
        B26: { content: "first dataset" },
        C26: { content: "second dataset" },
        B27: { content: "12" },
        B28: { content: "=floor(RAND()*50)" },
        B29: { content: "=floor(RAND()*50)" },
        B30: { content: "=floor(RAND()*50)" },
        B31: { content: "=floor(RAND()*50)" },
        B32: { content: "=floor(RAND()*50)" },
        B33: { content: "=floor(RAND()*50)" },
        B34: { content: "19" },
        B35: { content: "=floor(RAND()*50)" },
        C27: { content: "=floor(RAND()*50)" },
        C28: { content: "=floor(RAND()*50)" },
        C29: { content: "=floor(RAND()*50)" },
        C30: { content: "=floor(RAND()*50)" },
        C31: { content: "=floor(RAND()*50)" },
        C32: { content: "=floor(RAND()*50)" },
        C33: { content: "=floor(RAND()*50)" },
        C34: { content: "=floor(RAND()*50)" },
        C35: { content: "=floor(RAND()*50)" },
        A27: { content: "Emily Anderson (Emmy)" },
        A28: { content: "Sophie Allen (Saffi)" },
        A29: { content: "Chloe Adams" },
        A30: { content: "Megan Alexander (Meg)" },
        A31: { content: "Lucy Arnold (Lulu)" },
        A32: { content: "Hannah Alvarez" },
        A33: { content: "Jessica Alcock (Jess)" },
        A34: { content: "Charlotte Anaya" },
        A35: { content: "Lauren Anthony" },
      },
      merges: ["H2:I5", "K3:K8"],
      conditionalFormats: [
        {
          id: "1",
          ranges: ["C1:C100"],
          rule: {
            values: ["42"],
            operator: "Equal",
            type: "CellIsRule",
            style: { fillColor: "orange" },
          },
        },
        {
          id: "2",
          ranges: ["G1:G100"],
          rule: {
            type: "ColorScaleRule",
            minimum: { type: "value", color: 0xffffff },
            maximum: { type: "value", color: 0xff0000 },
          },
        },
      ],
    },
    {
      name: "Sheet2",
      id: "54321",
      cells: {
        B2: { content: "42" },
      },
      figures: [
        {
          id: "someId",
          tag: "text",
          width: 300,
          height: 200,
          x: 300,
          y: 100,
          data: "blablabla",
        },
        {
          id: "someId2",
          tag: "text",
          width: 210,
          height: 180,
          x: 900,
          y: 200,
          data: "yip yip",
        },
        {
          id: "1",
          tag: "chart",
          width: 400,
          height: 300,
          x: 450,
          y: 550,
          data: {
            type: "line",
            title: "demo chart",
            labelRange: "Sheet1!A27:A35",
            dataSets: [
              { labelCell: "Sheet1!B26", dataRange: "Sheet1!B27:B35" },
              { labelCell: "Sheet1!C26", dataRange: "Sheet1!C27:C35" },
            ],
          },
        },
      ],
    },
  ],
  styles: {
    1: { bold: true, textColor: "#3A3791", fontSize: 12 },
    2: { italic: true },
    3: { strikethrough: true },
    4: { fillColor: "#e3efd9" },
    5: { fillColor: "#c5e0b3" },
    6: { fillColor: "#a7d08c" },
    7: { align: "left" },
  },
  borders: {
    1: { left: ["thin", "#000"] },
    2: { top: ["thin", "#000"] },
    3: {
      top: ["thin", "#000"],
      left: ["thin", "#000"],
      bottom: ["thin", "#000"],
      right: ["thin", "#000"],
    },
  },
};

let timestamp = 0;
let first = true;

let state = null;

app.ws("/", function (ws, req) {
  ws.on("message", function (message) {
    console.log(`/ Length: ${message.length}`);
    console.time("GZip Zip");
    const zip = gzip.zip(message);
    console.timeEnd("GZip Zip");
    console.time("GZip Unzip");
    gzip.unzip(zip);
    console.timeEnd("GZip Unzip");
    console.log(`/ Length (Gzipped): ${zip.length}`);
    Array.from(aWss.clients).forEach((client) => {
      if (client !== ws) {
        // @ts-ignore
        client.send(message);
      } else {
      }
    });
  });
});
app.ws("/sync-state", function (ws, req) {
  ws.on("message", function (message) {
    console.log("SyncState");
    if (!state) {
      console.log("New state");
      state = message;
      // @ts-ignore
      console.log(`State received length: ${state.length}`);
    }
    ws.send(state);
  });
});

app.get("/get-status", (req, res) => {
  console.log("get-status");
  // res.send(true);
  if (first) {
    first = false;
    res.send(true);
  } else {
    res.send(false);
  }
});

app.get("/get-json", (req, res) => {
  res.send(JSON.stringify(demoData));
});

app.get("/get-crdt", (req, res) => {
  // @ts-ignore
  console.log(`State sent length: ${state && state.length}`);
  // res.send(state);
  if (state) {
    res.send(JSON.stringify(state));
  } else {
    res.send(null);
  }
});

aWss.on("connection", () => {
  console.log("New connection");
});

function removeState() {
  console.log("Clear state");
  state = null;
}

// setInterval(removeState, 15000);

app.listen(9000);
