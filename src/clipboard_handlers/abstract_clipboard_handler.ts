import { UID, Zone } from "@odoo/o-spreadsheet-engine";
import {
  ClipboardCopyOptions,
  ClipboardData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandDispatcher,
  CommandResult,
  Getters,
} from "../types";

export class ClipboardHandler<T> {
  constructor(protected getters: Getters, protected dispatch: CommandDispatcher["dispatch"]) {}

  copy(
    data: ClipboardData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): T | undefined {
    return;
  }

  paste(target: ClipboardPasteTarget, clippedContent: T, options: ClipboardOptions) {}

  isPasteAllowed(
    sheetId: UID,
    target: Zone[],
    content: T,
    option: ClipboardOptions
  ): CommandResult {
    return CommandResult.Success;
  }

  isCutAllowed(data: ClipboardData): CommandResult {
    return CommandResult.Success;
  }

  getPasteTarget(
    sheetId: UID,
    target: Zone[],
    content: T,
    options: ClipboardOptions
  ): ClipboardPasteTarget {
    return { zones: [], sheetId };
  }

  convertTextToClipboardData(data: string): T | undefined {
    return;
  }
}
