import { DEFAULT_FONT_SIZE } from "../../constants";
import { XLSXExportFile, XLSXStructure, XMLAttributes, XMLString } from "../../types/xlsx";

// -------------------------------------
//            XML HELPERS
// -------------------------------------

export function createXMLFile(
  doc: XMLDocument,
  path: string,
  contentType?: string
): XLSXExportFile {
  return {
    content: new XMLSerializer().serializeToString(doc),
    path,
    contentType,
  };
}

export function xmlEscape(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAttributes(attrs: XMLAttributes): string {
  return attrs.map(([key, val]) => `${key}="${val}"`).join(" ");
}

export function parseXML(xmlString: XMLString): XMLDocument {
  const document = new DOMParser().parseFromString(xmlString, "text/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    const errorString = parserError.innerHTML;
    const lineNumber = parseInt(errorString.split(":")[1], 10);
    const xmlStringArray = xmlString.trim().split("\n");
    const xmlPreview = xmlStringArray
      .slice(Math.max(lineNumber - 3, 0), Math.min(lineNumber + 2, xmlStringArray.length))
      .join("\n");
    throw new Error(`XML string could not be parsed: ${errorString}\n${xmlPreview}`);
  }
  return document;
}

export function getDefaultXLSXStructure(): XLSXStructure {
  return {
    relsFiles: [],
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
    dxfs: [],
  };
}

export function createOverride(partName: string, contentType: string): XMLString {
  return /*xml*/ `
    <Override ContentType="${contentType}" PartName="${partName}" />
  `;
}
