import { CoreCommand, UID, Zone } from "../../types";

export type SheetyCommand = Extract<CoreCommand, { sheetId: UID }>;

export type PositionalCommand = Extract<CoreCommand, { col: number; row: number }>;

export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;
