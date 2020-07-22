import { BasePlugin } from "../base_plugin";
import { Command, Figure, FigureType, WorkbookData, Zone } from "../types/index";
import { overlap } from "../helpers";

export class FigurePlugin extends BasePlugin {
  static getters = ["getFiguresInside"];

  // use and array of figures in each sheet because the getter getFiguresInside will be call on all
  // renders and should be optimized
  // the add/move etc. commands are the exception here
  protected sheets: { [sheetId: string]: Figure[] } = {};

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "INSERT_FIGURE":
        const copy: Figure[] = this.sheets[cmd.sheetId].slice();
        const genericFigure = Object.assign({}, cmd, { type: cmd.figureType });
        copy.push(genericFigure);
        this.history.updateLocalState(["sheets", cmd.sheetId], copy);
      // move
      // resize
      // delete
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------
  /**
   * Return the figures inside the zone of a sheet
   */
  public getFiguresInside(sheetId: string, zone: Zone): Figure[] {
    return this.sheets[sheetId].filter((x) => overlap(x.position, zone));
  }

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------
  import(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      if (!this.sheets[sheetData.id]) {
        this.sheets[sheetData.id] = [];
      }

      Object.values(sheetData.figures).forEach((f) => {
        this.sheets[sheetData.id].push(f);
      });
    }
  }

  export(data: WorkbookData) {
    for (let sheetData of data.sheets) {
      const sheet = this.workbook.sheets[sheetData.id];
      for (let figure of Object.values(this.sheets[sheet.id])) {
        sheetData.figures[figure.id] = figure;
      }
    }
  }
}

/**
 * Manages a simple text overlay over the grid.
 * This text can take as mush height and width it wants
 *
 * This plugin doesn't need to store any private data
 */
export class TextPlugin extends BasePlugin {
  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------
  handle(cmd: Command) {
    switch (cmd.type) {
      case "INSERT_TEXT":
        const figure = {
          position: cmd.position,
          id: cmd.id,
          text: cmd.text,
        };

        this.dispatch(
          "INSERT_FIGURE",
          Object.assign(
            { figureType: "text" as FigureType, sheetId: this.workbook.activeSheet.id },
            figure
          )
        );
        break;

      default:
        super.handle(cmd);
        break;
    }
  }
}
