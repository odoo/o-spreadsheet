import { XLSXExportFile, XMLAttributes, XMLString } from "../../../types/xlsx";
import { NAMESPACE, RELATIONSHIP_NSR, XLSX_RELATION_TYPE } from "../../constants";
import { XLSXRelsBuilder } from "../xlsx_rels";
import { createXMLFile, escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../xlsx_xml";

/**
 * Phase-2: generate `xl/workbook.xml` from the sheet name + visibility list.
 * Registers an `rId` for each sheet in `xl/_rels/workbook.xml.rels` so the
 * workbook can point at them.
 */
export function serializeWorkbook(
  sheetNames: string[],
  sheetVisibility: boolean[],
  rels: XLSXRelsBuilder
): XLSXExportFile {
  const namespaces: XMLAttributes = [
    ["xmlns", NAMESPACE["workbook"]],
    ["xmlns:r", RELATIONSHIP_NSR],
  ];
  const sheetNodes: XMLString[] = [];
  for (let index = 0; index < sheetNames.length; index++) {
    const attributes: XMLAttributes = [
      ["state", sheetVisibility[index] ? "visible" : "hidden"],
      ["name", sheetNames[index]],
      ["sheetId", index + 1],
      ["r:id", `rId${index + 1}`],
    ];
    sheetNodes.push(escapeXml/*xml*/ `<sheet ${formatAttributes(attributes)} />`);
    rels.add("xl/_rels/workbook.xml.rels", {
      type: XLSX_RELATION_TYPE.sheet,
      target: `worksheets/sheet${index}.xml`,
    });
  }
  const xml = escapeXml/*xml*/ `
    <workbook ${formatAttributes(namespaces)}>
      <sheets>
        ${joinXmlNodes(sheetNodes)}
      </sheets>
    </workbook>
  `;
  return createXMLFile(parseXML(xml), "xl/workbook.xml", "workbook");
}
