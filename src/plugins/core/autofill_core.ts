import { deepCopy, positionToZone, recomputeZones, toXC, toZone } from "../../helpers";
import { createAutofillGenerator } from "../../helpers/autofill";
import {
  Border,
  CellPosition,
  CommandResult,
  CoreCommand,
  GeneratorCell,
  UID,
  Zone,
} from "../../types";
import { DIRECTION } from "../../types/misc";
import { CorePlugin } from "../core_plugin";

export class AutofillCorePlugin extends CorePlugin {
  static getters = [] as const;

  allowDispatch(command: CoreCommand): CommandResult | CommandResult[] {
    switch (command.type) {
      case "AUTOFILL_CELLS": {
        if (command.rules.length === 0) {
          return CommandResult.NotEnoughElements;
        }
        return CommandResult.Success;
      }
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "AUTOFILL_CELLS": {
        this.autofill(cmd.direction, deepCopy(cmd.rules), cmd.sheetId, cmd.targetZone);
        break;
      }
    }
  }

  private autofill(
    direction: DIRECTION,
    generatorCells: GeneratorCell[],
    sheetId: string,
    target: Zone
  ) {
    // console.log(target);
    // console.log(generatorCells);
    const generator = createAutofillGenerator(
      this.getters,
      sheetId,
      target,
      direction,
      generatorCells
    );

    const bordersZones: Record<string, Zone[]> = {};
    const cfNewRanges: Record<UID, string[]> = {};
    const dvNewZones: Record<UID, Zone[]> = {};

    for (const { position, content, origin } of generator) {
      const cell = this.getters.getCell(origin);
      this.dispatch("UPDATE_CELL", {
        ...position,
        content,
        style: cell?.style || null,
        format: cell?.format || "",
      });
      this.collectBordersData(position, origin, bordersZones);
      this.collectConditionalFormatsData(position, origin, cfNewRanges);
      this.collectDataValidationsData(position, origin, dvNewZones);
      this.autofillMerge(position, origin);
    }
    this.autofillBorders(sheetId, bordersZones);
    this.autofillConditionalFormats(sheetId, cfNewRanges);
    this.autofillDataValidations(sheetId, dvNewZones);
  }

  private collectBordersData(
    target: CellPosition,
    origin: CellPosition,
    bordersPositions: Record<string, Zone[]>
  ) {
    const border = this.getters.getCellBorder(origin);
    const key = JSON.stringify(border);
    if (!(key in bordersPositions)) {
      bordersPositions[key] = [];
    }
    bordersPositions[key].push(positionToZone(target));
  }
  private collectConditionalFormatsData(
    target: CellPosition,
    origin: CellPosition,
    cfNewRanges: Record<UID, string[]>
  ) {
    const cfsAtOrigin = this.getters.getRulesByCell(origin.sheetId, origin.col, origin.row);
    const xc = toXC(target.col, target.row);
    for (const cf of cfsAtOrigin) {
      if (!(cf.id in cfNewRanges)) {
        cfNewRanges[cf.id] = [];
      }
      cfNewRanges[cf.id].push(xc);
    }
  }
  private collectDataValidationsData(
    target: CellPosition,
    origin: CellPosition,
    dvNewZones: Record<UID, Zone[]>
  ) {
    const dvsAtOrigin = this.getters.getValidationRuleForCell(origin);
    if (!dvsAtOrigin) {
      return;
    }
    if (!(dvsAtOrigin.id in dvNewZones)) {
      dvNewZones[dvsAtOrigin.id] = [];
    }
    dvNewZones[dvsAtOrigin.id].push(positionToZone(target));
  }
  private autofillMerge(target: CellPosition, origin: CellPosition) {
    if (this.getters.isInMerge(target) && !this.getters.isInMerge(origin)) {
      const zone = this.getters.getMerge(target);
      if (zone) {
        this.dispatch("REMOVE_MERGE", {
          sheetId: origin.sheetId,
          target: [zone],
        });
      }
    }
    const { col: originCol, row: originRow } = origin;
    const originMerge = this.getters.getMerge(origin);
    if (originMerge?.left === originCol && originMerge?.top === originRow) {
      this.dispatch("ADD_MERGE", {
        sheetId: target.sheetId,
        target: [
          {
            top: target.row,
            bottom: target.row + originMerge.bottom - originMerge.top,
            left: target.col,
            right: target.col + originMerge.right - originMerge.left,
          },
        ],
      });
    }
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
}
