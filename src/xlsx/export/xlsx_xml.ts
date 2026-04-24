import { XLSXExportXMLFile, XMLAttributes, XMLString } from "../../types/xlsx";
import { escapeXml, xmlEscape } from "../helpers/xml_helpers";

/**
 * Export-only XML helpers: file wrapping, attribute formatting,
 * content-types primitives. The shared template-tag (`escapeXml`),
 * `xmlEscape` and `parseXML` come from `src/xlsx/helpers/xml_helpers.ts`,
 * which import and the clipboard plugin also use.
 */

export { escapeXml, parseXML, xmlEscape } from "../helpers/xml_helpers";

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

export function formatAttributes(attrs: XMLAttributes): XMLString {
  return new XMLString(attrs.map(([key, val]) => `${key}="${xmlEscape(val)}"`).join(" "));
}

export function joinXmlNodes(xmlNodes: XMLString[]): XMLString {
  return new XMLString(xmlNodes.join("\n"));
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
