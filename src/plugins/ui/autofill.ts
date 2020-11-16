import { Mode } from "../../model";
import {
  AutofillModifier,
  Cell,
  Command,
  DIRECTION,
  Getters,
  GridRenderingContext,
  LAYERS,
  Zone,
  CancelledReason,
  CommandResult,
  Tooltip,
  GeneratorCell,
  AutofillResult,
} from "../../types/index";
import { union, toCartesian, toXC, isInside, clip } from "../../helpers/index";
import { autofillModifiersRegistry, autofillRulesRegistry } from "../../registries/index";
import { UIPlugin } from "../ui_plugin";

/**
 * This plugin manage the autofill.
 *
 * The way it works is the next one:
 * For each line (row if the direction is left/right, col otherwise), we create
 * a "AutofillGenerator" object which is used to compute the cells to
 * autofill.
 *
 * When we need to autofill a cell, we compute the origin cell in the source.
 *  EX: from A1:A2, autofill A3->A6.
 *      Target | Origin cell
 *        A3   |   A1
 *        A4   |   A2
 *        A5   |   A1
 *        A6   |   A2
 * When we have the origin, we take the associated cell in the AutofillGenerator
 * and we apply the modifier (AutofillModifier) associated to the content of the
 * cell.
 */

/**
 * This class is used to generate the next values to autofill.
 * It's done from a selection (the source) and describe how the next values
 * should be computed.
 */
class AutofillGenerator {
  private readonly cells: GeneratorCell[];
  private readonly getters: Getters;
  private index: number = 0;
  private readonly direction: DIRECTION;

  constructor(cells: GeneratorCell[], getters: Getters, direction: DIRECTION) {
    this.cells = cells;
    this.getters = getters;
    this.direction = direction;
  }

  /**
   * Get the next value to autofill
   */
  next(): AutofillResult {
    const genCell = this.cells[this.index++ % this.cells.length];
    if (!genCell.rule) {
      return {
        cellData: genCell.data,
        tooltip: genCell.data.content ? { props: genCell.data.content } : undefined,
      };
    }
    const rule = genCell.rule;
    const { cellData, tooltip } = autofillModifiersRegistry
      .get(rule.type)
      .apply(rule, genCell.data, this.getters, this.direction);
    return {
      cellData: Object.assign({}, genCell.data, cellData),
      tooltip,
    };
  }
}

/**
 * Autofill Plugin
 *
 */
export class AutofillPlugin extends UIPlugin {
  static layers = [LAYERS.Autofill];
  static getters = ["getAutofillTooltip"];
  static modes: Mode[] = ["normal", "readonly"];

