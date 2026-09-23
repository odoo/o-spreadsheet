import { selectCell, setCellContent, setFormatting } from "../test_helpers/commands_helpers";
import { getCell, getCellRawContent } from "../test_helpers/getters_helpers";
import { doAction, makeSpreadsheetActionTestEnv } from "../test_helpers/helpers";

import { Model } from "../../src";
import { SpreadsheetActionEnv } from "../../src/types/spreadsheet_env";

describe("cross spreadsheet copy/paste", () => {
  test("should copy/paste from Edit menu", async () => {
    const envA: SpreadsheetActionEnv = makeSpreadsheetActionTestEnv();
    const envB: SpreadsheetActionEnv = makeSpreadsheetActionTestEnv();
    const modelA: Model = envA.model();
    const modelB: Model = envB.model();

    const cellStyle = { bold: true, fillColor: "#00FF00", fontSize: 20 };

    setCellContent(modelA, "A1", "a1");
    setFormatting(modelA, "A1", cellStyle);
    expect(getCell(modelA, "A1")).toMatchObject({
      content: "a1",
      style: cellStyle,
    });

    selectCell(modelA, "A1");
    await doAction(["edit", "copy"], envA);

    selectCell(modelB, "B1");
    await doAction(["edit", "paste"], envB); // both env use the same mocked navigator.clipboard

    expect(getCellRawContent(modelB, "B1")).toEqual("a1");
    expect(getCell(modelB, "B1")?.style).toMatchObject(cellStyle);
  });
});
