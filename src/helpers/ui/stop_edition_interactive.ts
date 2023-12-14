import { ComposerStore } from "../../plugins/ui_stateful";
import { SpreadsheetChildEnv } from "../../types";

export function interactiveStopEdition(env: SpreadsheetChildEnv) {
  // TODO : remove this method altogether
  const editionStore = env.getStore(ComposerStore);
  editionStore.stopEdition();
}
