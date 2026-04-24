import { XLSXExportFile, XMLAttributes } from "../../../types/xlsx";
import { NAMESPACE } from "../../constants";
import { createXMLFile, escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../xlsx_xml";

export function serializeSharedStrings(strings: string[]): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["sst"]],
    ["count", strings.length],
    ["uniqueCount", strings.length],
  ];
  const stringNodes = strings.map((string) => {
    if (string.trim() !== string) {
      return escapeXml/*xml*/ `<si><t xml:space="preserve">${string}</t></si>`;
    }
    return escapeXml/*xml*/ `<si><t>${string}</t></si>`;
  });

  const xml = escapeXml/*xml*/ `
    <sst ${formatAttributes(namespaces)}>
      ${joinXmlNodes(stringNodes)}
    </sst>
  `;
  return createXMLFile(parseXML(xml), "xl/sharedStrings.xml", "sharedStrings");
}
