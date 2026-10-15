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

/**
 * A concrete (instantiable) clipboard handler class, as stored in the clipboard
 * handler registries. Registries hold classes, not instances: `typeof ClipboardHandler`
 * would resolve to an *abstract* construct signature, which cannot be `new`ed and
 * would wrongly accept the abstract base classes themselves.
 */
export type ClipboardHandlerConstructor<H extends ClipboardHandler<any>> = new (
  getters: Getters,
  dispatch: CommandDispatcher["dispatch"]
) => H;

export abstract class ClipboardHandler<T> {
  constructor(protected getters: Getters, protected dispatch: CommandDispatcher["dispatch"]) {}

  copy(
    data: ClipboardData,
    isCutOperation: boolean,
    mode: ClipboardCopyOptions = "copyPaste"
  ): T | undefined {
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
   * Compact the copied content into a more storage-efficient form. Inverse operation of `expand`.
   *
   * @param data The content to compact.
   * @param sheetId The sheet the data was copied from.
   */
  compact(data: T, sheetId: UID): unknown {
    return data;
  }

  /** Expand the compacted content back into its original form. Inverse operation of `compact`. */
  expand(data: unknown): T {
    return data as T;
  }

  /**
   * Map a callback to very formula in the clipboard content.
   */
  mapFormulas(content: T, mapFn: (formula: string) => string): T {
    return content;
  }
}
