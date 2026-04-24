import { XLSXExportFile } from "../../../types/xlsx";
import { ARRAY_FORMULA_URI } from "../../constants";
import { createXMLFile, escapeXml, parseXML } from "../xlsx_xml";

/**
 * `xl/metadata.xml` — dynamic-array metadata used by Excel to recognize that
 * all our formulas are array formulas with dynamic spilling. Currently a
 * static blob; if/when we support more metadata types this becomes dynamic.
 */
export function serializeMetadata(): XLSXExportFile {
  const xml = escapeXml/*xml*/ `
    <metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray">
        <metadataTypes count="1">
            <metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1"
                pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1"
                clearComments="1" assign="1" coerce="1" cellMeta="1" />
        </metadataTypes>
        <futureMetadata name="XLDAPR" count="1">
            <bk>
                <extLst>
                    <ext uri="{${ARRAY_FORMULA_URI}}">
                        <xda:dynamicArrayProperties fDynamic="1" fCollapsed="0" />
                    </ext>
                </extLst>
            </bk>
        </futureMetadata>
        <cellMetadata count="1">
            <bk>
                <rc t="1" v="0" />
            </bk>
        </cellMetadata>
    </metadata>
  `;
  return createXMLFile(parseXML(xml), "xl/metadata.xml", "metadata");
}
