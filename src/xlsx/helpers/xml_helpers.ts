import { DEFAULT_FONT_SIZE } from "../../constants";
import { concat } from "../../helpers";
import {
  XLSXExportFile,
  XLSXStructure,
  XMLAttributes,
  XMLAttributeValue,
  XMLString,
} from "../../types/xlsx";

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

function xmlEscape(str: XMLAttributeValue): string {
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

export function parseXML(xmlString: XMLString): XMLDocument {
  const document = new DOMParser().parseFromString(xmlString.toString(), "text/xml");
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
 * Removes the escaped namespace of all the xml tags in the string.
 *
 * Eg. : "NAMESPACEnsNAMESPACEtest a" => "test a"
 */
export function removeTagEscapedNamespaces(tag: string): string {
  return tag.replace(/NAMESPACE.*NAMESPACE(.*)/, "$1");
}

/**
 * Encase the namespaces in the element's tags with NAMESPACE string
 *
 * e.g. <x:foo> becomes <NAMESPACExNAMESPACEFoo>
 *
 * That's useful because namespaces aren't supported by the HTML specification, so it's arbitrary whether a HTML parser/querySelector
 * implementation will support namespaces in the tags or not.
 */
export function escapeTagNamespaces(str: string): string {
  return str.replace(
    /(<\/?)([a-zA-Z0-9]+):([a-zA-Z0-9]+)/g,
    "$1" + "NAMESPACE" + "$2" + "NAMESPACE" + "$3"
  );
}

export function escapeQueryNameSpaces(query: string): string {
  return query.replace(/([a-zA-Z0-9]+):([a-zA-Z0-9]+)/g, "NAMESPACE" + "$1" + "NAMESPACE" + "$2");
}
