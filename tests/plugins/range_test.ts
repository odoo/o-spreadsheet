import "../canvas.mock";
import { BasePlugin, Model } from "../../src";
import { pluginRegistry } from "../../src/plugins";
import { BaseCommand, Command } from "../../src/types";

let m;

export interface UseRange extends BaseCommand {
  type: "USE_RANGE";
  sheetId: string;
  rangesXC: string[];
}

type TestCommands = Command | UseRange;

class PluginTestRange extends BasePlugin {
  handle(cmd: TestCommands) {
    switch (cmd.type) {
      case "USE_RANGE":
        for (let r of cmd.rangesXC) {
          this.getters.getRangeFromXC(cmd.sheetId, r);
        }
        break;
    }
  }
}

pluginRegistry.add("testRange", PluginTestRange);

describe("range plugin", () => {
  beforeEach(() => {
    m = new Model();
  });
  test("create a range and remove a row in the middle", () => {
    m.dispatch("USE_RANGE", { sheetId: m.getters.getActiveSheetId(), rangesXC: ["A1:C1"] });
  });
});