  private autofillZone: Zone | undefined;
  private lastCellSelected: { col?: number; row?: number } = {};
  private direction: DIRECTION | undefined;
  private tooltip: Tooltip | undefined;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: Command): CommandResult {
    switch (cmd.type) {
      case "AUTOFILL_SELECT":
        const sheetId = this.getters.getActiveSheetId();
        this.lastCellSelected.col =
          cmd.col === -1
            ? this.lastCellSelected.col
            : clip(cmd.col, 0, this.getters.getSheet(sheetId).cols.length);
        this.lastCellSelected.row =
          cmd.row === -1
            ? this.lastCellSelected.row
            : clip(cmd.row, 0, this.getters.getSheet(sheetId).rows.length);
        if (this.lastCellSelected.col !== undefined && this.lastCellSelected.row !== undefined) {
          return { status: "SUCCESS" };
        }
        return { status: "CANCELLED", reason: CancelledReason.InvalidAutofillSelection };
      case "AUTOFILL_AUTO":
        const zone = this.getters.getSelectedZone();
        return zone.top === zone.bottom
          ? { status: "SUCCESS" }
          : { status: "CANCELLED", reason: CancelledReason.Unknown };
    }
    return { status: "SUCCESS" };
  }

  handle(cmd: Command) {
    switch (cmd.type) {
      case "AUTOFILL":
        this.autofill(true);
        break;
      case "AUTOFILL_SELECT":
        this.select(cmd.col, cmd.row);
        break;
      case "AUTOFILL_AUTO":
        this.autofillAuto();
        break;
      case "AUTOFILL_CELL":
        const sheetId = this.getters.getActiveSheetId();
        this.dispatch("UPDATE_CELL", {
          sheetId,
          col: cmd.col,
          row: cmd.row,
          style: cmd.style,
          border: cmd.border,
          content: cmd.content,
          format: cmd.format,
        });
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getAutofillTooltip(): Tooltip | undefined {
    return this.tooltip;
  }

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  /**
   * Autofill the autofillZone from the current selection
   * @param apply Flag set to true to apply the autofill in the model. It's
   *              usefull to set it to false when we need to fill the tooltip
   */
  private autofill(apply: boolean) {
    if (!this.autofillZone || this.direction === undefined) {
      this.tooltip = undefined;
      return;
    }
    const source = this.getters.getSelectedZone();
    const target = this.autofillZone;

    switch (this.direction) {
      case DIRECTION.DOWN:
        for (let col = source.left; col <= source.right; col++) {
          const xcs: string[] = [];
          for (let row = source.top; row <= source.bottom; row++) {
            xcs.push(toXC(col, row));
          }
          const generator = this.createGenerator(xcs);
          for (let row = target.top; row <= target.bottom; row++) {
            this.computeNewCell(generator, col, row, apply);
          }
        }
        break;
      case DIRECTION.UP:
        for (let col = source.left; col <= source.right; col++) {
          const xcs: string[] = [];
          for (let row = source.bottom; row >= source.top; row--) {
            xcs.push(toXC(col, row));
          }
          const generator = this.createGenerator(xcs);
          for (let row = target.bottom; row >= target.top; row--) {
            this.computeNewCell(generator, col, row, apply);
          }
        }
        break;
      case DIRECTION.LEFT:
        for (let row = source.top; row <= source.bottom; row++) {
          const xcs: string[] = [];
          for (let col = source.right; col >= source.left; col--) {
            xcs.push(toXC(col, row));
          }
          const generator = this.createGenerator(xcs);
          for (let col = target.right; col >= target.left; col--) {
            this.computeNewCell(generator, col, row, apply);
          }
        }
        break;
      case DIRECTION.RIGHT:
        for (let row = source.top; row <= source.bottom; row++) {
          const xcs: string[] = [];
          for (let col = source.left; col <= source.right; col++) {
            xcs.push(toXC(col, row));
          }
          const generator = this.createGenerator(xcs);
          for (let col = target.left; col <= target.right; col++) {
            this.computeNewCell(generator, col, row, apply);
          }
        }
        break;
    }

    if (apply) {
      const zone = union(this.getters.getSelectedZone(), this.autofillZone);
      this.autofillZone = undefined;
      this.lastCellSelected = {};
      this.direction = undefined;
      this.tooltip = undefined;
      this.dispatch("SET_SELECTION", {
        zones: [zone],
        anchor: [zone.left, zone.top],
      });
    }
  }

  /**
   * Select a cell which becomes the last cell of the autofillZone
   */
  private select(col: number, row: number) {
    const source = this.getters.getSelectedZone();
    if (isInside(col, row, source)) {
      this.autofillZone = undefined;
      return;
    }
    this.direction = this.getDirection(col, row);
    switch (this.direction) {
      case DIRECTION.UP:
        this.saveZone(row, source.top - 1, source.left, source.right);
        break;
      case DIRECTION.DOWN:
        this.saveZone(source.bottom + 1, row, source.left, source.right);
        break;
      case DIRECTION.LEFT:
        this.saveZone(source.top, source.bottom, col, source.left - 1);
        break;
      case DIRECTION.RIGHT:
        this.saveZone(source.top, source.bottom, source.right + 1, col);
        break;
    }
    this.autofill(false);
  }

  /**
   * Computes the autofillZone to autofill when the user double click on the
   * autofiller
   */
  private autofillAuto() {
    const zone = this.getters.getSelectedZone();
    const sheetId = this.getters.getActiveSheetId();
    let col = zone.left;
    let row = zone.bottom;
    if (col > 0) {
      let left = this.getters.getCell(sheetId, col - 1, row);
      while (left && left.content) {
        row += 1;
        left = this.getters.getCell(sheetId, col - 1, row);
      }
    }
    if (row === zone.bottom) {
      col = zone.right;
      if (col <= this.getters.getActiveSheet().cols.length) {
        let right = this.getters.getCell(sheetId, col + 1, row);
        while (right && right.content) {
          row += 1;
          right = this.getters.getCell(sheetId, col + 1, row);
        }
      }
    }
    if (row !== zone.bottom) {
      this.select(zone.left, row - 1);
      this.autofill(true);
    }
  }

  /**
   * Generate the next cell
   */
  private computeNewCell(generator: AutofillGenerator, col: number, row: number, apply: boolean) {
    const { cellData, tooltip } = generator.next();
    const { col: originCol, row: originRow, content, style, border, format } = cellData;
    this.tooltip = tooltip;
    if (apply) {
      this.dispatch("AUTOFILL_CELL", {
        originCol,
        originRow,
        col,
        row,
        content,
        style,
        border,
        format,
      });
    }
  }

  /**
   * Get the rule associated to the current cell
   */
  private getRule(cell: Cell, cells: (Cell | undefined)[]): AutofillModifier | undefined {
    const rules = autofillRulesRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
    const rule = rules.find((rule) => rule.condition(cell, cells));
    return rule && rule.generateRule(cell, cells);
  }

  /**
   * Create the generator to be able to autofill the next cells.
   */
  private createGenerator(source: string[]): AutofillGenerator {
    const nextCells: GeneratorCell[] = [];

    const cellsData: { col: number; row: number; cell?: Cell }[] = [];
    for (let xc of source) {
      const [col, row] = toCartesian(xc);
      const sheetId = this.getters.getActiveSheetId();
      const cell = this.getters.getCell(sheetId, col, row);
      let cellData: { col: number; row: number; cell?: Cell } = {
        col,
        row,
        cell,
      };
      cellsData.push(cellData);
    }
    const cells = cellsData.map((cellData) => cellData.cell);
    for (let cellData of cellsData) {
      let rule: AutofillModifier | undefined;
      if (cellData && cellData.cell) {
        rule = this.getRule(cellData.cell, cells);
      } else {
        rule = { type: "COPY_MODIFIER" };
      }
      const data = {
        row: cellData.row,
        col: cellData.col,
        content: cellData.cell ? cellData.cell.content : undefined,
        style: cellData.cell ? cellData.cell.style : undefined,
        border: cellData.cell ? cellData.cell.border : undefined,
        format: cellData.cell ? cellData.cell.format : undefined,
      };
      nextCells.push({ data, rule });
    }
    return new AutofillGenerator(nextCells, this.getters, this.direction!);
  }

  private saveZone(top: number, bottom: number, left: number, right: number) {
    this.autofillZone = { top, bottom, left, right };
  }

  /**
   * Compute the direction of the autofill from the last selected zone and
   * a given cell (col, row)
   */
  private getDirection(col: number, row: number): DIRECTION {
    const source = this.getters.getSelectedZone();
    const position = {
      up: { number: source.top - row, value: DIRECTION.UP },
      down: { number: row - source.bottom, value: DIRECTION.DOWN },
      left: { number: source.left - col, value: DIRECTION.LEFT },
      right: { number: col - source.right, value: DIRECTION.RIGHT },
    };
    if (
      Object.values(position)
        .map((x) => (x.number > 0 ? 1 : 0) as number)
        .reduce((acc, value) => acc + value) === 1
    ) {
      return Object.values(position).find((x) => (x.number > 0 ? 1 : 0))!.value;
    }

    const first = position.up.number > 0 ? "up" : "down";
    const second = position.left.number > 0 ? "left" : "right";
    return Math.abs(position[first].number) >= Math.abs(position[second].number)
      ? position[first].value
      : position[second].value;
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawGrid(renderingContext: GridRenderingContext) {
    if (!this.autofillZone) {
      return;
    }
    const { viewport, ctx, thinLineWidth } = renderingContext;
    const [x, y, width, height] = this.getters.getRect(this.autofillZone, viewport);
    if (width > 0 && height > 0) {
      ctx.strokeStyle = "black";
      ctx.lineWidth = thinLineWidth;
      ctx.setLineDash([3]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  }
}
