import { selectCell, setCellContent, setFormatting } from "../test_helpers/commands_helpers";
import { getCell, getCellRawContent } from "../test_helpers/getters_helpers";
import { doAction, makeTestEnv } from "../test_helpers/helpers";

import { Model } from "../../src";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";

describe("cross spreadsheet copy/paste", () => {
  test("should copy/paste from Edit menu", async () => {
    const modelA = new Model();
    const modelB = new Model();
    const envA: SpreadsheetChildEnv = makeTestEnv(modelA);
    const envB: SpreadsheetChildEnv = makeTestEnv(modelB);

    const cellStyle = { bold: true, fillColor: "#00FF00", fontSize: 20 };

    setCellContent(modelA, "A1", "a1");
    setFormatting(modelA, "A1", cellStyle);
    expect(getCell(modelA, "A1")).toMatchObject({
      content: "a1",
      style: cellStyle,
    });

    selectCell(modelA, "A1");
    await doAction(["edit", "copy"], modelA, envA);

    /**
     * Copy the clipboard from envA to envB because
     * in this context we need to simulate that
     * the clipboard is shared between the two environments
     * given that in a real world scenario we are using one
     * clipboard which is the machine clipboard.
     */
    envB.clipboard = envA.clipboard;

    selectCell(modelB, "B1");
    await doAction(["edit", "paste"], modelB, envB);

    expect(getCellRawContent(modelB, "B1")).toEqual("a1");
    expect(getCell(modelB, "B1")?.style).toMatchObject(cellStyle);
  });
});
