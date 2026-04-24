import { toXC } from "../../../helpers/coordinates";
import { XLSXSheetView, XMLAttributes, XMLString } from "../../../types/xlsx";
import { escapeXml, formatAttributes } from "../xlsx_xml";

export function serializeSheetViews(views: XLSXSheetView[]): XMLString {
  // XLSXWorksheet always has at least one sheetView (construction always creates one).
  const view = views[0];
  const pane = view.pane;
  let splitPanes: XMLString = escapeXml``;
  if (pane && (pane.xSplit || pane.ySplit)) {
    const activeXc = toXC(pane.xSplit, pane.ySplit);
    const xSplit = pane.xSplit ? escapeXml`xSplit="${pane.xSplit}"` : "";
    const ySplit = pane.ySplit ? escapeXml`ySplit="${pane.ySplit}"` : "";
    const topRight = pane.xSplit ? escapeXml`<selection pane="topRight"/>` : "";
    const bottomLeft = pane.ySplit ? escapeXml`<selection pane="bottomLeft"/>` : "";
    const bottomRight =
      pane.xSplit && pane.ySplit ? escapeXml`<selection pane="bottomRight"/>` : "";
    splitPanes = escapeXml/*xml*/ `
      <pane
        ${xSplit}
        ${ySplit}
        topLeftCell="${activeXc}"
        activePane="${pane.xSplit ? (pane.ySplit ? "bottomRight" : "topRight") : "bottomLeft"}"
        state="frozen"/>
        ${topRight}
        ${bottomLeft}
        ${bottomRight}
    `;
  }
  const attrs: XMLAttributes = [
    ["showGridLines", view.showGridLines ? 1 : 0],
    ["workbookViewId", 0],
  ];
  return escapeXml/*xml*/ `
    <sheetViews>
      <sheetView ${formatAttributes(attrs)}>
        ${splitPanes}
      </sheetView>
    </sheetViews>
  `;
}
