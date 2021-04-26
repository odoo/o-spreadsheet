import { DEFAULT_FONT_SIZE } from "../constants";
import { XLSXAttribute, XLSXExportFile, XLSXStructure } from "../types/xlsx";

// -------------------------------------
//            XML HELPERS
// -------------------------------------
/**
 * Will add a new HTML node do the given parent node *parent* with
 * given attributes and insert a value inside if provided.
 *
 * @returns the HTML node created
 */
export function pushXMLNode(
  doc: XMLDocument,
  parent: XMLDocument | HTMLElement,
  tag: string,
  attributes: XLSXAttribute[],
  content?: string
): HTMLElement {
  const elt = doc.createElement(tag);
  for (let [key, value] of attributes) {
    elt.setAttribute(key, value);
  }
  if (content) {
    elt.appendChild(doc.createTextNode(content));
  }
  parent.appendChild(elt);
  return elt;
}

export function createXMLFile(doc: XMLDocument, path: string): XLSXExportFile {
  return {
    content: new XMLSerializer().serializeToString(doc),
    path,
  };
}

export function getDefaultXLSXStructure(): XLSXStructure {
  return {
    rels: [],
    sharedStrings: [],
    // default Values that will always be part of the style sheet
    styles: [
      {
        fontId: 0,
        fillId: 0,
        numFmtId: 0,
        borderId: 0,
        verticalAlignment: "center",
      },
    ],
    fonts: [
      {
        size: DEFAULT_FONT_SIZE,
        family: 2,
        color: "000000",
        name: "Calibri",
      },
    ],
    fills: [{ reservedAttribute: "none" }, { reservedAttribute: "gray125" }],
    borders: [{}],
    numFmts: [],
    dxf: [],
  };
}

export function getNewDoc(): XMLDocument {
  return document.implementation.createDocument("", "", null);
}

export function createOverride(
  doc: XMLDocument,
  parent: HTMLElement,
  partName: string,
  contentType: string
): HTMLElement {
  const tag = pushXMLNode(doc, parent, "Override", [
    ["PartName", partName],
    ["ContentType", contentType],
  ]);
  return tag;
}

export function createDefault(
  doc: XMLDocument,
  parent: HTMLElement,
  extension: string,
  contentType: string
): HTMLElement {
  const tag = pushXMLNode(doc, parent, "Default", [
    ["Extension", extension],
    ["ContentType", contentType],
  ]);
  return tag;
}
