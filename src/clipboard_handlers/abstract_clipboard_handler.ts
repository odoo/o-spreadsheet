import {
  ClipboardData,
  ClipboardOptions,
  ClipboardPasteTarget,
  CommandDispatcher,
  CommandResult,
  Getters,
  UID,
  Zone,
} from "../types";

export class ClipboardHandler<T> {
  constructor(protected getters: Getters, protected dispatch: CommandDispatcher["dispatch"]) {}

  copy(data: ClipboardData): T | undefined {
    return;
  }

  paste(target: ClipboardPasteTarget, clippedContent: T, options: ClipboardOptions | undefined) {}

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

  getPasteTarget(target: Zone[], content: T, options: ClipboardOptions): ClipboardPasteTarget {
    return { zones: [] };
  }

  convertOSClipboardData(data: any): T | undefined {
    return;
  }
}
