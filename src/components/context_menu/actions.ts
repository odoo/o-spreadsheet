import { CancelledReason, SpreadsheetEnv } from "../../types";

/**
 * This action is used to Merge content and to verify/notify/ask confirmation
 * if there is an error or if something will be removed
 * currently it :
 * - ask confirmation if creating a merge will delete content of cells
 *
 * @param env
 */
export function mergeAction(env: SpreadsheetEnv): void {
  const zones = env.getters.getSelectedZones();
  const zone = zones[zones.length - 1];
  const sheet = env.getters.getActiveSheet();
  const command = {
    sheet,
    zone,
  };
  const result = env.dispatch("ADD_MERGE", command);

  if (result.status === "CANCELLED") {
    if (result.reason === CancelledReason.MergeIsDestructive) {
      env.askConfirmation(
        "Merging these cells will only preserve the top-leftmost value. Merge anyway?",
        () => {
          command["force"] = true;
          env.dispatch("ADD_MERGE", command);
        }
      );
    }
  }
}

/**
 * This action is used to Paste content and to verify/notify/ask confirmation
 * if there is an error or if something will be removed
 * currently it :
 * - ask confirmation if pasting will remove an existing merge
 * - notify user that he can't paste on multiple selections
 *
 * @param env
 */
export function pasteAction(env: SpreadsheetEnv): void {
  const command = {
    target: env.getters.getSelectedZones(),
    onlyFormat: false,
  };
  const result = env.dispatch("PASTE", command);

  if (result.status === "CANCELLED") {
    if (result.reason === CancelledReason.WrongPasteSelection) {
      env.notifyUser("This operation is not allowed with multiple selections.");
    }
    if (result.reason === CancelledReason.WillRemoveExistingMerge) {
      env.askConfirmation("Pasting here will remove existing merge(s). Paste anyway?", () => {
        command["force"] = true;
        env.dispatch("PASTE", command);
      });
    }
  }
}
