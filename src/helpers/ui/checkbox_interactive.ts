import { SpreadsheetChildEnv, UID, Zone } from "../../types";

export function interactiveAddCheckbox(env: SpreadsheetChildEnv, sheetId: UID, target: Zone[]) {
  console.log("Interactive");
  env.model.dispatch("CREATE_CHECKBOX", { target, sheetId });
}
