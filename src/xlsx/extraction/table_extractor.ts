import type {
  XLSXAutoFilter,
  XLSXFilterColumn,
  XLSXSimpleFilter,
  XLSXTable,
  XLSXTableCol,
  XLSXTableStyleInfo,
} from "../../types/xlsx";
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
          autoFilter: this.extractTableAutoFilter(tableElement),
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

  private extractTableAutoFilter(tableElement: Element) {
    return this.mapOnElements(
      { query: "autoFilter", parent: tableElement },
      (autoFilterElement): XLSXAutoFilter => {
        return {
          columns: this.extractFilterColumns(autoFilterElement),
          zone: this.extractAttr(autoFilterElement, "ref", { required: true }).asString(),
        };
      }
    )[0];
  }

  private extractFilterColumns(autoFilterElement: Element): XLSXFilterColumn[] {
    return this.mapOnElements(
      { query: "tableColumn", parent: autoFilterElement },
      (filterColumnElement): XLSXFilterColumn => {
        return {
          colId: this.extractAttr(autoFilterElement, "colId", { required: true }).asNum(),
          hiddenButton: this.extractAttr(autoFilterElement, "hiddenButton", {
            default: false,
          }).asBool(),
          filters: this.extractSimpleFilter(filterColumnElement),
        };
      }
    );
  }

  private extractSimpleFilter(filterColumnElement: Element): XLSXSimpleFilter[] {
    return this.mapOnElements(
      { query: "filter", parent: filterColumnElement },
      (filterColumnElement): XLSXSimpleFilter => {
        return {
          val: this.extractAttr(filterColumnElement, "val", { required: true }).asString(),
        };
      }
    );
  }
}
