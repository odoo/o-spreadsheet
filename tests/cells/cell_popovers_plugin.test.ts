import { CommandResult, Model } from "../../src";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import { merge, setCellContent } from "../test_helpers";

describe("cell popover plugin", () => {
  test("Anchor rect is correct on a merge", () => {
    const model = new Model();
    merge(model, "A1:B2");
    setCellContent(model, "A1", "=0/0");
    expect(model.getters.getCellPopover({ col: 1, row: 1 })).toMatchObject({
      anchorRect: {
        x: 0,
        y: 0,
        height: 2 * DEFAULT_CELL_HEIGHT,
        width: 2 * DEFAULT_CELL_WIDTH,
      },
    });
  });

  test("cannot open popover which does not exists", () => {
    const model = new Model();
    const result = model.dispatch("OPEN_CELL_POPOVER", {
      col: 0,
      row: 0,
      //@ts-ignore
      popoverType: "This doesn't exist",
    });
    expect(result).toBeCancelledBecause(CommandResult.InvalidCellPopover);
  });
});
