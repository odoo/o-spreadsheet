import { toCartesian, toXC, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { ClipboardPlugin } from "../../src/plugins/ui_stateful";
import {
  Border,
  Cell,
  CellValue,
  CellValueType,
  EvaluatedCell,
  FormattedValue,
  Merge,
  Style,
  UID,
  Zone,
} from "../../src/types";
import { setSelection } from "./commands_helpers";
import { getPlugin } from "./helpers";

/**
 * Get the active XC
 */
export function getSelectionAnchorCellXc(model: Model): string {
  const { col, row } = model.getters.getSelection().anchor.cell;
  return toXC(col, row);
}

export function getActivePosition(model: Model): string {
  const { col, row } = model.getters.getActivePosition();
  return toXC(col, row);
}

/**
 * Get the cell at the given XC
 */
export function getCell(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): Cell | undefined {
  let { col, row } = toCartesian(xc);
  return model.getters.getCell({ sheetId, col, row });
}

export function getEvaluatedCell(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): EvaluatedCell {
  const { col, row } = toCartesian(xc);
  return model.getters.getEvaluatedCell({ sheetId, col, row });
}

export function getCellError(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): string | undefined {
  const cell = getEvaluatedCell(model, xc, sheetId);
  return cell.type === CellValueType.error ? cell.message : undefined;
}

/**
 * Get the string representation of the content of a cell (the value for formula
 * cell, or the formula, depending on ShowFormula)
 */
export function getCellContent(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): string {
  const { col, row } = toCartesian(xc);
  return model.getters.getCellText(
    { sheetId, col, row },
    { showFormula: model.getters.shouldShowFormulas() }
  );
}

/**
 * Get the string representation of the content of a range of cells
 */
export function getEvaluatedGrid(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const zone = toZone(range);
  const content: string[][] = [];
  for (let row = zone.top; row <= zone.bottom; row++) {
    const rowContent: string[] = [];
    for (let col = zone.left; col <= zone.right; col++) {
      rowContent.push(getCellContent(model, toXC(col, row), sheetId));
    }
    content.push(rowContent);
  }
  return content;
}

export function getEvaluatedCells(
  model: Model,
  range: string,
  sheetId: UID = model.getters.getActiveSheetId()
): EvaluatedCell[][] {
  const zone = toZone(range);
  const content: EvaluatedCell[][] = [];
  for (let row = zone.top; row <= zone.bottom; row++) {
    const rowContent: EvaluatedCell[] = [];
    for (let col = zone.left; col <= zone.right; col++) {
      rowContent.push(model.getters.getEvaluatedCell({ sheetId, col, row }));
    }
    content.push(rowContent);
  }
  return content;
}

/**
 * Get the string representation of the content of a cell, and always formula
 * for formula cells
 */
export function getCellText(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.getters.getCellText({ sheetId, col, row }, { showFormula: true });
}

export function getStyle(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): Style {
  const { col, row } = toCartesian(xc);
  return model.getters.getCellComputedStyle({ sheetId, col, row });
}

export function getDataBarFill(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.getters.getConditionalDataBar({ sheetId, col, row });
}

export function getRangeFormattedValues(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): FormattedValue[] {
  return model.getters.getRangeFormattedValues(model.getters.getRangeFromSheetXC(sheetId, xc));
}

export function getRangeValues(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): (CellValue | undefined)[] {
  return model.getters.getRangeValues(model.getters.getRangeFromSheetXC(sheetId, xc));
}

/**
 * Get the borders at the given XC
 */
export function getBorder(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): Border | null {
  const { col, row } = toCartesian(xc);
  return model.getters.getCellBorder({ sheetId, col, row });
}

/**
 * Get the computed borders at the given XC
 */
export function getComputedBorder(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
): Border | null {
  const { col, row } = toCartesian(xc);
  return model.getters.getCellComputedBorder({ sheetId, col, row });
}

/**
 * Get the list of the merges
 */
export function getMerges(model: Model): Record<number, Merge> {
  const merges = model.getters.getMerges(model.getters.getActiveSheetId());
  return Object.fromEntries(merges.map((merge) => [merge.id, merge]));
}

export function automaticSum(
  model: Model,
  xc: string,
  { anchor }: { anchor?: string } = {},
  sheetId?: UID
) {
  return automaticSumMulti(model, [xc], { anchor }, sheetId);
}

export function automaticSumMulti(
  model: Model,
  xcs: string[],
  { anchor }: { anchor?: string } = {},
  sheetId?: UID
) {
  setSelection(model, xcs, { anchor });
  return model.dispatch("SUM_SELECTION");
}

export function getTable(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.getters.getTable({ sheetId, col, row });
}

export function getCoreTable(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.getters.getCoreTable({ sheetId, col, row });
}

export function getFilter(
  model: Model,
  xc: string,
  sheetId: UID = model.getters.getActiveSheetId()
) {
  const { col, row } = toCartesian(xc);
  return model.getters.getFilter({ sheetId, col, row });
}

export function getClipboardVisibleZones(model: Model): Zone[] {
  const clipboardPlugin = getPlugin(model, ClipboardPlugin);
  return clipboardPlugin["status"] === "visible"
    ? clipboardPlugin["copiedData"]?.["zones"] ?? []
    : [];
}

export function getActiveSheetFullScrollInfo(model: Model) {
  const scrollBarScroll = model.getters.getActiveSheetDOMScrollInfo();
  return {
    ...model.getters.getActiveSheetScrollInfo(),
    scrollbarScrollX: scrollBarScroll.scrollX,
    scrollbarScrollY: scrollBarScroll.scrollY,
  };
}
