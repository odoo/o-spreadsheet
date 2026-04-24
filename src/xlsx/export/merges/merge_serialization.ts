import { XMLString } from "../../../types/xlsx";
import { escapeXml, joinXmlNodes } from "../xlsx_xml";

export function serializeMerges(merges: string[]): XMLString {
  if (!merges.length) {
    return escapeXml``;
  }
  const nodes = merges.map((merge) => escapeXml/*xml*/ `<mergeCell ref="${merge}" />`);
  return escapeXml/*xml*/ `
    <mergeCells count="${merges.length}">
      ${joinXmlNodes(nodes)}
    </mergeCells>
  `;
}
