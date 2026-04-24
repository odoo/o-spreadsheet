import { XLSXExportFile, XLSXRel, XLSXRelFile, XMLAttributes, XMLString } from "../../types/xlsx";
import { NAMESPACE, XLSX_RELATION_TYPE } from "../constants";
import { createXMLFile, escapeXml, formatAttributes, joinXmlNodes, parseXML } from "./xlsx_xml";

/**
 * Accumulator for OpenXML relationships (.rels files).
 *
 * Serialization-phase concern: features that emit files (charts, images,
 * tables, hyperlinks, ...) register their cross-file pointers here and get
 * back an rId to embed in the referring XML. At the end, `toFiles()` flushes
 * every per-part .rels file plus the root `_rels/.rels`.
 */
export class XLSXRelsBuilder {
  private readonly relsFiles: XLSXRelFile[] = [];

  /**
   * Register a relationship for a given .rels file path, returning the
   * assigned rId (e.g. "rId3"). The path is typically one of:
   *  - "xl/_rels/workbook.xml.rels"                 (workbook-level)
   *  - "xl/worksheets/_rels/sheetN.xml.rels"         (sheet-level)
   *  - "xl/drawings/_rels/drawingN.xml.rels"         (drawing-level)
   *  - "xl/charts/_rels/chartN.xml.rels"             (chart-level)
   */
  add(path: string, rel: Omit<XLSXRel, "id">): string {
    let file = this.relsFiles.find((f) => f.path === path);
    if (!file) {
      file = { path, rels: [] };
      this.relsFiles.push(file);
    }
    const id = `rId${file.rels.length + 1}`;
    file.rels.push({ ...rel, id });
    return id;
  }

  files(): XLSXRelFile[] {
    return this.relsFiles;
  }

  /**
   * Emit every accumulated .rels file. The root `_rels/.rels` is emitted
   * separately by `serializeRootRel()` so the orchestrator can interleave
   * `[Content_Types].xml` between them (which is the file order Excel
   * expects in the zip directory).
   */
  toFiles(): XLSXExportFile[] {
    return this.relsFiles.map((relFile) => {
      const relationNodes: XMLString[] = [];
      for (const rel of relFile.rels) {
        const attributes: XMLAttributes = [
          ["Id", rel.id],
          ["Target", rel.target],
          ["Type", rel.type],
        ];
        if (rel.targetMode) {
          attributes.push(["TargetMode", rel.targetMode]);
        }
        relationNodes.push(escapeXml/*xml*/ `<Relationship ${formatAttributes(attributes)} />`);
      }
      const xml = escapeXml/*xml*/ `
        <Relationships xmlns="${NAMESPACE["Relationships"]}">
          ${joinXmlNodes(relationNodes)}
        </Relationships>
      `;
      return createXMLFile(parseXML(xml), relFile.path);
    });
  }
}

export function serializeRootRel(): XLSXExportFile {
  const attributes: XMLAttributes = [
    ["Id", "rId1"],
    ["Type", XLSX_RELATION_TYPE.document],
    ["Target", "xl/workbook.xml"],
  ];
  const xml = escapeXml/*xml*/ `
    <Relationships xmlns="${NAMESPACE["Relationships"]}">
      <Relationship ${formatAttributes(attributes)} />
    </Relationships>
  `;
  return createXMLFile(parseXML(xml), "_rels/.rels");
}
