import { CoreCommand, UID, Zone } from "..";

export type SheetCommand = Extract<CoreCommand, { sheetId: UID }>;

export type PositionalCommand = Extract<CoreCommand, { col: number; row: number }>;

export type TargetCommand = Extract<CoreCommand, { target: Zone[] }>;

export type ColumnsCommand = Extract<CoreCommand, { sheetId: UID; columns: number[] }>;

export type RowsCommand = Extract<CoreCommand, { sheetId: UID; rows: number[] }>;
