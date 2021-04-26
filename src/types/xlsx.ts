import { Border } from ".";
import { Align } from "./misc";

/**
 * This structure covers all the necessary "assets" to generate an XLSX file.
 * Those assets consist of:
 *  - a rel file including metadata specifying how the others files form the final document
 *    (this currently includes sheets, styles, shared content (string))
 *  - a sharedStrings file that regroups all static string values found in the cells
 *  - a style file including all the normalized style elements for cells,
 *    including cell-specific conditional formatting
 *
 * @param rels: a list of files and their specific type/role in the final document
 * @param sharedStrings: regroups all static string values found in the cells.
 * @param fonts: All normalized fonts
 * @param fills: " normalized fills
 * @param borders: " normalized borders
 * @param NumFmts: " normalized number formats
 * @param styles: " combinations of font-fill-border, number format found in the cells
 * @param dxf: " Conditional Formatting of type "CellIsRule"
 */
export interface XLSXStructure {
  rels: XLSXRel[];
  sharedStrings: string[];
  fonts: XLSXFont[];
  fills: XLSXFill[];
  borders: Border[];
  numFmts: string[];
  styles: XLSXStyle[];
  dxf: XLSXDxf[];
}

export type XLSXAttribute = [string, string | number | boolean];

export interface XLSXDxf {
  font?: Partial<XLSXFont>;
  fill?: XLSXFill;
}

export interface XLSXRel {
  id: string;
  type: string;
  target: string;
}

export interface XLSXExportFile {
  path: string;
  content: string;
}

export interface XLSXExport {
  name: string;
  files: XLSXExportFile[];
}

export interface XLSXFont {
  size: number;
  family: number;
  color: string;
  name: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}
export interface XLSXFill {
  reservedAttribute?: string; // will generate a specific specific attribute in XML. If set, fgColor is ignored.
  fgColor?: string;
}

export interface XLSXStyle {
  fontId: number;
  fillId: number;
  borderId: number;
  numFmtId: number;
  verticalAlignment?: string;
  horizontalAlignment?: string;
}

export interface ExtractedStyle {
  font: XLSXFont;
  fill: XLSXFill;
  border: Border;
  numFmt: string | undefined;
  verticalAlignment: Align;
  horizontalAlignment: Align;
}
