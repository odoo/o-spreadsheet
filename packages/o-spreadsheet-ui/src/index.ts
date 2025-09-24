import * as Engine from "@odoo/o-spreadsheet-engine";

export function salut() {
  console.log("Salut !");
}

export function createSpreadsheetModel() {
  return Engine.SpreadsheetModel();
}