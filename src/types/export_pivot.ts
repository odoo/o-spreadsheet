interface PivotTable {
  applyNumberFormats: boolean;
  applyBorderFormats: boolean;
  applyFontFormats: boolean;
  applyPatternFormats: boolean;
  applyAlignmentFormats: boolean;
  applyWidthHeightFormats: boolean;
  dataCaption: string;
  updatedVersion: number;
  minRefreshableVersion: number;
  useAutoFormatting: number;
  itemPrintTitles: number;
  createdVersion: number;
  indent: number;
  outline: number;
  outlineData: number;

  location: {
    ref: string; // "H4:H5"
    firstHeaderRow: number;
    firstDataRow: number;
    firstDataCol: number;
  };
  pivotFields: Array<PivotField>;
  rowItems: Array<PivotTableItem>;
  colItems: Array<PivotTableItem>;
  dataFields: Array<PivotDataFields>;
  tableStyle: {
    name: string;
    showRowHeaders: "number";
    showColHeaders: "number";
    showRowStripes: "number";
    showColStripes: "number";
  };
}

interface PivotDataFields {
  name: string;
  fld: number;
  subtotal: "average" | ""; // VSC I don't know the other subtotals
  baseField: number;
  baseItem: number;
  numFmtId: number;
}

interface PivotField {
  dataField: number;
  numFmtId: number;
  outline: number;
  subtotalTop: number;
  showAll: number;
  measureFilter: number;
  sortType: "manual" | ""; // VSC: I don't know the other types of sort types
}

interface PivotTableItem {
  t: string;
}
