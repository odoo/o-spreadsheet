import {
  ClipboardCopyOptions,
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

<<<<<<< 77fd30760dc0f8979f28dc7ccd1dc20be21339e8
  copy(data: ClipboardData, isCutOperation: boolean): T | undefined {
||||||| c693c6ee0ea3ed462a9fa01ac7592fd30d2b4357
  copy(data: ClipboardData): T | undefined {
=======
  copy(data: ClipboardData, mode: ClipboardCopyOptions = "copyPaste"): T | undefined {
>>>>>>> b1fd70d4add83d5729527c8e3a01d43164ce7b88
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
