import { CoreCommand, HeaderIndex, UID, Zone } from "..";

export type SheetCommand = Extract<CoreCommand, { sheetId: UID }>;

export type PositionalCommand = Extract<CoreCommand, { col: HeaderIndex; row: HeaderIndex }>;

export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;
