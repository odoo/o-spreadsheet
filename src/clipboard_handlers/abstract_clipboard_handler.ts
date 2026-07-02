import {
  ClipboardCopyOptions,
  ClipboardData,
  ClipboardOptions,
  ClipboardPasteTarget,
  ClipboardPositions,
} from "../types/clipboard";
import { CommandDispatcher, CommandResult } from "../types/commands";
import { Getters } from "../types/getters";
import { UID, Zone } from "../types/misc";

export class ClipboardHandler<T> {
  constructor(protected getters: Getters, protected dispatch: CommandDispatcher["dispatch"]) {}

  copy(
    data: ClipboardData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): unknown {
    return;
  }

  paste(
    target: ClipboardPasteTarget,
    clippedContent: T,
    options: ClipboardOptions,
    positions: ClipboardPositions
  ) {}

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

  /**
   * Expand data that was previously compacted during copy() back to the
   * full in-memory representation expected by paste / isPasteAllowed.
   * The default implementation is an identity (no expansion needed).
   */
  expand(data: unknown): T {
    return data as T;
  }
}
