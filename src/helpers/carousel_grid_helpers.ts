import { Rect } from "../types/rendering";

export interface GridItemPlacement {
  itemIndex: number;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
}

/**
 * Auto-place items in a grid left-to-right, top-to-bottom.
 * Returns the placement of each item and the total number of rows.
 */
export function computeGridLayout(
  items: readonly { colSpan?: number; rowSpan?: number }[],
  columns: number
): { placements: GridItemPlacement[]; totalRows: number } {
  const cols = Math.max(1, columns);
  const placements: GridItemPlacement[] = [];
  // Occupancy grid: occupied[row][col] = true
  const occupied: boolean[][] = [];

  const isOccupied = (row: number, col: number): boolean => {
    return occupied[row]?.[col] === true;
  };

  const markOccupied = (row: number, col: number, rowSpan: number, colSpan: number) => {
    for (let r = row; r < row + rowSpan; r++) {
      if (!occupied[r]) {
        occupied[r] = new Array(cols).fill(false);
      }
      for (let c = col; c < col + colSpan; c++) {
        occupied[r][c] = true;
      }
    }
  };

  const canPlace = (row: number, col: number, rowSpan: number, colSpan: number): boolean => {
    if (col + colSpan > cols) {
      return false;
    }
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        if (isOccupied(r, c)) {
          return false;
        }
      }
    }
    return true;
  };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const colSpan = Math.min(Math.max(1, item.colSpan ?? 1), cols);
    const rowSpan = Math.max(1, item.rowSpan ?? 1);

    let placed = false;
    for (let row = 0; !placed; row++) {
      for (let col = 0; col <= cols - colSpan; col++) {
        if (canPlace(row, col, rowSpan, colSpan)) {
          markOccupied(row, col, rowSpan, colSpan);
          placements.push({ itemIndex: i, gridCol: col, gridRow: row, colSpan, rowSpan });
          placed = true;
          break;
        }
      }
    }
  }

  const totalRows = occupied.length || 1;
  return { placements, totalRows };
}

/**
 * Convert grid placements to pixel rectangles.
 */
export function computeGridItemRects(
  placements: GridItemPlacement[],
  totalRows: number,
  columns: number,
  contentRect: Rect,
  gap: number
): (Rect & { itemIndex: number })[] {
  const cols = Math.max(1, columns);
  const rows = Math.max(1, totalRows);
  const cellWidth = (contentRect.width - (cols - 1) * gap) / cols;
  const cellHeight = (contentRect.height - (rows - 1) * gap) / rows;

  return placements.map((p) => ({
    itemIndex: p.itemIndex,
    x: contentRect.x + p.gridCol * (cellWidth + gap),
    y: contentRect.y + p.gridRow * (cellHeight + gap),
    width: p.colSpan * cellWidth + (p.colSpan - 1) * gap,
    height: p.rowSpan * cellHeight + (p.rowSpan - 1) * gap,
  }));
}
