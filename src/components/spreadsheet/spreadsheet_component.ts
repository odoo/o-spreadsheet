import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { useSpreadsheetEnv } from "./env_owl_plugin";

export abstract class SpreadsheetComponent extends Component {
  private _envPlugin = useSpreadsheetEnv();

  get env(): SpreadsheetChildEnv {
    return this._envPlugin.env;
  }
}
