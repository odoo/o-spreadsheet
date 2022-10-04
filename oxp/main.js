import { savedFile } from "./savedFile.js";
import * as interactions from "./interactions.js";

const { Spreadsheet, Model } = o_spreadsheet;

const templates = await (await fetch("../dist/o_spreadsheet.xml")).text();
const rootApp = new owl.App(Spreadsheet, {
  props: { model: new Model(savedFile) },
  env: { ...interactions },
  templates,
});
rootApp.mount(document.body);
