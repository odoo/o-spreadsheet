import { Component } from "../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../types/spreadsheet_env";

/**
 * Base class of all o-spreadsheet components. It only binds the environment
 * type, so that `this.env` is properly typed in every component.
 */
export class OSComponent extends Component<SpreadsheetChildEnv> {}
