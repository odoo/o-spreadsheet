import { XLSXPivotTable, XLSXPivotTableLocation, XLSXPivotTableStyleInfo } from "../../types/xlsx";
import { XlsxBaseExtractor } from "./base_extractor";

/**
 * We don't really support pivot tables, we'll just extract them as Tables.
 */
export class XlsxPivotExtractor extends XlsxBaseExtractor {
  getPivotTable(): XLSXPivotTable {
    return this.mapOnElements(
      // Use :root instead of "pivotTableDefinition" because others pivotTableDefinition elements are present inside the root
      // pivotTableDefinition elements.
      { query: ":root", parent: this.rootFile.file.xml },
      (pivotElement): XLSXPivotTable => {
        return {
          name: this.extractAttr(pivotElement, "name", { required: true }).asString(),
          rowGrandTotals: this.extractAttr(pivotElement, "rowGrandTotals", {
            default: true,
          }).asBool(),
          location: this.extractPivotLocation(pivotElement),
          style: this.extractPivotStyleInfo(pivotElement),
        };
      }
    )[0];
  }

  private extractPivotLocation(pivotElement: Element): XLSXPivotTableLocation {
    return this.mapOnElements(
      { query: "location", parent: pivotElement },
      (pivotStyleElement): XLSXPivotTableLocation => {
        return {
          ref: this.extractAttr(pivotStyleElement, "ref", { required: true }).asString(),
          firstHeaderRow: this.extractAttr(pivotStyleElement, "firstHeaderRow", {
            required: true,
          }).asNum(),
          firstDataRow: this.extractAttr(pivotStyleElement, "firstDataRow", {
            required: true,
          }).asNum(),
          firstDataCol: this.extractAttr(pivotStyleElement, "firstDataCol", {
            required: true,
          }).asNum(),
        };
      }
    )[0];
  }

  private extractPivotStyleInfo(pivotElement: Element): XLSXPivotTableStyleInfo | undefined {
    return this.mapOnElements(
      { query: "pivotTableStyleInfo", parent: pivotElement },
      (pivotStyleElement): XLSXPivotTableStyleInfo => {
        return {
          name: this.extractAttr(pivotStyleElement, "name", { required: true }).asString(),
          showRowHeaders: this.extractAttr(pivotStyleElement, "showRowHeaders", {
            required: true,
          }).asBool(),
          showColHeaders: this.extractAttr(pivotStyleElement, "showColHeaders", {
            required: true,
          }).asBool(),
          showRowStripes: this.extractAttr(pivotStyleElement, "showRowStripes", {
            required: true,
          }).asBool(),
          showColStripes: this.extractAttr(pivotStyleElement, "showColStripes", {
            required: true,
          }).asBool(),
          showLastColumn: this.extractAttr(pivotStyleElement, "showLastColumn")?.asBool(),
        };
      }
    )[0];
  }
}
