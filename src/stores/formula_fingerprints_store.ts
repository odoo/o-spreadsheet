import { AlternatingColorGenerator, RangeImpl, reorderZone, setColorAlpha } from "../helpers";
import { PositionMap } from "../plugins/ui_core_views/cell_evaluation/position_map";
import {
  Cell,
  CellPosition,
  CellValueType,
  Color,
  Command,
  FormulaCell,
  isCoreCommand,
} from "../types/index";
import { SpreadsheetStore } from "./spreadsheet_store";

/**
 * This implements formula "fingerprints" to efficient detect formula patterns and anomalies.
 * A fingerprint is a compact hash representation of a formula's spatial and dependency behavior.
 *
 * This is based on the work of Dan Barowy (Williams College), Emery Berger
 * (UMass Amherst / Microsoft Research), and Benjamin Zorn (Microsoft Research)
 * as detailed in their paper: "ExceLint: Automatically Finding Spreadsheet Formula Errors"
 *
 * Paper: https://dl.acm.org/doi/pdf/10.1145/3276518
 *
 * Fingerprints for formulas are computed using *reference vectors*. Each dependency  gives a
 * reference vector. These vectors collectively represent the formula’s dependencies and content.
 *
 * A reference vector is a 3-dimensional vector. @see ReferenceVector for more details
 * about the vector's components.
 *
 * As an example, the formula `=B1 + Sheet2!B2 + 1` located in A1 produces two reference vectors:
 * - for `B1`:        (dx=1, dy=0, dSheet=0)
 * - for `Sheet2!B2`: (dx=2, dy=0, dSheet=1)
 *
 * The final fingerprint is generated by summing these vectors and hashing the result.
 * Additionally, the formula's normalized representation is included in the hash to capture
 * the formula's literal values and function calls.
 * Each fingerprint is then assigned a color to visually represent the formula's behavior.
 */

/**
 * A 3-dimensional vector capturing a formula’s dependency or content.
 */
type ReferenceVector = {
  /**
   * The relative offset in the X coordinate of the referenced cell.
   * - relative references (B1): coordinates are adjusted based on the formula's position.
   * - absolute references ($B$1): fixed positions are used, based on spreadsheet coordinates.
   */
  dx: number;
  /**
   * The relative offset in the Y coordinate of the referenced cell.
   **/
  dy: number;
  /**
   * The sheet offset of the referenced cell.
   */
  dSheet: number;
};

/**
 * A string that represents the shape of a formula.
 */
type Fingerprint = string;

export class FormulaFingerprintStore extends SpreadsheetStore {
  mutators = ["enable", "disable"] as const;
  private isInvalidated = false;
  private fingerprintColors: Record<Fingerprint, Color> = {
    [DATA_FINGERPRINT]: "#D9D9D9",
  };
  isEnabled: boolean = false;
  colors = new PositionMap<Color>();

  handle(cmd: Command) {
    if (isCoreCommand(cmd) && this.isEnabled) {
      this.isInvalidated = true;
    }
    switch (cmd.type) {
      case "UNDO":
      case "REDO":
      case "ACTIVATE_SHEET":
        if (this.isEnabled) {
          this.isInvalidated = true;
        }
        break;
    }
  }

  finalize() {
    if (this.isInvalidated) {
      this.isInvalidated = false;
      this.computeFingerprints();
    }
  }

  enable() {
    this.isEnabled = true;
    this.computeFingerprints();
  }

  disable() {
    this.isEnabled = false;
    this.colors = new PositionMap();
  }

  private computeFingerprints() {
    this.colors = new PositionMap();
    const fingerprints = new PositionMap<Fingerprint>();
    const allFingerprints = new Set<Fingerprint>();
    const activeSheetId = this.getters.getActiveSheetId();
    const cells = this.getters.getCells(activeSheetId);
    for (const cellId in cells) {
      const fingerprint = this.computeFingerprint(cells[cellId]);
      if (!fingerprint) {
        continue;
      }
      allFingerprints.add(fingerprint);
      const position = this.getters.getCellPosition(cellId);
      fingerprints.set(position, fingerprint);
    }
    this.assignColors(allFingerprints);
    for (const [position, fingerprint] of fingerprints.entries()) {
      const color = this.fingerprintColors[fingerprint];
      this.colors.set(position, color);
      this.colorSpreadZone(position, color);
    }
  }

