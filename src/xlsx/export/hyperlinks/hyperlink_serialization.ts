import { XLSXHyperLink, XMLAttributes, XMLString } from "../../../types/xlsx";
import { XLSX_RELATION_TYPE } from "../../constants";
import { XLSXRelsBuilder } from "../xlsx_rels";
import { escapeXml, formatAttributes, joinXmlNodes } from "../xlsx_xml";

/**
 * Serialize the `<hyperlinks>` block for a sheet. External (URL) hyperlinks
 * are registered in `xl/worksheets/_rels/sheetN.xml.rels` and referenced by
 * the emitted `r:id`. Internal (sheet-location) hyperlinks are inlined.
 */
export function serializeHyperlinks(
  links: XLSXHyperLink[],
  sheetIndex: number,
  rels: XLSXRelsBuilder
): XMLString {
  if (!links.length) {
    return escapeXml``;
  }
  const linkNodes: XMLString[] = [];
  for (const link of links) {
    if (link.location) {
      const attrs: XMLAttributes = [
        ["display", link.display ?? ""],
        ["location", link.location],
        ["ref", link.xc],
      ];
      linkNodes.push(escapeXml/*xml*/ `<hyperlink ${formatAttributes(attrs)}/>`);
    } else if (link.relTarget) {
      const relId = rels.add(`xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`, {
        target: link.relTarget,
        type: XLSX_RELATION_TYPE.hyperlink,
        targetMode: "External",
      });
      const attrs: XMLAttributes = [
        ["r:id", relId],
        ["ref", link.xc],
      ];
      linkNodes.push(escapeXml/*xml*/ `<hyperlink ${formatAttributes(attrs)}/>`);
    }
  }
  if (!linkNodes.length) {
    return escapeXml``;
  }
  return escapeXml/*xml*/ `
    <hyperlinks>
      ${joinXmlNodes(linkNodes)}
    </hyperlinks>
  `;
}
