const Y = require("yjs");
const fs = require("fs");
const sizeof = require("object-sizeof");

const doc1 = new Y.Doc();
const doc2 = new Y.Doc();

const demoData = {
  sheets: [
    {
      name: "Sheet1",
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
    },
  ],
};

function save() {
  // doc1.getMap("Hello").set("world", 5);
  // doc1.getMap("sheets").set("name", demoData.sheets[0].name);
  // doc1.getMap("sheets").set("cells", new Y.Map());
  // for (let [xc, cell] of Object.entries(demoData.sheets[0].cells)) {
  //   doc1.getMap("sheets").get("cells").set(xc, cell);
  // }
  // const state = Y.encodeStateAsUpdateV2(doc1);
  // console.log(doc1.getMap("sheets").get("cells").get("A35"));
  // fs.writeFileSync("spreadsheet.yjs", state);
  // fs.writeFileSync("spreadsheet.json", JSON.stringify(demoData));
  const map = { hello: { iii: {} } };
  doc1.getMap("hello").set("iii", new Y.Map());
  const mapI = {};
  for (let i = 0; i <= 20; i++) {
    doc1.getMap("hello").get("iii").set(i.toString(), new Y.Map());
    const mapJ = {};
    for (let j = 0; j <= 20; j++) {
      doc1.getMap("hello").get("iii").get(i.toString()).set(j.toString(), new Y.Map());
      const mapK = {};
      for (let k = 0; k <= 20; k++) {
        doc1.getMap("hello").get("iii").get(i.toString()).get(j.toString()).set(k.toString(), k);
        mapK[k] = k;
      }
      mapJ[j] = mapK;
    }
    mapI[i] = mapJ;
  }
  map["iii"] = mapI;
  console.log(doc1.toJSON());
  const state = Y.encodeStateAsUpdateV2(doc1);
  fs.writeFileSync("map.yjs", state);
  fs.writeFileSync("map.json", JSON.stringify(map));
  Y.applyUpdateV2(doc2, state);
}

function load() {
  const state = fs.readFileSync("map.yjs");
  console.log(state);
  Y.applyUpdateV2(doc1, state);
  console.log(doc1.getMap("hello").toJSON());
}

function testGetPerf() {
  doc1.getMap("hello").set("salut", new Y.Map());
  doc1.getMap("hello").get("salut").set("test", "salut");
  const map = doc1.getMap("hello");
  console.time("Y get");
  for (let i = 0; i <= 1000000; i++) {
    map.get("salut").toJSON();
  }
  console.timeEnd("Y get");
  console.time("JS get");
  const js = { test: { salut: "salut" } };
  for (let i = 0; i <= 1000000; i++) {
    js.test;
  }
  console.timeEnd("JS get");
  const jsMap = new Map();
  jsMap.set("hello", new Map());
  jsMap.get("hello").set("salut", "salut");
  console.time("JS Map get");
  for (let i = 0; i <= 1000000; i++) {
    jsMap.get("hello").get("salut");
  }
  console.timeEnd("JS Map get");
  console.log(`Size of YMap: ${sizeof(doc1)}`);
  console.log(`Size of JS: ${sizeof(js)}`);
  console.log(`Size of JS Map: ${sizeof(jsMap)}`);
}
testGetPerf();
// save();
//load();
