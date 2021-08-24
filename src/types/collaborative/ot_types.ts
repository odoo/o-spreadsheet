import { CoreCommand } from "../commands";
import { UID, Zone } from "../misc";

export type SheetCommand = Extract<CoreCommand, { sheetId: UID }>;

export type PositionalCommand = Extract<CoreCommand, { col: number; row: number }>;

export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;
