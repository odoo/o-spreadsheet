import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import {
  addCell,
  deleteCell,
  formatCell,
  getCell,
  selectCell,
  setValue,
  activateCell
} from "./core";
import { evaluateCells } from "./evaluation";
import { updateSelection } from "./selection";
import { Cell, GridState, NewCell } from "./state";

export function cut(state: GridState) {
  cutOrCopy(state, true);
}

interface CopyOptions {
  onlyFormat?: boolean;
}

export function copy(state: GridState, options: CopyOptions = {}) {
  if (options.onlyFormat) {
    state.isCopyingFormat = true;
  }
  cutOrCopy(state, false);
}

function cutOrCopy(state: GridState, cut: boolean) {
  const zones = state.selection.zones;
  const tops = new Set(zones.map(z => z.top));
  const bottoms = new Set(zones.map(z => z.bottom));
  const areZonesCompatible = tops.size === 1 && bottoms.size === 1;
  let clippedZones = areZonesCompatible ? zones : [zones[zones.length - 1]];

  clippedZones = clippedZones.map(z => Object.assign({}, z));

  const cells: (Cell | null)[][] = [];
  let { top, bottom } = clippedZones[0];
  for (let r = top; r <= bottom; r++) {
    const row: (Cell | null)[] = [];
    cells.push(row);
    for (let zone of clippedZones) {
      let { left, right } = zone;
      for (let c = left; c <= right; c++) {
        const cell = getCell(state, c, r);
        row.push(cell ? Object.assign({}, cell) : null);
      }
    }
  }

  state.clipboard.status = "visible";
  state.clipboard.shouldCut = cut;
  state.clipboard.zones = clippedZones;
  state.clipboard.cells = cells;
}

interface PasteOptions {
  clipboardContent?: string;
  onlyFormat?: boolean;
}

/**
 * Paste some content at the active location
 *
 * The paste operation has two possible types of sources:
 * - either the os clipboard (the paste comes from outside)
 * - or internal clipboard: paste come from the spreadsheet itself. In that
 *   case, the paste operation should be called with the content of the
 *   clipboard in the clipboardContent option
 *
 * Return false if the paste operation was not allowed.
 */
export function paste(state: GridState, options: PasteOptions = {}): boolean {
  state.isCopyingFormat = false;
  if (options.clipboardContent === undefined) {
    return pasteFromModel(state, options);
  } else {
    pasteFromClipboard(state, options.clipboardContent);
    return true;
  }
}

function pasteFromClipboard(state: GridState, content: string) {
  state.clipboard.status = "invisible";
  const values = content
    .replace(/\r/g, "")
    .split("\n")
    .map(vals => vals.split("\t"));
  const { activeCol, activeRow } = state;
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const xc = toXC(activeCol + j, activeRow + i);
      setValue(state, xc, values[i][j]);
    }
  }
}

/**
 * Return false if the paste operation was not allowed
 */
function pasteFromModel(state: GridState, options: PasteOptions): boolean {
  const { zones, cells, shouldCut, status } = state.clipboard;
  if (!zones || !cells) {
    return true;
  }
  if (status === "empty") {
    return true;
  }
  state.clipboard.status = shouldCut ? "empty" : "invisible";

  const clippedHeight = cells.length;
  const clippedWidth = cells[0].length;
  if (state.selection.zones.length > 1) {
    if (clippedWidth > 1 || clippedHeight > 1) {
      // cannot paste if we have a clipped zone larger than a cell and multiple
      // zones selected
      return false;
    }
    for (let zone of state.selection.zones) {
      for (let i = zone.left; i <= zone.right; i++) {
        for (let j = zone.top; j <= zone.bottom; j++) {
          pasteZone(i, j);
        }
      }
    }
    return true;
  }
  const selection = state.selection.zones[state.selection.zones.length - 1];
  let col = selection.left;
  let row = selection.top;
  const repX = Math.max(1, Math.floor((selection.right + 1 - selection.left) / clippedWidth));
  const repY = Math.max(1, Math.floor((selection.bottom + 1 - selection.top) / clippedHeight));
  for (let x = 0; x < repX; x++) {
    for (let y = 0; y < repY; y++) {
      pasteZone(col + x * clippedWidth, row + y * clippedHeight);
    }
  }
  function pasteZone(col: number, row: number) {
    for (let r = 0; r < clippedHeight; r++) {
      const rowCells = cells![r];
      for (let c = 0; c < clippedWidth; c++) {
        const xc = toXC(col + c, row + r);
        const originCell = rowCells[c];
        const targetCell = getCell(state, col + c, row + r);
        if (originCell) {
          let content = originCell.content || "";
          if (originCell.type === "formula") {
            const offsetX = col + c - originCell.col;
            const offsetY = row + r - originCell.row;
            content = applyOffset(content, offsetX, offsetY);
          }
          let newCell: NewCell = { style: originCell.style, border: originCell.border };
          if (options.onlyFormat) {
            newCell.content = targetCell ? targetCell.content : "";
          } else {
            newCell.content = content;
          }

          addCell(state, xc, newCell);
          if (shouldCut) {
            deleteCell(state, originCell.xc, true);
          }
        }
        if (!originCell && targetCell) {
          addCell(state, xc, { content: "" });
        }
      }
    }
  }

  evaluateCells(state);

  if (clippedHeight > 1 || clippedWidth > 1) {
    const anchor = Object.assign({}, state.selection.anchor);
    selectCell(state, col, row);
    updateSelection(state, col + repX * clippedWidth - 1, row + repY * clippedHeight - 1);
    const newCol = clip(anchor.col, col, col + repX * clippedWidth - 1);
    const newRow = clip(anchor.row, row, row + repY * clippedHeight - 1);
    state.selection.anchor.col = newCol;
    state.selection.anchor.row = newRow;
    activateCell(state, newCol, newRow);
  }
  return true;
}

function clip(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}
/**
 * Format the current clipboard to a string suitable for being pasted in other
 * programs.
 *
 * - add a tab character between each concecutive cells
 * - add a newline character between each line
 */
export function getClipboardContent(state: GridState): string {
  if (!state.clipboard.cells) {
    return "";
  }
  return state.clipboard.cells
    .map(cells => {
      return cells.map(c => (c ? formatCell(state, c) : "")).join("\t");
    })
    .join("\n");
}
