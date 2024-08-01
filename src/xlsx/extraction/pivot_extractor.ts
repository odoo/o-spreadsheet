import type { XLSXTable } from "../../types/xlsx";
import { XlsxBaseExtractor } from "./base_extractor";

/**
 * We don't really support pivot tables, we'll just extract them as Tables.
 */
export class XlsxPivotExtractor extends XlsxBaseExtractor {
  getPivotTable(): XLSXTable {
    return this.mapOnElements(
      // Use :root instead of "pivotTableDefinition" because others pivotTableDefinition elements are present inside the root
      // pivotTableDefinition elements.
      { query: ":root", parent: this.rootFile.file.xml },
      (pivotElement): XLSXTable => {
        return {
          displayName: this.extractAttr(pivotElement, "name", { required: true }).asString(),
          id: this.extractAttr(pivotElement, "name", { required: true }).asString(),
          ref: this.extractChildAttr(pivotElement, "location", "ref", {
            required: true,
          }).asString()!,
          headerRowCount: this.extractChildAttr(pivotElement, "location", "firstDataRow", {
            default: 0,
          }).asNum()!,
          totalsRowCount: 1,
          cols: [],
          style: {
            showFirstColumn: true,
            showRowStripes: true,
          },
        };
      }
    )[0];
  }
}
