import { WHistory, WorkbookHistory } from "../history";
import { Mode } from "../model";

export class AbstractPlugin {
  static getters: string[] = [];
  static modes: Mode[] = ["headless", "normal", "readonly"];

  protected history: WorkbookHistory;
  protected currentMode: Mode;

  constructor(history: WHistory, currentMode: Mode) {
    this.history = Object.assign(Object.create(history), {
      update: history.updateStateFromRoot.bind(history, this),
    });
    this.currentMode = currentMode;
  }
}
