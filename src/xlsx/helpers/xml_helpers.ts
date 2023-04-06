import { DEFAULT_FONT_SIZE } from "../../constants";
import { concat } from "../../helpers";
import { XLSXStructure, XMLAttributes, XMLAttributeValue, XMLString } from "../../types/xlsx";
import { XLSXExportXMLFile } from "./../../types/xlsx";

// -------------------------------------
//            XML HELPERS
// -------------------------------------

export function createXMLFile(
  doc: XMLDocument,
  path: string,
  contentType?: string
): XLSXExportXMLFile {
  return {
    content: new XMLSerializer().serializeToString(doc),
    path,
    contentType,
  };
}

export function xmlEscape(str: XMLAttributeValue): string {
  return String(str)
    .replace(/\&/g, "&amp;")
    .replace(/\</g, "&lt;")
    .replace(/\>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/\'/g, "&apos;");
}

export function formatAttributes(attrs: XMLAttributes): XMLString {
  return new XMLString(attrs.map(([key, val]) => `${key}="${xmlEscape(val)}"`).join(" "));
}

export function parseXML(
  xmlString: XMLString,
  mimeType: DOMParserSupportedType = "text/xml"
): XMLDocument {
  const document = new DOMParser().parseFromString(xmlString.toString(), mimeType);
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    const errorString = parserError.innerHTML;
    const lineNumber = parseInt(errorString.split(":")[0], 10);
    const xmlStringArray = xmlString.toString().trim().split("\n");
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
        alignment: { vertical: "center" },
      },
    ],
    fonts: [
      {
        size: DEFAULT_FONT_SIZE,
        family: 2,
        color: { rgb: "000000" },
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
  return escapeXml/*xml*/ `
    <Override ContentType="${contentType}" PartName="${partName}" />
  `;
}

export function createDefaultXMLElement(extension: string, contentType: string): XMLString {
  return escapeXml/*xml*/ `
    <Default Extension="${extension}" ContentType="${contentType}" />
  `;
}

export function joinXmlNodes(xmlNodes: XMLString[]): XMLString {
  return new XMLString(xmlNodes.join("\n"));
}

/**
 * Escape interpolated values except if the value is already
 * a properly escaped XML string.
 *
 * ```
 * escapeXml`<t>${"This will be escaped"}</t>`
 * ```
 */
export function escapeXml(strings: TemplateStringsArray, ...expressions): XMLString {
  let str = [strings[0]];
  for (let i = 0; i < expressions.length; i++) {
    const value = expressions[i] instanceof XMLString ? expressions[i] : xmlEscape(expressions[i]);
    str.push(value + strings[i + 1]);
  }
  return new XMLString(concat(str));
}

/**
 * Removes the namespace of all the xml tags in the string.
 *
 * Eg. : "ns:test a" => "test a"
 */
export function removeNamespaces(query: string): string {
  return query.replace(/[a-z0-9]+:(?=[a-z0-9]+)/gi, "");
}

/**
 * Escape the namespace's colons of all the xml tags in the string.
 *
 * Eg. : "ns:test a" => "ns\\:test a"
 */
export function escapeNamespaces(query: string): string {
  return query.replace(/([a-z0-9]+):(?=[a-z0-9]+)/gi, "$1\\:");
}

/**
 * Return true if the querySelector ignores the namespaces when searching for a tag in the DOM.
 *
 * Should return true if it's running on a browser, and false if it's running on jest (jsdom).
 */
export function areNamespaceIgnoredByQuerySelector() {
  const doc = new DOMParser().parseFromString("<t:test xmlns:t='a'/>", "text/xml");
  return doc.querySelector("test") !== null;
}
