import { GridModel } from "./grid_model";
import { applyOffset } from "../formulas/index";
import { toXC } from "../helpers";
import { Cell } from "./types";

export function copySelection(this: GridModel, cut: boolean = false) {
  console.warn("implement copySelection for multi selection");
  let { left, right, top, bottom } = this.selection.zones[this.selection.zones.length - 1];
  const cells: (Cell | null)[][] = [];
  for (let i = left; i <= right; i++) {
    const vals: (Cell | null)[] = [];
    cells.push(vals);
    for (let j = top; j <= bottom; j++) {
      const cell = this.getCell(i, j);
      vals.push(cell ? Object.assign({}, cell) : null);
      if (cut) {
        this.deleteCell(toXC(i, j));
      }
    }
  }
  this.clipBoard = {
    zone: { left, right, top, bottom },
    cells
  };
  if (cut) {
    this.notify();
  }
}

export function pasteSelection(this: GridModel) {
  console.warn("implement pasteSelection for multi selection");

  const { zone, cells } = this.clipBoard;
  if (!zone || !cells) {
    return;
  }
  const selection = this.selection.zones[this.selection.zones.length - 1];
  let col = selection.left;
  let row = selection.top;
  let { left, right, top, bottom } = zone;
  const offsetX = col - left;
  const offsetY = row - top;
  for (let i = 0; i <= right - left; i++) {
    for (let j = 0; j <= bottom - top; j++) {
      const xc = toXC(col + i, row + j);
      const originCell = cells[i][j];
      const targetCell = this.getCell(col + i, row + j);
      if (originCell) {
        let content = originCell.content || "";
        if (originCell.type === "formula") {
          content = applyOffset(content, offsetX, offsetY);
        }
        this.addCell(xc, { content, style: originCell.style });
      }
      if (!originCell && targetCell) {
        this.addCell(xc, { content: "" });
      }
    }
  }

  this.evaluateCells();
  this.notify();
}
