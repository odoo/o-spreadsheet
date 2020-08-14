import { WorkbookData } from "../types";
import { utils } from "@odoo/owl";
import { toXC, isNumber } from "../helpers/index";

/**
 * This file contains code needed to export data to an XLS file, NOT to export
 * data from a model to a spreadsheet file!
 */

/**
 * Note that this function is not pure at all.  It performs all kind of side
 * effects: loading external libraries, using them to build files, adding those
 * files to a zip file, then downloading the result.
 */
export async function exportXLS(data: WorkbookData) {
  // Step 1: loading xlsx and FileSaver libraries
  const xlsx = utils.loadJS("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.16.6/xlsx.mini.min.js");
  const fileSaver = utils.loadJS(
    "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.2/FileSaver.min.js"
  );
  await Promise.all([xlsx, fileSaver]);

  // Step 2: generate a workook object
  const book = (window as any).XLSX.utils.book_new();

  // Step 3: add each sheet
  for (let sheetId in data.sheets) {
    const sheetData = data.sheets[sheetId];
    const sheet = (window as any).XLSX.utils.aoa_to_sheet([["=A2+B2"]]);
    (window as any).XLSX.utils.book_append_sheet(book, sheet, sheetData.name);
    for (let xc in sheetData.cells) {
      const content = sheetData.cells[xc].content!;
      if (content.startsWith("=")) {
        sheet[xc] = { f: content.slice(1) };
      } else if (isNumber(content)) {
        sheet[xc] = { v: content, t: "n" };
      } else {
        sheet[xc] = { v: content };
      }
    }
    sheet["!ref"] = `A1:${toXC(sheetData.colNumber - 1, sheetData.rowNumber - 1)}`;
  }

  // Step 4: export the result
  (window as any).XLSX.writeFile(book, `workbook.xlsx`);
}
