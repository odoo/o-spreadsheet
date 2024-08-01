import type { XLSXExternalBook, XLSXExternalSheetData } from "../../types/xlsx";
import { XlsxBaseExtractor } from "./base_extractor";

export class XlsxExternalBookExtractor extends XlsxBaseExtractor {
  getExternalBook(): XLSXExternalBook {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "externalBook" },
      (bookElement): XLSXExternalBook => {
        return {
          rId: this.extractAttr(bookElement, "r:id", { required: true }).asString(),
          sheetNames: this.mapOnElements(
            { parent: bookElement, query: "sheetName" },
            (sheetNameElement): string => {
              return this.extractAttr(sheetNameElement, "val", { required: true }).asString();
            }
          ),
          datasets: this.extractExternalSheetData(bookElement),
        };
      }
    )[0];
  }

  private extractExternalSheetData(externalBookElement: Element): XLSXExternalSheetData[] {
    return this.mapOnElements(
      { parent: externalBookElement, query: "sheetData" },
      (sheetDataElement): XLSXExternalSheetData => {
        const cellsData = this.mapOnElements(
          { parent: sheetDataElement, query: "cell" },
          (cellElement) => {
            return {
              xc: this.extractAttr(cellElement, "r", { required: true }).asString(),
              value: this.extractChildTextContent(cellElement, "v", { required: true })!,
            };
          }
        );

        const dataMap = {};
        for (let cell of cellsData) {
          dataMap[cell.xc] = cell.value;
        }

        return {
          sheetId: this.extractAttr(sheetDataElement, "sheetId", { required: true }).asNum(),
          data: dataMap,
        };
      }
    );
  }
}
