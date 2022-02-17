import { XLSXTable, XLSXTableCol, XLSXTableStyleInfo } from "../../types/xlsx";
import { XlsxBaseExtractor } from "./base_extractor";

export class XlsxTableExtractor extends XlsxBaseExtractor {
  getTable(): XLSXTable {
    return this.mapOnElements(
      { query: "table", parent: this.rootFile.file.xml },
      (tableElement): XLSXTable => {
        return {
          displayName: this.extractAttr(tableElement, "displayName", {
            required: true,
          }).asString()!,
          name: this.extractAttr(tableElement, "name")?.asString(),
          id: this.extractAttr(tableElement, "id", { required: true }).asString(),
          ref: this.extractAttr(tableElement, "ref", { required: true }).asString(),
          headerRowCount: this.extractAttr(tableElement, "headerRowCount", {
            default: 1,
          }).asNum()!,
          totalsRowCount: this.extractAttr(tableElement, "totalsRowCount", {
            default: 0,
          }).asNum()!,
          cols: this.extractTableCols(tableElement),
          style: this.extractTableStyleInfo(tableElement),
        };
      }
    )[0];
  }

  private extractTableCols(tableElement: Element): XLSXTableCol[] {
    return this.mapOnElements(
      { query: "tableColumn", parent: tableElement },
      (tableColElement): XLSXTableCol => {
        return {
          id: this.extractAttr(tableColElement, "id", { required: true }).asString(),
          name: this.extractAttr(tableColElement, "name", { required: true }).asString(),
          colFormula: this.extractChildTextContent(tableColElement, "calculatedColumnFormula"),
        };
      }
    );
  }

  private extractTableStyleInfo(tableElement: Element): XLSXTableStyleInfo | undefined {
    return this.mapOnElements(
      { query: "tableStyleInfo", parent: tableElement },
      (tableStyleElement): XLSXTableStyleInfo => {
        return {
          name: this.extractAttr(tableStyleElement, "name")?.asString(),
          showFirstColumn: this.extractAttr(tableStyleElement, "showFirstColumn")?.asBool(),
          showLastColumn: this.extractAttr(tableStyleElement, "showLastColumn")?.asBool(),
          showRowStripes: this.extractAttr(tableStyleElement, "showRowStripes")?.asBool(),
          showColumnStripes: this.extractAttr(tableStyleElement, "showColumnStripes")?.asBool(),
        };
      }
    )[0];
  }
}
