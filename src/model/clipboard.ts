import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import { addCell, deleteCell, formatCell, getCell, setValue } from "./core";
import { evaluateCells } from "./evaluation";
import { Cell, GridState } from "./state";

export function cut(state: GridState) {
  cutOrCopy(state, true);
}

export function copy(state: GridState) {
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

/**
 * Paste some content at the active location
 *
 * The paste operation has two possible types of sources:
 * - either the os clipboard (the paste comes from outside)
 * - or internal clipboard: paste come from the spreadsheet itself
 */
export function paste(state: GridState, clipboardContent?: string) {
  if (clipboardContent === undefined) {
    pasteFromModel(state);
  } else {
    pasteFromClipboard(state, clipboardContent);
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

function pasteFromModel(state: GridState) {
  const { zones, cells, shouldCut, status } = state.clipboard;
  if (!zones || !cells) {
    return;
  }
  if (status === "empty") {
    return;
  }
  state.clipboard.status = shouldCut ? "empty" : "invisible";

  const selection = state.selection.zones[state.selection.zones.length - 1];
  let col = selection.left;
  let row = selection.top;

  for (let r = 0; r < cells.length; r++) {
    const rowCells = cells[r];
    for (let c = 0; c < rowCells.length; c++) {
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
        let { style, border } = originCell;
        addCell(state, xc, { content, style, border });
        if (shouldCut) {
          deleteCell(state, originCell.xc, true);
        }
      }
      if (!originCell && targetCell) {
        addCell(state, xc, { content: "" });
      }
    }
  }

  evaluateCells(state);
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
