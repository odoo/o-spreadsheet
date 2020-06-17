import { Command, LAYERS } from "../types/index";
import { BasePlugin } from "../base_plugin";
import { Mode } from "../model";

/**
 * Artifact plugins plugin
 *
 * This plugin creates and displays any overlay element on top of the grid to give a rich user experience
 * */

export class ArtifactPlugin extends BasePlugin {
  static getters = ["getArtifacts"];
  static layers = [LAYERS.Artifact];
  static modes: Mode[] = ["normal", "readonly"];

  handle(cmd: Command) {
    switch (cmd.type) {
      case "ACTIVATE_SHEET":
        break;
      case "START":
        break;

      case "CREATE_ARTIFACT":
        break;
      case "MOVE_ARTIFACT":
        break;
      case "SELECT_ARTIFACT":
        break;
      case "RESIZE_ARTIFACT":
        break;
      case "MOVE_ARTIFACT":
        break;
      case "DELETE_ARTIFACT":
        break;

      case "SELECT_ALL":
      case "SELECT_CELL":
      case "SELECT_COLUMN":
      case "SELECT_ROW":
        this.unselectAll();
        break;

      case "REMOVE_COLUMNS":
      case "REMOVE_ROWS":
      case "ADD_ROWS":
      case "ADD_COLUMNS":
        break;

      case "RESIZE_COLUMNS":
      case "RESIZE_ROWS":
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  getArtifacts(sheetId: string) {
    return [];
  }
  // ---------------------------------------------------------------------------
  // Grid rendering
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Private methods
  // ---------------------------------------------------------------------------

  private unselectAll() {
    // for (let c in this.chartsRuntime) {
    //   this.chartsRuntime[c].isSelected = false;
    // }
  }
}