  private colorSpreadZone(position: CellPosition, fingerprintColor: Color) {
    const spreadZone = this.getters.getSpreadZone(position);
    if (!spreadZone) {
      return;
    }
    const sheetId = position.sheetId;
    for (let row = spreadZone.top; row <= spreadZone.bottom; row++) {
      for (let col = spreadZone.left; col <= spreadZone.right; col++) {
        const spreadPosition = { sheetId, col, row };
        this.colors.set(spreadPosition, fingerprintColor);
      }
    }
  }

  private assignColors(fingerprints: Set<Fingerprint>) {
    const colors = new AlternatingColorGenerator(fingerprints.size);
    Object.keys(this.fingerprintColors).forEach(() => colors.next());
    for (const fingerprint of fingerprints) {
      if (!this.fingerprintColors[fingerprint]) {
        this.fingerprintColors[fingerprint] = setColorAlpha(colors.next(), 0.8);
      }
    }
  }

  private computeFingerprint(cell: Cell): Fingerprint | undefined {
    const position = this.getters.getCellPosition(cell.id);
    if (cell.isFormula) {
      return this.computeFormulaFingerprint(position, cell);
    } else {
      return this.getLiteralFingerprint(position);
    }
  }

  private computeFormulaFingerprint(position: CellPosition, cell: FormulaCell): Fingerprint {
    const dependencies = cell.compiledFormula.dependencies;
    const colCellOffset = position.col;
    const rowCellOffset = position.row;
    const positionSheetIndex = this.getters.getSheetIds().indexOf(position.sheetId);
    // As an optimization, we do not build each reference vector individually
    // to sum them up, but instead we directly add each component to the resulting
    // vector. This is equivalent to summing up all reference vectors.
    const fingerprintVector: ReferenceVector = {
      dx: 0,
      dy: 0,
      dSheet: 0,
    };
    for (const range of dependencies as RangeImpl[]) {
      const zone = range.zone;
      const [left, right] = range.parts;
      const rangeSheetIndex = this.getters.getSheetIds().indexOf(range.sheetId);
      fingerprintVector.dSheet = rangeSheetIndex - positionSheetIndex;

      // in relative mode, we offset the col and row by the cell's position
      // in absolute mode, we offset the col and row relative to the sheet
      const isLeftUnbounded = range.isFullRow && !range.unboundedZone.hasHeader;
      const isTopUnbounded = range.isFullCol && !range.unboundedZone.hasHeader;
      const leftOffset = isLeftUnbounded || left?.colFixed ? 0 : colCellOffset;
      const topOffset = isTopUnbounded || left?.rowFixed ? 0 : rowCellOffset;

      const isRightFixed = (!right && left?.colFixed) || right?.colFixed;
      const isBottomFixed = (!right && left.rowFixed) || right?.rowFixed;
      const isRightUnbounded = range.unboundedZone.right === undefined;
      const isBottomUnbounded = range.unboundedZone.bottom === undefined;
      const rightOffset = isRightUnbounded || isRightFixed ? 0 : colCellOffset;
      const bottomOffset = isBottomUnbounded || isBottomFixed ? 0 : rowCellOffset;

      const referenceZone = reorderZone({
        top: zone.top - topOffset,
        left: zone.left - leftOffset,
        right: zone.right - rightOffset,
        bottom: zone.bottom - bottomOffset,
      });
      for (let dy = referenceZone.top; dy <= referenceZone.bottom; dy++) {
        for (let dx = referenceZone.left; dx <= referenceZone.right; dx++) {
          fingerprintVector.dx += dx;
          fingerprintVector.dy += dy;
        }
      }
    }
    const normalizedFormula = cell.compiledFormula.normalizedFormula;
    return hash(fingerprintVector) + normalizedFormula;
  }

  private getLiteralFingerprint(position: CellPosition): Fingerprint | undefined {
    const evaluatedCell = this.getters.getEvaluatedCell(position);
    switch (evaluatedCell.type) {
      case CellValueType.number:
      case CellValueType.boolean:
        return DATA_FINGERPRINT;
      case CellValueType.text:
      case CellValueType.empty:
      case CellValueType.error:
        return undefined;
    }
  }
}

function hash(vector: ReferenceVector): Fingerprint {
  return Object.entries(vector)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, value]) => value)
    .join(",");
}

const DATA_FINGERPRINT = "DATA_FINGERPRINT";
