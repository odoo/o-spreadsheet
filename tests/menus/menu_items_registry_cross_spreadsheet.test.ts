import { selectCell, setCellContent, setFormatting } from "../test_helpers/commands_helpers";
import { getCell, getCellRawContent } from "../test_helpers/getters_helpers";
import { doAction, makeTestEnv } from "../test_helpers/helpers";

import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Model } from "../../src";

describe("cross spreadsheet copy/paste", () => {
  test("should copy/paste from Edit menu", async () => {
    const envA: SpreadsheetChildEnv = await makeTestEnv();
    const envB: SpreadsheetChildEnv = await makeTestEnv();
    const modelA: Model = envA.model;
    const modelB: Model = envB.model;

    const cellStyle = { bold: true, fillColor: "#00FF00", fontSize: 20 };

    await setCellContent(modelA, "A1", "a1");
    await setFormatting(modelA, "A1", cellStyle);
    expect(getCell(modelA, "A1")).toMatchObject({
      content: "a1",
      style: cellStyle,
    });

    await selectCell(modelA, "A1");
    await doAction(["edit", "copy"], envA);

    /**
     * Copy the clipboard from envA to envB because
     * in this context we need to simulate that
     * the clipboard is shared between the two environments
     * given that in a real world scenario we are using one
     * clipboard which is the machine clipboard.
     */
    envB.clipboard = envA.clipboard;

    await selectCell(modelB, "B1");
    await doAction(["edit", "paste"], envB);

    expect(getCellRawContent(modelB, "B1")).toEqual("a1");
    expect(getCell(modelB, "B1")?.style).toMatchObject(cellStyle);
  });
});
