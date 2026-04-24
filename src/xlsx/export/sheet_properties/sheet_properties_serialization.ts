import { XLSXSheetProperties, XMLString } from "../../../types/xlsx";
import { toXlsxHexColor } from "../../helpers/colors";
import { escapeXml, formatAttributes } from "../xlsx_xml";

export function serializeSheetProperties(props: XLSXSheetProperties | undefined): XMLString {
  if (!props?.tabColor?.rgb) {
    return escapeXml``;
  }
  return escapeXml/*xml*/ `
    <sheetPr>
      <tabColor ${formatAttributes([["rgb", toXlsxHexColor(props.tabColor.rgb)]])} />
    </sheetPr>
  `;
}
