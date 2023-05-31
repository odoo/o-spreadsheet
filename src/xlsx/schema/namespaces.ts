// export const NAMESPACE = {
//   styleSheet: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
//   sst: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
//   Relationships: "http://schemas.openxmlformats.org/package/2006/relationships",
//   Types: "http://schemas.openxmlformats.org/package/2006/content-types",
//   worksheet: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
//   workbook: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
//   drawing: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
//   table: "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
//   revision: "http://schemas.microsoft.com/office/spreadsheetml/2014/revision",
//   revision3: "http://schemas.microsoft.com/office/spreadsheetml/2016/revision3",
//   markupCompatibility: "http://schemas.openxmlformats.org/markup-compatibility/2006",
// };
export const NAMESPACE = {
  relationships: {
    uri: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    prefix: "r",
  },
  drawing: {
    uri: "http://schemas.openxmlformats.org/drawingml/2006/main",
    prefix: "a",
  },
  spreadsheetDrawing: {
    uri: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    prefix: "xdr",
  },
  chart: {
    uri: "http://schemas.openxmlformats.org/drawingml/2006/chart",
    prefix: "c",
  },
} as const;
