import { toCartesian, toXC } from "../../helpers/coordinates";
import { clip } from "../../helpers/misc";
import { recomputeZones } from "../../helpers/recompute_zones";
import { isInside, positionToZone, toZone } from "../../helpers/zones";
import { autofillModifiersRegistry } from "../../registries/autofill_modifiers";
import { autofillRulesRegistry } from "../../registries/autofill_rules";
import {
  AutofillData,
  AutofillModifier,
  AutofillResult,
  GeneratorCell,
  Tooltip,
} from "../../types/autofill";
import { Cell, CellValueType } from "../../types/cells";
import { AutoFillCellCommand, Command, CommandResult, LocalCommand } from "../../types/commands";
import { Getters } from "../../types/getters";
import { Border, DIRECTION, HeaderIndex, UID, Zone } from "../../types/misc";
import { GridRenderingContext } from "../../types/rendering";
import { UIPlugin } from "../ui_plugin";

type AutofillCellData = Omit<AutoFillCellCommand, "type">;

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
    const rule = genCell.rule;
    const { cellData, tooltip } = autofillModifiersRegistry
      .get(rule.type)
      .apply(rule, genCell.data, this.getters, this.direction);
    return {
      cellData,
      tooltip,
      origin: {
        col: genCell.data.col,
        row: genCell.data.row,
      },
    };
  }
}

/**
 * Autofill Plugin
 *
 */
export class AutofillPlugin extends UIPlugin {
  static layers = ["Autofill"] as const;
  static getters = ["getAutofillTooltip"] as const;

