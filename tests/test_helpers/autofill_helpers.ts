import { toCartesian } from "@odoo/o-spreadsheet-engine/helpers/coordinates";
import { Model } from "../../src";
import { setSelection } from "./commands_helpers";

/**
 * Autofill from a zone to a cell
 */
export function autofill(model: Model, from: string, to: string) {
  setSelection(model, [from]);
  model.dispatch("AUTOFILL_SELECT", toCartesian(to));
  model.dispatch("AUTOFILL");
}
