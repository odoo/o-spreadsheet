import { UID, Zone } from "../types";
import { CoreCommand } from "../types/commands";

export type SheetyCommand = Extract<CoreCommand, { sheetId: UID }>;

export type CellCommand = Extract<CoreCommand, { col: number; row: number }>;

export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;