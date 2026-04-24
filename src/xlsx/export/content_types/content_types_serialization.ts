import { XLSXExportFile, XLSXExportXMLFile, XMLAttributes, XMLString } from "../../../types/xlsx";
import { CONTENT_TYPES, NAMESPACE } from "../../constants";
import { IMAGE_MIMETYPE_TO_EXTENSION_MAPPING } from "../../conversion";
import {
  createDefaultXMLElement,
  createOverride,
  createXMLFile,
  escapeXml,
  formatAttributes,
  joinXmlNodes,
  parseXML,
} from "../xlsx_xml";

export function serializeContentTypes(files: XLSXExportFile[]): XLSXExportXMLFile {
  const overrideNodes: XMLString[] = [];
  const imageDefaultNodes = Object.entries(IMAGE_MIMETYPE_TO_EXTENSION_MAPPING).map(
    ([mimetype, extension]) => createDefaultXMLElement(extension, mimetype)
  );
  for (const file of files) {
    if ("contentType" in file && file.contentType) {
      overrideNodes.push(createOverride("/" + file.path, CONTENT_TYPES[file.contentType]));
    }
  }
  const relsAttributes: XMLAttributes = [
    ["Extension", "rels"],
    ["ContentType", "application/vnd.openxmlformats-package.relationships+xml"],
  ];
  const xmlAttributes: XMLAttributes = [
    ["Extension", "xml"],
    ["ContentType", "application/xml"],
  ];
  const xml = escapeXml/*xml*/ `
    <Types xmlns="${NAMESPACE["Types"]}">
      ${joinXmlNodes(Object.values(imageDefaultNodes))}
      <Default ${formatAttributes(relsAttributes)} />
      <Default ${formatAttributes(xmlAttributes)} />
      ${joinXmlNodes(overrideNodes)}
    </Types>
  `;
  return createXMLFile(parseXML(xml), "[Content_Types].xml");
}