  private autofillZone: Zone | undefined;
  private steps: number | undefined;
  private lastCellSelected: { col?: number; row?: number } = {};
  private direction: DIRECTION | undefined;
  private tooltip: Tooltip | undefined;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: LocalCommand): CommandResult {
    switch (cmd.type) {
      case "AUTOFILL_SELECT":
        const sheetId = this.getters.getActiveSheetId();
        this.lastCellSelected.col =
          cmd.col === -1
            ? this.lastCellSelected.col
            : clip(cmd.col, 0, this.getters.getNumberCols(sheetId));
        this.lastCellSelected.row =
          cmd.row === -1
            ? this.lastCellSelected.row
            : clip(cmd.row, 0, this.getters.getNumberRows(sheetId));
        if (this.lastCellSelected.col !== undefined && this.lastCellSelected.row !== undefined) {
          return CommandResult.Success;
        }
        return CommandResult.InvalidAutofillSelection;
    }
    return CommandResult.Success;
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
   *              useful to set it to false when we need to fill the tooltip
   */
  private autofill(apply: boolean) {
    if (!this.autofillZone || !this.steps || this.direction === undefined) {
      this.tooltip = undefined;
      return;
    }
    const source = this.getters.getSelectedZone();
    const target = this.autofillZone;
    const autofillCellsData: AutofillCellData[] = [];

    switch (this.direction) {
      case DIRECTION.DOWN:
        for (let col = source.left; col <= source.right; col++) {
          const xcs: string[] = [];
          for (let row = source.top; row <= source.bottom; row++) {
            xcs.push(toXC(col, row));
          }
          const generator = this.createGenerator(xcs);
          for (let row = target.top; row <= target.bottom; row++) {
            autofillCellsData.push(this.computeNewCell(generator, col, row));
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
            autofillCellsData.push(this.computeNewCell(generator, col, row));
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
            autofillCellsData.push(this.computeNewCell(generator, col, row));
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
            autofillCellsData.push(this.computeNewCell(generator, col, row));
          }
        }
        break;
    }

    if (apply) {
      const bordersZones: Record<string, Zone[]> = {};
      const cfNewRanges: Record<UID, string[]> = {};
      const dvNewZones: Record<UID, Zone[]> = {};
      const sheetId = this.getters.getActiveSheetId();
      for (const data of autofillCellsData) {
        this.collectBordersData(data, bordersZones);
        this.autofillMerge(sheetId, data);
        this.autofillCell(sheetId, data);
        this.collectConditionalFormatsData(sheetId, data, cfNewRanges);
        this.collectDataValidationsData(sheetId, data, dvNewZones);
      }
      this.autofillBorders(sheetId, bordersZones);
      this.autofillConditionalFormats(sheetId, cfNewRanges);
      this.autofillDataValidations(sheetId, dvNewZones);
      this.autofillZone = undefined;
      this.selection.resizeAnchorZone(this.direction, this.steps);
      this.lastCellSelected = {};
      this.direction = undefined;
      this.steps = 0;
      this.tooltip = undefined;
    }
  }

  private collectBordersData(data: AutofillCellData, bordersPositions: Record<string, Zone[]>) {
    const key = JSON.stringify(data.border);
    if (!(key in bordersPositions)) {
      bordersPositions[key] = [];
    }
    bordersPositions[key].push(positionToZone({ col: data.col, row: data.row }));
  }

  private collectConditionalFormatsData(
    sheetId: UID,
    data: AutofillCellData,
    cfNewRanges: Record<UID, string[]>
  ) {
    const { originCol, originRow, col, row } = data;
    const cfsAtOrigin = this.getters.getRulesByCell(sheetId, originCol, originRow);
    const xc = toXC(col, row);
    for (const cf of cfsAtOrigin) {
      if (!(cf.id in cfNewRanges)) {
        cfNewRanges[cf.id] = [];
      }
      cfNewRanges[cf.id].push(xc);
    }
  }

  private collectDataValidationsData(
    sheetId: UID,
    data: AutofillCellData,
    dvNewZones: Record<UID, Zone[]>
  ) {
    const { originCol, originRow, col, row } = data;
    const cellPosition = { sheetId, col: originCol, row: originRow };
    const dvsAtOrigin = this.getters.getValidationRuleForCell(cellPosition);
    if (!dvsAtOrigin) {
      return;
    }
    if (!(dvsAtOrigin.id in dvNewZones)) {
      dvNewZones[dvsAtOrigin.id] = [];
    }
    dvNewZones[dvsAtOrigin.id].push(positionToZone({ col, row }));
  }

  private autofillCell(sheetId: UID, data: AutofillCellData) {
    this.dispatch("UPDATE_CELL", {
      sheetId,
      col: data.col,
      row: data.row,
      content: data.content || "",
      style: data.style || null,
      format: data.format || "",
    });
    // Still usefull in odoo ATM to autofill field sync
    this.dispatch("AUTOFILL_CELL", data);
  }

  private autofillBorders(sheetId: UID, bordersPositions: Record<string, Zone[]>) {
    for (const stringifiedBorder in bordersPositions) {
      const border =
        stringifiedBorder === "undefined" ? undefined : (JSON.parse(stringifiedBorder) as Border);
      this.dispatch("SET_BORDERS_ON_TARGET", {
        sheetId,
        border,
        target: recomputeZones(bordersPositions[stringifiedBorder]),
      });
    }
  }

  private autofillConditionalFormats(sheetId: UID, cfNewRanges: Record<UID, string[]>) {
    for (const cfId in cfNewRanges) {
      const changes = cfNewRanges[cfId];
      const cf = this.getters.getConditionalFormats(sheetId).find((cf) => cf.id === cfId);
      if (!cf) {
        continue;
      }
      const newCfRanges = this.getters.getAdaptedCfRanges(sheetId, cf, changes.map(toZone), []);
      if (newCfRanges) {
        this.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: {
            id: cf.id,
            rule: cf.rule,
            stopIfTrue: cf.stopIfTrue,
          },
          ranges: newCfRanges,
          sheetId,
        });
      }
    }
  }

  private autofillDataValidations(sheetId: UID, dvNewZones: Record<UID, Zone[]>) {
    for (const dvId in dvNewZones) {
      const changes = dvNewZones[dvId];
      const dvOrigin = this.getters.getDataValidationRule(sheetId, dvId);
      if (!dvOrigin) {
        continue;
      }
      const dvRangesXcs = dvOrigin.ranges.map((range) => range.zone);
      const newDvRanges = recomputeZones(dvRangesXcs.concat(changes), []);
      this.dispatch("ADD_DATA_VALIDATION_RULE", {
        rule: dvOrigin,
        ranges: newDvRanges.map((zone) => this.getters.getRangeDataFromZone(sheetId, zone)),
        sheetId,
      });
    }
  }

  /**
   * Select a cell which becomes the last cell of the autofillZone
   */
  private select(col: HeaderIndex, row: HeaderIndex) {
    const source = this.getters.getSelectedZone();
    if (isInside(col, row, source)) {
      this.autofillZone = undefined;
      return;
    }
    this.direction = this.getDirection(col, row);
    switch (this.direction) {
      case DIRECTION.UP:
        this.saveZone(row, source.top - 1, source.left, source.right);
        this.steps = source.top - row;
        break;
      case DIRECTION.DOWN:
        this.saveZone(source.bottom + 1, row, source.left, source.right);
        this.steps = row - source.bottom;
        break;
      case DIRECTION.LEFT:
        this.saveZone(source.top, source.bottom, col, source.left - 1);
        this.steps = source.left - col;
        break;
      case DIRECTION.RIGHT:
        this.saveZone(source.top, source.bottom, source.right + 1, col);
        this.steps = col - source.right;
        break;
    }
    this.autofill(false);
  }

  /**
   * Computes the autofillZone to autofill when the user double click on the
   * autofiller
   */
  private autofillAuto() {
    const activePosition = this.getters.getActivePosition();

    const table = this.getters.getTable(activePosition);
    let autofillRow = table ? table.range.zone.bottom : this.getAutofillAutoLastRow();

    // Stop autofill at the next non-empty cell
    const selection = this.getters.getSelectedZone();
    for (let row = selection.bottom + 1; row <= autofillRow; row++) {
      if (this.getters.getEvaluatedCell({ ...activePosition, row }).type !== CellValueType.empty) {
        autofillRow = row - 1;
        break;
      }
    }

    if (autofillRow > selection.bottom) {
      this.select(activePosition.col, autofillRow);
      this.autofill(true);
    }
  }

  private getAutofillAutoLastRow() {
    const zone = this.getters.getSelectedZone();
    const sheetId = this.getters.getActiveSheetId();
    let col: HeaderIndex = zone.left;
    let row: HeaderIndex = zone.bottom;

    if (col > 0) {
      let leftPosition = { sheetId, col: col - 1, row };
      while (this.getters.getEvaluatedCell(leftPosition).type !== CellValueType.empty) {
        row += 1;
        leftPosition = { sheetId, col: col - 1, row };
      }
    }
    if (row === zone.bottom) {
      col = zone.right;
      if (col <= this.getters.getNumberCols(sheetId)) {
        let rightPosition = { sheetId, col: col + 1, row };
        while (this.getters.getEvaluatedCell(rightPosition).type !== CellValueType.empty) {
          row += 1;
          rightPosition = { sheetId, col: col + 1, row };
        }
      }
    }
    return row - 1;
  }

  /**
   * Generate the next cell
   */
  private computeNewCell(
    generator: AutofillGenerator,
    col: HeaderIndex,
    row: HeaderIndex
  ): AutofillCellData {
    const { cellData, tooltip, origin } = generator.next();
    const { content, style, border, format } = cellData;
    this.tooltip = tooltip;
    return {
      originCol: origin.col,
      originRow: origin.row,
      col,
      row,
      content,
      style,
      border,
      format: format ?? undefined,
    };
  }

  /**
   * Get the rule associated to the current cell
   */
  private getRule(cell: Cell, cells: (Cell | undefined)[]): AutofillModifier | undefined {
    const rules = autofillRulesRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
    const rule = rules.find((rule) => rule.condition(cell, cells));
    return rule && this.direction && rule.generateRule(cell, cells, this.direction);
  }

  /**
   * Create the generator to be able to autofill the next cells.
   */
  private createGenerator(source: string[]): AutofillGenerator {
    const nextCells: GeneratorCell[] = [];

    const cellsData: AutofillData[] = [];
    const sheetId = this.getters.getActiveSheetId();
    for (const xc of source) {
      const { col, row } = toCartesian(xc);
      const cell = this.getters.getCell({ sheetId, col, row });
      cellsData.push({
        col,
        row,
        cell,
        sheetId,
      });
    }
    const cells = cellsData.map((cellData) => cellData.cell);
    for (const cellData of cellsData) {
      let rule: AutofillModifier = { type: "COPY_MODIFIER" };
      if (cellData && cellData.cell) {
        const newRule = this.getRule(cellData.cell, cells);
        rule = newRule || rule;
      }
      const border = this.getters.getCellBorder(cellData) || undefined;
      nextCells.push({
        data: { ...cellData, border },
        rule,
      });
    }
    return new AutofillGenerator(nextCells, this.getters, this.direction!);
  }

  private saveZone(top: HeaderIndex, bottom: HeaderIndex, left: HeaderIndex, right: HeaderIndex) {
    this.autofillZone = { top, bottom, left, right };
  }

  /**
   * Compute the direction of the autofill from the last selected zone and
   * a given cell (col, row)
   */
  private getDirection(col: HeaderIndex, row: HeaderIndex): DIRECTION {
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

  private autofillMerge(sheetId: UID, data: AutofillCellData) {
    const { originCol, originRow, col, row } = data;
    const position = { sheetId, col, row };
    const originPosition = { sheetId, col: originCol, row: originRow };
    if (this.getters.isInMerge(position) && !this.getters.isInMerge(originPosition)) {
      const zone = this.getters.getMerge(position);
      if (zone) {
        this.dispatch("REMOVE_MERGE", {
          sheetId,
          target: [zone],
        });
      }
    }
    const originMerge = this.getters.getMerge(originPosition);
    if (originMerge?.left === originCol && originMerge?.top === originRow) {
      this.dispatch("ADD_MERGE", {
        sheetId,
        target: [
          {
            top: row,
            bottom: row + originMerge.bottom - originMerge.top,
            left: col,
            right: col + originMerge.right - originMerge.left,
          },
        ],
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  drawLayer(renderingContext: GridRenderingContext) {
    if (!this.autofillZone) {
      return;
    }
    const { ctx, thinLineWidth } = renderingContext;
    const { x, y, width, height } = this.getters.getVisibleRect(this.autofillZone);
    if (width > 0 && height > 0) {
      ctx.strokeStyle = "black";
      ctx.lineWidth = thinLineWidth;
      ctx.setLineDash([3]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  }
}
