import { deepCopy } from "../../helpers";
import { Command, Getters } from "../../types";

export const genericRepeatsTransforms = [
  repeatSheetDependantCommand,
  repeatTargetDependantCommand,
  repeatPositionDependantCommand,
  repeatRangeDependantCommand,
];

export function repeatSheetDependantCommand<T extends Command>(getters: Getters, command: T): T {
  if (!("sheetId" in command)) return command;

  return { ...deepCopy(command), sheetId: getters.getActiveSheetId() };
}

export function repeatTargetDependantCommand<T extends Command>(getters: Getters, command: T): T {
  if (!("target" in command) || !Array.isArray(command.target)) return command;

  return {
    ...deepCopy(command),
    target: getters.getSelectedZones(),
  };
}

export function repeatZoneDependantCommand<T extends Command>(getters: Getters, command: T): T {
  if (!("zone" in command)) return command;

  return {
    ...deepCopy(command),
    zone: getters.getSelectedZone(),
  };
}

export function repeatPositionDependantCommand<T extends Command>(getters: Getters, command: T): T {
  if (!("row" in command) || !("col" in command)) return command;

  const { col, row } = getters.getActivePosition();
  return { ...deepCopy(command), col, row };
}

export function repeatRangeDependantCommand<T extends Command>(getters: Getters, command: T): T {
  if (!("ranges" in command)) return command;

  return {
    ...deepCopy(command),
    ranges: getters
      .getSelectedZones()
      .map((zone) => getters.getRangeDataFromZone(getters.getActiveSheetId(), zone)),
  };
}
