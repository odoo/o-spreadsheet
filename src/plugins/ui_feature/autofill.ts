import { createAutofillGenerator, iterateAutofillPositions } from "../../helpers/autofill";
import { clip, getZoneArea, isInside } from "../../helpers/index";
import { autofillModifiersRegistry } from "../../registries/autofill_modifiers";
import { autofillRulesRegistry } from "../../registries/autofill_rules";
import {
  AutofillModifier,
  Cell,
  CellPosition,
  CellValueType,
  Command,
  CommandResult,
  DIRECTION,
  GeneratorCell,
  GridRenderingContext,
  HeaderIndex,
  LocalCommand,
  Tooltip,
  Zone,
} from "../../types/index";

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

    const sheetId = this.getters.getActiveSheetId();
    const generatorCells: GeneratorCell[] = [];
    switch (this.direction) {
      case DIRECTION.DOWN:
      case DIRECTION.UP:
        for (let col = source.left; col <= source.right; col++) {
          const positionsIterator = iterateAutofillPositions(
            sheetId,
            { ...source, left: col, right: col },
            this.direction
          );
          generatorCells.push(...this.getGeneratorCells([...positionsIterator]));
        }
        break;
      case DIRECTION.LEFT:
      case DIRECTION.RIGHT:
        for (let row = source.top; row <= source.bottom; row++) {
          const positionsIterator = iterateAutofillPositions(
            sheetId,
            { ...source, top: row, bottom: row },
            this.direction
          );
          generatorCells.push(...this.getGeneratorCells([...positionsIterator]));
        }
        break;
    }
    this.tooltip = this.getTooltip(generatorCells);

    if (apply) {
      const noOp = { type: "NO_OP_MODIFIER" } as const;

      // choose what would result in the smaller revision size
      // The size is either linear to the number of target cells (fullUi)
      // or linear to the number of target cells (coreG)
      const fullUi = getZoneArea(this.autofillZone) < getZoneArea(source);
      const coreG = generatorCells.map((g) => {
        if (autofillModifiersRegistry.get(g.rule.type).core) {
          return g;
        }
        return { ...g, rule: noOp };
      });
      const nonCoreG = generatorCells.map((g) => {
        if (fullUi || !autofillModifiersRegistry.get(g.rule.type).core) {
          return g;
        }
        return { ...g, rule: noOp };
      });

      this.dispatch("AUTOFILL_CELLS", {
        sheetId,
        targetZone: this.autofillZone,
        rules: fullUi ? [] : coreG,
        direction: this.direction,
      });
      const generator = createAutofillGenerator(
        this.getters,
        sheetId,
        this.autofillZone,
        this.direction,
        nonCoreG
      );
      for (const { position, content, rule } of generator) {
        if (rule.type !== "NO_OP_MODIFIER") {
          this.dispatch("UPDATE_CELL", {
            ...position,
            content,
          });
        }
      }
      this.autofillZone = undefined;
      this.selection.resizeAnchorZone(this.direction, this.steps);
      this.lastCellSelected = {};
      this.direction = undefined;
      this.steps = 0;
      this.tooltip = undefined;
    }
  }

  private getTooltip(generatorCells: GeneratorCell[]) {
    if (!this.autofillZone || !this.direction || generatorCells.length === 0) {
      return;
    }
    const generator = createAutofillGenerator(
      this.getters,
      this.getters.getActiveSheetId(),
      this.autofillZone,
      this.direction,
      generatorCells
    );
    let lastContent = "";
    let lastRule: AutofillModifier | undefined;
    let lastOrigin: CellPosition | undefined;
    for (const { content, rule, origin } of generator) {
      lastContent = content;
      lastRule = rule;
      lastOrigin = origin;
    }
    if (!lastRule || !lastOrigin) {
      return;
    }
    const originCell = this.getters.getCell(lastOrigin);
    if (!originCell) {
      return;
    }
    return autofillModifiersRegistry
      .get(lastRule.type)
      .tooltip(this.getters, lastContent, lastRule, originCell, this.direction);
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
   * Get the rule associated to the current cell
   */
  private getRule(cell: Cell, cells: (Cell | undefined)[]): AutofillModifier | undefined {
    const rules = autofillRulesRegistry.getAll().sort((a, b) => a.sequence - b.sequence);
    const rule = rules.find((rule) => rule.condition(cell, cells));
    return rule && this.direction && rule.generateRule(this.getters, cell, cells, this.direction);
  }

  private getGeneratorCells(originPositions: CellPosition[]): GeneratorCell[] {
    const nextCells: GeneratorCell[] = [];

    const cells = originPositions.map((position) => this.getters.getCell(position));
    for (let i = 0; i < originPositions.length; i++) {
      let rule: AutofillModifier = { type: "COPY_MODIFIER" };
      const cell = cells[i];
      const position = originPositions[i];
      if (cell) {
        const newRule = this.getRule(cell, cells);
        rule = newRule || rule;
      }
      nextCells.push({
        originContent: cell?.content ?? "",
        origin: position,
        rule,
      });
    }
    return nextCells;
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
