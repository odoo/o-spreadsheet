import "../test_helpers/helpers";

import { buildSheetLink, toCartesian, toZone } from "../../src/helpers";
import { Border, Style } from "../../src/types";
import {
  addDataValidation,
  addEqualCf,
  autofill,
  autofillAuto,
  autofillSelect,
  createSheet,
  createSheetWithName,
  createTable,
  deleteColumns,
  deleteRows,
  merge,
  selectCell,
  setBorders,
  setCellContent,
  setSelection,
  updateCell,
} from "../test_helpers/commands_helpers";
import {
  getBorder,
  getCell,
  getCellContent,
  getCellRawContent,
  getCellText,
  getMerges,
  getStyle,
} from "../test_helpers/getters_helpers";
import {
  XCToMergeCellMap,
  addToRegistry,
  createModel,
  getDataValidationRules,
  getMergeCellMap,
  getPlugin,
  makeTestComposerStore,
} from "../test_helpers/helpers";

import { functionRegistry } from "@odoo/o-spreadsheet-engine/functions/function_registry";
import { AutofillPlugin } from "@odoo/o-spreadsheet-engine/plugins/ui_feature/autofill";
import { Model } from "../../src";
import { DIRECTION } from "../../src/types/index";

let autoFill: AutofillPlugin;
let model: Model;

async function autofillTooltip(from: string, to: string) {
  await autofillSelect(model, from, to);
  return model.getters.getAutofillTooltip()?.props.content;
}

/**
 * Retrieve the direction from a zone to a cell
 */
async function getDirection(from: string, xc: string) {
  await setSelection(model, [from]);
  const { col, row } = toCartesian(xc);
  return autoFill["getDirection"](col, row);
}

beforeEach(async () => {
  model = await createModel();
  autoFill = getPlugin(model, AutofillPlugin);
});

describe("Autofill", () => {
  test.each([
    ["C3:D4", "A5", DIRECTION.LEFT],
    ["C3:D4", "B5", DIRECTION.DOWN],
    ["C3:D4", "D5", DIRECTION.DOWN],
    ["C3:D4", "E5", DIRECTION.DOWN],
    ["C3:D4", "F5", DIRECTION.RIGHT],
    ["C3:D4", "C2", DIRECTION.UP],
    ["C3:D4", "B2", DIRECTION.UP],
    ["C3:D4", "A2", DIRECTION.LEFT],
    ["C3:D4", "E2", DIRECTION.UP],
    ["C3:D4", "F2", DIRECTION.RIGHT],
    ["C3:D4", "B3", DIRECTION.LEFT],
    ["C3:D4", "E4", DIRECTION.RIGHT],
  ])("From %s, selecting %s, should return the direction %s", async (from, xc, direction) => {
    expect(await getDirection(from, xc)).toBe(direction);
  });

  test.each([
    ["C3:D4", "A5", "A3:B4"],
    ["C3:D4", "B5", "C5:D5"],
    ["C3:D4", "D5", "C5:D5"],
    ["C3:D4", "E5", "C5:D5"],
    ["C3:D4", "F5", "E3:F4"],
    ["C3:D4", "C2", "C2:D2"],
    ["C3:D4", "B2", "C2:D2"],
    ["C3:D4", "A2", "A3:B4"],
    ["C3:D4", "E2", "C2:D2"],
    ["C3:D4", "F2", "E3:F4"],
    ["C3:D4", "B3", "B3:B4"],
    ["C3:D4", "E4", "E3:E4"],
  ])("From %s, selecting %s should select the good zone (%s)", async (from, xc, expected) => {
    await autofillSelect(model, from, xc);
    expect(autoFill["autofillZone"]).toEqual(toZone(expected));
  });

  test.each([
    ["1", "1", "number"],
    ["test", "test", "string"],
    ["=B1", "=B2", "formula"],
    ["01/01/2020", "01/02/2020", "date"],
  ])("Autofill %s DOWN should give %s", async (text, expected, expectedType) => {
    await setCellContent(model, "A1", text);
    await autofill(model, "A1", "A2");
    expect(getCellText(model, "A2")).toBe(expected);
  });

  test("Autofill keep style, border and format", async () => {
    const border: Border = {
      left: { style: "thin", color: "#000" },
    };
    const style: Style = { textColor: "orange" };
    await updateCell(model, "A1", { style, format: "m/d/yyyy" });
    await setBorders(model, "A1", border);
    await autofill(model, "A1", "A2");
    const cell = getCell(model, "A2")!;
    expect(cell.style).toEqual(style);
    expect(getBorder(model, "A2")).toEqual(border);
    expect(cell.format).toBe("m/d/yyyy");
  });

  test("Autofill a date displays a date in the composer", async () => {
    const composerStore = makeTestComposerStore(model);
    await setCellContent(model, "A1", "1/1/2017");
    await autofill(model, "A1", "A2");
    await selectCell(model, "A2");
    expect(composerStore.currentContent).toBe("1/2/2017");
  });

  test("Autofill add CF to target cell if present in origin cell", async () => {
    await setCellContent(model, "A1", "1");
    await autofill(model, "A1", "A4");
    const style = { fillColor: "#FF0000" };
    await addEqualCf(model, "A1,A2", style, "1");
    expect(getStyle(model, "A1")).toEqual(style);
    expect(getStyle(model, "A2")).toEqual(style);
    expect(getStyle(model, "A3")).toEqual({});
    expect(getStyle(model, "A4")).toEqual({});
    await autofill(model, "A1:A4", "A8");
    expect(getStyle(model, "A5")).toEqual(style);
    expect(getStyle(model, "A6")).toEqual(style);
    expect(getStyle(model, "A7")).toEqual({});
    expect(getStyle(model, "A8")).toEqual({});
  });

  test("Autofill add data validation to target cell if present in origin cell", async () => {
    await setCellContent(model, "A1", "1");
    await addDataValidation(model, "A1", "id", { type: "containsText", values: ["1"] });
    await autofill(model, "A1", "A4");
    expect(getDataValidationRules(model, model.getters.getActiveSheetId())).toMatchObject([
      {
        id: "id",
        criterion: { type: "containsText", values: ["1"] },
        ranges: ["A1:A4"],
      },
    ]);
  });

  describe("Autofill multiple values", () => {
    test("Autofill numbers", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");
      await autofill(model, "A1:A2", "A6");
      expect(getCellContent(model, "A3")).toBe("3");
      expect(getCellContent(model, "A4")).toBe("4");
      expect(getCellContent(model, "A5")).toBe("5");
      expect(getCellContent(model, "A6")).toBe("6");
    });

    describe("Autofill dates", () => {
      test("consecutive dates", async () => {
        await setCellContent(model, "A1", "3/28/2003");
        await setCellContent(model, "A2", "3/29/2003");
        await setCellContent(model, "A3", "3/30/2003");
        await autofill(model, "A1:A3", "A6");
        expect(getCellText(model, "A4")).toBe("3/31/2003");
        expect(getCellText(model, "A5")).toBe("4/1/2003");
        expect(getCellText(model, "A6")).toBe("4/2/2003");
      });

      test("Descending dates", async () => {
        await setCellContent(model, "A1", "3/4/2003");
        await setCellContent(model, "A2", "3/3/2003");
        await autofill(model, "A1:A2", "A5");
        expect(getCellText(model, "A3")).toBe("3/2/2003");
        expect(getCellText(model, "A4")).toBe("3/1/2003");
        expect(getCellText(model, "A5")).toBe("2/28/2003");
      });

      test("Autofill upwards consecutive dates", async () => {
        await setCellContent(model, "A4", "3/31/2003");
        await setCellContent(model, "A5", "4/1/2003");
        await setCellContent(model, "A6", "4/2/2003");
        await autofill(model, "A4:A6", "A1");
        expect(getCellText(model, "A1")).toBe("3/28/2003");
        expect(getCellText(model, "A2")).toBe("3/29/2003");
        expect(getCellText(model, "A3")).toBe("3/30/2003");
      });

      test("dates with consistent day gap", async () => {
        await setCellContent(model, "A1", "4/21/2003");
        await setCellContent(model, "A2", "4/23/2003");
        await setCellContent(model, "A3", "4/25/2003");
        await autofill(model, "A1:A3", "A7");
        expect(getCellText(model, "A4")).toBe("4/27/2003");
        expect(getCellText(model, "A5")).toBe("4/29/2003");
        expect(getCellText(model, "A6")).toBe("5/1/2003");
        expect(getCellText(model, "A7")).toBe("5/3/2003");
      });

      test("dates with consistent month gap", async () => {
        await setCellContent(model, "A1", "3/24/2003");
        await setCellContent(model, "A2", "5/24/2003");
        await setCellContent(model, "A3", "7/24/2003");
        await autofill(model, "A1:A3", "A6");
        expect(getCellText(model, "A4")).toBe("9/24/2003");
        expect(getCellText(model, "A5")).toBe("11/24/2003");
        expect(getCellText(model, "A6")).toBe("1/24/2004");
      });

      test("dates with consistent year gap", async () => {
        await setCellContent(model, "A1", "3/24/2000");
        await setCellContent(model, "A2", "3/24/2003");
        await setCellContent(model, "A3", "3/24/2006");
        await autofill(model, "A1:A3", "A6");
        expect(getCellText(model, "A4")).toBe("3/24/2009");
        expect(getCellText(model, "A5")).toBe("3/24/2012");
        expect(getCellText(model, "A6")).toBe("3/24/2015");
      });

      test("dates 2 year apart with leap year", async () => {
        await setCellContent(model, "A1", "3/24/2000");
        await setCellContent(model, "A2", "3/24/2002");
        await autofill(model, "A1:A2", "A6");
        expect(getCellText(model, "A3")).toBe("3/24/2004");
        expect(getCellText(model, "A4")).toBe("3/24/2006");
        expect(getCellText(model, "A5")).toBe("3/24/2008");
        expect(getCellText(model, "A6")).toBe("3/24/2010");
      });

      test("dates with inconsistent day gap", async () => {
        await setCellContent(model, "A1", "4/11/2003");
        await setCellContent(model, "A2", "4/12/2003");
        await setCellContent(model, "A3", "4/25/2003");
        await autofill(model, "A1:A3", "A7");
        expect(getCellText(model, "A4")).toBe("4/11/2003");
        expect(getCellText(model, "A5")).toBe("4/12/2003");
        expect(getCellText(model, "A6")).toBe("4/25/2003");
        expect(getCellText(model, "A7")).toBe("4/11/2003");
      });

      test("dates with inconsistent month gap", async () => {
        await setCellContent(model, "A1", "4/11/2003");
        await setCellContent(model, "A2", "5/11/2003");
        await setCellContent(model, "A3", "7/11/2003");
        await autofill(model, "A1:A3", "A7");
        expect(getCellText(model, "A4")).toBe("4/11/2003");
        expect(getCellText(model, "A5")).toBe("5/11/2003");
        expect(getCellText(model, "A6")).toBe("7/11/2003");
        expect(getCellText(model, "A7")).toBe("4/11/2003");
      });

      test("dates with inconsistent year gap", async () => {
        await setCellContent(model, "A1", "4/11/2003");
        await setCellContent(model, "A2", "4/11/2005");
        await setCellContent(model, "A3", "4/11/2006");
        await autofill(model, "A1:A3", "A7");
        expect(getCellText(model, "A4")).toBe("4/11/2003");
        expect(getCellText(model, "A5")).toBe("4/11/2005");
        expect(getCellText(model, "A6")).toBe("4/11/2006");
        expect(getCellText(model, "A7")).toBe("4/11/2003");
      });

      test("dates with random gaps", async () => {
        await setCellContent(model, "A1", "3/24/2000");
        await setCellContent(model, "A2", "3/25/2003");
        await setCellContent(model, "A3", "4/24/1997");
        await autofill(model, "A1:A3", "A6");
        expect(getCellText(model, "A4")).toBe("3/24/2000");
        expect(getCellText(model, "A5")).toBe("3/25/2003");
        expect(getCellText(model, "A6")).toBe("4/24/1997");
      });

      test("dates wich constant year/month gap", async () => {
        await setCellContent(model, "A1", "2/1/2001");
        await setCellContent(model, "A2", "3/1/2002");
        await setCellContent(model, "A3", "4/1/2003");
        await autofill(model, "A1:A3", "A6");
        expect(getCellText(model, "A4")).toBe("5/1/2004");
        expect(getCellText(model, "A5")).toBe("6/1/2005");
        expect(getCellText(model, "A6")).toBe("7/1/2006");
      });

      test("dates with constant month/day gap", async () => {
        await setCellContent(model, "A1", "2/1/2001");
        await setCellContent(model, "A2", "3/2/2001");
        await setCellContent(model, "A3", "4/3/2001");
        await autofill(model, "A1:A3", "A6");
        // Note: differs from Excel but consistent with other cases
        expect(getCellText(model, "A4")).toBe("5/4/2001");
        expect(getCellText(model, "A5")).toBe("6/5/2001");
        expect(getCellText(model, "A6")).toBe("7/6/2001");
      });

      test("dates with constant year/day gap", async () => {
        await setCellContent(model, "A1", "1/3/2001");
        await setCellContent(model, "A2", "1/5/2002");
        await setCellContent(model, "A3", "1/7/2003");
        await autofill(model, "A1:A3", "A6");
        expect(getCellText(model, "A4")).toBe("1/9/2004");
        expect(getCellText(model, "A5")).toBe("1/10/2005");
        expect(getCellText(model, "A6")).toBe("1/12/2006");
      });
    });

    test("Autofill hours", async () => {
      await setCellContent(model, "A1", "10:26:04");
      await setCellContent(model, "A2", "10:28:08");
      await autofill(model, "A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("10:30:12");
      expect(getCellText(model, "A4")).toBe("10:32:16");
      expect(getCellText(model, "A5")).toBe("10:34:20");
      expect(getCellText(model, "A6")).toBe("10:36:24");
    });

    test("Autofill percent", async () => {
      await setCellContent(model, "A1", "1%");
      await setCellContent(model, "A2", "2%");
      await autofill(model, "A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("3%");
      expect(getCellText(model, "A4")).toBe("4%");
      expect(getCellText(model, "A5")).toBe("5%");
      expect(getCellText(model, "A6")).toBe("6%");
    });

    test("Autofill 2 non-consecutive numbers", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "3");
      await autofill(model, "A1:A2", "A6");
      expect(getCellContent(model, "A3")).toBe("5");
      expect(getCellContent(model, "A4")).toBe("7");
      expect(getCellContent(model, "A5")).toBe("9");
      expect(getCellContent(model, "A6")).toBe("11");
    });

    test("Autofill more than 2 consecutive numbers", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "3");
      await setCellContent(model, "A3", "5");
      await autofill(model, "A1:A3", "A6");
      expect(getCellContent(model, "A4")).toBe("7");
      expect(getCellContent(model, "A5")).toBe("9");
      expect(getCellContent(model, "A6")).toBe("11");
    });

    test("Autofill non-trivial steps", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");
      await setCellContent(model, "A3", "4");
      await autofill(model, "A1:A3", "A6");
      expect(getCellContent(model, "A4")).toBe("5.5");
      expect(getCellContent(model, "A5")).toBe("6.5");
      expect(getCellContent(model, "A6")).toBe("8.5");
    });

    test("Autofill formulas", async () => {
      await setCellContent(model, "A1", "=B1");
      await setCellContent(model, "A2", "=B2");
      await autofill(model, "A1:A2", "A6");
      expect(getCellText(model, "A3")).toBe("=B3");
      expect(getCellText(model, "A4")).toBe("=B4");
      expect(getCellText(model, "A5")).toBe("=B5");
      expect(getCellText(model, "A6")).toBe("=B6");
    });

    test.each([
      ["=B10000", "=B10001", "=B10002"],
      ["=B$10000", "=B$10000", "=B$10000"],
      ["=SUM(B100:B10000)", "=SUM(B101:B10001)", "=SUM(B102:B10002)"],
    ])("Autofill reference outside of sheet %s", async (A1, expectedA2, expectedA3) => {
      await setCellContent(model, "A1", A1);
      await autofill(model, "A1", "A3");
      expect(getCellText(model, "A2")).toBe(expectedA2);
      expect(getCellText(model, "A3")).toBe(expectedA3);
    });

    test.each([
      ["=$B1", "=$B2", "=$B3"],
      ["=$B$1", "=$B$1", "=$B$1"],
      ["=B$1", "=B$1", "=B$1"],
    ])("Autofill vertically fixed reference %s", async (A1, expectedA2, expectedA3) => {
      await setCellContent(model, "A1", A1);
      await autofill(model, "A1", "A3");
      expect(getCellText(model, "A2")).toBe(expectedA2);
      expect(getCellText(model, "A3")).toBe(expectedA3);
    });

    test.each([
      ["=$A2", "=$A2", "=$A2"],
      ["=$A$2", "=$A$2", "=$A$2"],
      ["=A$2", "=B$2", "=C$2"],
    ])("Autofill horizontally fixed reference %s", async (A1, B1, C1) => {
      await setCellContent(model, "A1", A1);
      await autofill(model, "A1", "C1");
      expect(getCellText(model, "B1")).toBe(B1);
      expect(getCellText(model, "C1")).toBe(C1);
    });

    test("Autofill text values", async () => {
      await setCellContent(model, "A1", "A");
      await setCellContent(model, "A2", "B");
      await autofill(model, "A1:A2", "A6");
      expect(getCellContent(model, "A3")).toBe("A");
      expect(getCellContent(model, "A4")).toBe("B");
      expect(getCellContent(model, "A5")).toBe("A");
      expect(getCellContent(model, "A6")).toBe("B");
    });

    test("Autofill mixed values", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");
      await setCellContent(model, "A3", "test");
      await autofill(model, "A1:A3", "A9");
      expect(getCellContent(model, "A4")).toBe("3");
      expect(getCellContent(model, "A5")).toBe("4");
      expect(getCellContent(model, "A6")).toBe("test");
      expect(getCellContent(model, "A7")).toBe("5");
      expect(getCellContent(model, "A8")).toBe("6");
      expect(getCellContent(model, "A9")).toBe("test");
    });

    test("Autofill mixed-mixed values UP", async () => {
      await setCellContent(model, "A10", "test");
      await setCellContent(model, "A11", "test1");
      await setCellContent(model, "A12", "4");
      await autofill(model, "A10:A12", "A1");
      expect(getCellContent(model, "A9")).toBe("3");
      expect(getCellContent(model, "A8")).toBe("test0");
      expect(getCellContent(model, "A7")).toBe("test");
      expect(getCellContent(model, "A6")).toBe("2");
      expect(getCellContent(model, "A5")).toBe("test1");
      expect(getCellContent(model, "A4")).toBe("test");
      expect(getCellContent(model, "A3")).toBe("1");
      expect(getCellContent(model, "A2")).toBe("test2");
      expect(getCellContent(model, "A1")).toBe("test");
    });

    test("Autofill mixed-mixed values LEFT", async () => {
      await setCellContent(model, "J1", "test");
      await setCellContent(model, "K1", "test1");
      await setCellContent(model, "L1", "4");
      await autofill(model, "J1:L1", "A1");
      expect(getCellContent(model, "I1")).toBe("3");
      expect(getCellContent(model, "H1")).toBe("test0");
      expect(getCellContent(model, "G1")).toBe("test");
      expect(getCellContent(model, "F1")).toBe("2");
      expect(getCellContent(model, "E1")).toBe("test1");
      expect(getCellContent(model, "D1")).toBe("test");
      expect(getCellContent(model, "C1")).toBe("1");
      expect(getCellContent(model, "B1")).toBe("test2");
      expect(getCellContent(model, "A1")).toBe("test");
    });

    test("Autofill dates mixed with numbers", async () => {
      await setCellContent(model, "A1", "1/8/2023");
      await setCellContent(model, "A2", "2/8/2023");
      await setCellContent(model, "A3", "5");
      await autofill(model, "A1:A3", "A7");
      expect(getCellContent(model, "A4")).toBe("3/8/2023");
      expect(getCellContent(model, "A5")).toBe("4/8/2023");
      expect(getCellContent(model, "A6")).toBe("6");
      expect(getCellContent(model, "A7")).toBe("5/8/2023");
    });

    test("Autofill dates mixed with text", async () => {
      await setCellContent(model, "A1", "1/8/2023");
      await setCellContent(model, "A2", "2/8/2023");
      await setCellContent(model, "A3", "text");
      await autofill(model, "A1:A3", "A7");
      expect(getCellContent(model, "A4")).toBe("3/8/2023");
      expect(getCellContent(model, "A5")).toBe("4/8/2023");
      expect(getCellContent(model, "A6")).toBe("text");
      expect(getCellContent(model, "A7")).toBe("5/8/2023");
    });

    test("Autofill number and text", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "test");
      await autofill(model, "A1:A2", "A4");
      expect(getCellContent(model, "A3")).toBe("2");
      expect(getCellContent(model, "A4")).toBe("test");
    });

    describe("Autofill alphanumeric values", () => {
      test("same prefix", async () => {
        await setCellContent(model, "A1", "prefix1");
        await setCellContent(model, "A2", "prefix4");
        await autofill(model, "A1:A2", "A4");
        expect(getCellContent(model, "A3")).toBe("prefix7");
        expect(getCellContent(model, "A4")).toBe("prefix10");
      });

      test("different prefix", async () => {
        await setCellContent(model, "A1", "prefixa1");
        await setCellContent(model, "A2", "prefixb10");
        await autofill(model, "A1:A2", "A4");
        expect(getCellContent(model, "A3")).toBe("prefixa2");
        expect(getCellContent(model, "A4")).toBe("prefixb11");
      });

      test("padding leading zeros of number at the end", async () => {
        await setCellContent(model, "A1", "prefix005");
        await setCellContent(model, "A2", "prefix007");
        await autofill(model, "A1:A2", "A4");
        expect(getCellContent(model, "A3")).toBe("prefix009");
        expect(getCellContent(model, "A4")).toBe("prefix011");
      });

      test("Do not pad non-leading zeros of number at the end", async () => {
        await setCellContent(model, "A1", "prefix 11");
        await setCellContent(model, "A2", "prefix 10");
        await autofill(model, "A1:A2", "A4");
        expect(getCellContent(model, "A3")).toBe("prefix 9");
        expect(getCellContent(model, "A4")).toBe("prefix 8");
      });

      describe("Alphanumeric do not go to negative values", () => {
        test("Without leading zeros", async () => {
          await setCellContent(model, "A1", "prefix2");
          await setCellContent(model, "A2", "prefix1");
          await autofill(model, "A1:A2", "A6");
          expect(getCellContent(model, "A3")).toBe("prefix0");
          expect(getCellContent(model, "A4")).toBe("prefix1");
          expect(getCellContent(model, "A5")).toBe("prefix2");
          expect(getCellContent(model, "A6")).toBe("prefix3");
        });

        test("With leading zeros", async () => {
          await setCellContent(model, "A1", "prefix002");
          await setCellContent(model, "A2", "prefix001");
          await autofill(model, "A1:A2", "A6");
          expect(getCellContent(model, "A3")).toBe("prefix000");
          expect(getCellContent(model, "A4")).toBe("prefix001");
          expect(getCellContent(model, "A5")).toBe("prefix002");
          expect(getCellContent(model, "A6")).toBe("prefix003");
        });
      });

      test("prefix with numbers", async () => {
        await setCellContent(model, "A1", "prefix123and5");
        await setCellContent(model, "A2", "prefix123and7");
        await autofill(model, "A1:A2", "A4");
        expect(getCellContent(model, "A3")).toBe("prefix123and9");
        expect(getCellContent(model, "A4")).toBe("prefix123and11");
      });
    });

    test("Autofill number and formulas", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "2");
      await setCellContent(model, "A3", "=A1 + 10");
      await autofill(model, "A1:A3", "A9");
      expect(getCellContent(model, "A4")).toBe("3");
      expect(getCellContent(model, "A5")).toBe("4");
      expect(getCellContent(model, "A6")).toBe("13");
      expect(getCellContent(model, "A7")).toBe("5");
      expect(getCellContent(model, "A8")).toBe("6");
      expect(getCellContent(model, "A9")).toBe("15");
    });

    test.each([
      ["=A1", "=#REF"],
      ["=SUM(A1:B1)", "=SUM(#REF)"],
    ])(
      "Autofill invalid range  due to row deletion",
      async (initialFormula, expectedInvalidFormula) => {
        await setCellContent(model, "C2", initialFormula);
        await deleteRows(model, [0]);
        expect(getCellRawContent(model, "C1")).toBe(expectedInvalidFormula);
        await autofill(model, "C1", "C2");
        await autofill(model, "C1", "D1");
        expect(getCellRawContent(model, "C2")).toBe(expectedInvalidFormula);
        expect(getCellRawContent(model, "D1")).toBe(expectedInvalidFormula);
      }
    );

    test.each([
      ["=A1", "=#REF"],
      ["=SUM(A1:A2)", "=SUM(#REF)"],
    ])(
      "Autofill invalid range  due to col deletion",
      async (initialFormula, expectedInvalidFormula) => {
        await setCellContent(model, "B1", initialFormula);
        await deleteColumns(model, ["A"]);
        expect(getCellRawContent(model, "A1")).toBe(expectedInvalidFormula);
        await autofill(model, "A1", "A2");
        await autofill(model, "A1", "B1");
        expect(getCellRawContent(model, "A2")).toBe(expectedInvalidFormula);
        expect(getCellRawContent(model, "B1")).toBe(expectedInvalidFormula);
      }
    );

    test.each([
      "[https://url.com](https://url.com)",
      "[custom label](https://url.com)",
      `[custom label](${buildSheetLink("Sheet1")})`,
    ])("Autofill link %s", async (link) => {
      await setCellContent(model, "A1", link);
      await autofill(model, "A1", "A2");
      expect(getCellRawContent(model, "A2")).toBe(link);
    });

    test("Autofill mixed-mixed values", async () => {
      await setCellContent(model, "A1", "1");
      await setCellContent(model, "A2", "test");
      await setCellContent(model, "A3", "-1");
      await setCellContent(model, "A4", "-2");
      await setCellContent(model, "A5", "-3");
      await autofill(model, "A1:A5", "A10");
      expect(getCellContent(model, "A6")).toBe("2");
      expect(getCellContent(model, "A7")).toBe("test");
      expect(getCellContent(model, "A8")).toBe("-4");
      expect(getCellContent(model, "A9")).toBe("-5");
      expect(getCellContent(model, "A10")).toBe("-6");
    });

    test("Autofill should override selected zone", async () => {
      await setCellContent(model, "A1", "1");
      const border: Border = {
        left: { style: "thin", color: "#000" },
      };
      const style: Style = { textColor: "orange" };
      await updateCell(model, "A2", { content: "test", style, format: "m/d/yyyy" });
      await setBorders(model, "A2", border);
      await autofill(model, "A1", "A2");
      const cell = getCell(model, "A2")!;
      expect(cell.style).toBeUndefined();
      expect(getBorder(model, "A2")).toBeNull();
      expect(cell.format).toBeUndefined();
      expect(cell["content"]).toBe("1");
    });
  });

  test("Autofill functions", async () => {
    await setCellContent(model, "A1", "=B1");
    await autofill(model, "A1", "A3"); // DOWN
    expect(getCellText(model, "A2")).toBe("=B2");
    expect(getCellText(model, "A3")).toBe("=B3");
    await setCellContent(model, "A1", "=A2");
    await autofill(model, "A1", "C1"); // RIGHT
    expect(getCellText(model, "B1")).toBe("=B2");
    expect(getCellText(model, "C1")).toBe("=C2");
    await setCellContent(model, "B2", "=C3");
    await autofill(model, "B2", "A2"); // LEFT
    expect(getCellText(model, "A2")).toBe("=B3");
    expect(getCellText(model, "B2")).toBe("=C3");
    await autofill(model, "B2", "B1"); // UP
    expect(getCellText(model, "B1")).toBe("=C2");
  });

  test("Autofill empty cell should erase others", async () => {
    await setCellContent(model, "A2", "1");
    const border: Border = {
      left: { style: "thin", color: "#000" },
    };
    const style: Style = { textColor: "orange" };
    await updateCell(model, "A3", { style, format: "m/d/yyyy" });
    await setBorders(model, "A3", border);
    await autofill(model, "A1", "A3");
    expect(getCell(model, "A2")).toBeUndefined();
    expect(getCell(model, "A3")).toBeUndefined();
    expect(getBorder(model, "A2")).toBeNull();
    expect(getBorder(model, "A3")).toBeNull();
  });

  test("Auto-autofill left", async () => {
    await setCellContent(model, "A2", "1");
    await setCellContent(model, "A3", "1");
    await setCellContent(model, "A4", "1");
    await setCellContent(model, "B2", "2");
    await setSelection(model, ["B2"]);
    await autofillAuto(model);
    expect(getCellContent(model, "B3")).toBe("2");
    expect(getCellContent(model, "B4")).toBe("2");
    expect(getCell(model, "B5")).toBeUndefined();
  });

  test("Auto-autofill multiple cells left", async () => {
    await setCellContent(model, "A2", "1");
    await setCellContent(model, "A3", "1");
    await setCellContent(model, "A4", "1");
    await setCellContent(model, "A5", "1");
    await setCellContent(model, "B2", "2");
    await setCellContent(model, "B3", "3");
    await setSelection(model, ["B2:B3"]);
    await autofillAuto(model);
    expect(getCellContent(model, "B4")).toBe("4");
    expect(getCellContent(model, "B5")).toBe("5");
    expect(getCell(model, "B6")).toBeUndefined();
  });

  test("Auto-autofill right", async () => {
    await setCellContent(model, "B2", "1");
    await setCellContent(model, "B3", "1");
    await setCellContent(model, "B4", "1");
    await setCellContent(model, "A2", "2");
    await setSelection(model, ["A2"]);
    await autofillAuto(model);
    expect(getCellContent(model, "A3")).toBe("2");
    expect(getCellContent(model, "A4")).toBe("2");
    expect(getCell(model, "A5")).toBeUndefined();
  });

  test("Auto-autofill multiple cells right", async () => {
    await setCellContent(model, "B2", "1");
    await setCellContent(model, "B3", "1");
    await setCellContent(model, "B4", "1");
    await setCellContent(model, "B5", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await setSelection(model, ["A2:A3"]);
    await autofillAuto(model);
    expect(getCellContent(model, "A4")).toBe("4");
    expect(getCellContent(model, "A5")).toBe("5");
    expect(getCell(model, "A6")).toBeUndefined();
  });

  test("Auto-autofill considers cells with a content", async () => {
    await setCellContent(model, "B2", "1");
    await setCellContent(model, "B3", '=""');
    await setCellContent(model, "B4", '=""');
    await setCellContent(model, "A2", "2");
    await setSelection(model, ["A2"]);
    await autofillAuto(model);
    expect(getCellContent(model, "A3")).toBe("2");
    expect(getCellContent(model, "A4")).toBe("2");
    expect(getCell(model, "A5")).toBeUndefined();
  });

  test("Auto-autofill of multiple cells considers cells with a content", async () => {
    await setCellContent(model, "B2", "1");
    await setCellContent(model, "B3", '=""');
    await setCellContent(model, "B4", '=""');
    await setCellContent(model, "B5", '=""');
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await setSelection(model, ["A2:A3"]);
    await autofillAuto(model);
    expect(getCellContent(model, "A4")).toBe("4");
    expect(getCellContent(model, "A5")).toBe("5");
    expect(getCell(model, "A6")).toBeUndefined();
  });

  test("Auto-autofill considers formula spreaded value", async () => {
    addToRegistry(functionRegistry, "SPREAD.EMPTY", {
      description: "spreads empty values",
      args: [],
      compute: function (): null[][] {
        return [
          [null, null, null], // return 2 col, 3 row matrix
          [null, null, null],
        ];
      },
      isExported: false,
    });
    await setCellContent(model, "A1", "=SPREAD.EMPTY()");
    await setCellContent(model, "C1", "2");
    await setSelection(model, ["C1"]);
    await autofillAuto(model);
    expect(getCellContent(model, "C1")).toBe("2");
    expect(getCellContent(model, "C2")).toBe("2");
    expect(getCellContent(model, "C3")).toBe("2");
    expect(getCell(model, "C4")).toBeUndefined();
  });

  test("Auto-autofill in a table fill until the end of the table", async () => {
    await createTable(model, "A1:B3");
    await setCellContent(model, "A1", "=C1");
    await autofillAuto(model);
    expect(getCellRawContent(model, "A2")).toBe("=C2");
    expect(getCellRawContent(model, "A3")).toBe("=C3");
    expect(getCellRawContent(model, "A4")).toBe(undefined);
  });

  test("Auto-autofill stops at non empty cell", async () => {
    // On standard range
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await setCellContent(model, "A3", "3");
    await setCellContent(model, "B1", "=A1");
    await setCellContent(model, "B3", "Text not overwritten");
    await setSelection(model, ["B1"]);
    await autofillAuto(model);
    expect(getCellRawContent(model, "B2")).toBe("=A2");
    expect(getCellRawContent(model, "B3")).toBe("Text not overwritten");

    // On a table
    await createTable(model, "C1:C3");
    await setCellContent(model, "C1", "=D1");
    await setCellContent(model, "C3", "Text not overwritten");
    await setSelection(model, ["C1"]);
    await autofillAuto(model);
    expect(getCellRawContent(model, "C2")).toBe("=D2");
    expect(getCellRawContent(model, "C3")).toBe("Text not overwritten");
  });

  test("autofill with merge in selection", async () => {
    await merge(model, "A1:A2");
    await setCellContent(model, "A1", "1");
    await autofill(model, "A1:A3", "A9");
    expect(getMergeCellMap(model)).toEqual(
      XCToMergeCellMap(model, ["A1", "A2", "A4", "A5", "A7", "A8"])
    );
    expect(getMerges(model)).toEqual({
      "1": { bottom: 1, id: 1, left: 0, right: 0, top: 0 },
      "2": { bottom: 4, id: 2, left: 0, right: 0, top: 3 },
      "3": { bottom: 7, id: 3, left: 0, right: 0, top: 6 },
    });
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A4")).toBe("2");
    expect(getCellContent(model, "A7")).toBe("3");
  });

  test("autofill with merge greater than the grid size", async () => {
    model = await createModel({ sheets: [{ colNumber: 1, rowNumber: 5 }] });
    await merge(model, "A1:A2");
    await autofill(model, "A1:A2", "A5");
    expect(getMergeCellMap(model)).toEqual(XCToMergeCellMap(model, ["A1", "A2", "A3", "A4"]));
    expect(getMerges(model)).toEqual({
      "1": { bottom: 1, id: 1, left: 0, right: 0, top: 0 },
      "2": { bottom: 3, id: 2, left: 0, right: 0, top: 2 },
    });
  });

  test("autofill with merge in target (1)", async () => {
    await merge(model, "A3:A5");
    await setCellContent(model, "A1", "1");
    await setCellContent(model, "A2", "2");
    await autofill(model, "A1:A2", "A6");
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(getMerges(model)).toEqual({});
    expect(getCellContent(model, "A1")).toBe("1");
    expect(getCellContent(model, "A2")).toBe("2");
    expect(getCellContent(model, "A3")).toBe("3");
    expect(getCellContent(model, "A4")).toBe("4");
    expect(getCellContent(model, "A5")).toBe("5");
    expect(getCellContent(model, "A6")).toBe("6");
  });

  test("autofill with merge in target (2)", async () => {
    await merge(model, "A2:B2");
    await setCellContent(model, "B1", "1");
    await autofill(model, "B1", "B2");
    expect(Object.keys(getMergeCellMap(model))).toEqual([]);
    expect(getMerges(model)).toEqual({});
    expect(getCellContent(model, "B1")).toBe("1");
    expect(getCellContent(model, "B2")).toBe("1");
  });

  test("Autofill cross-sheet references", async () => {
    await createSheet(model, { sheetId: "42" });
    await setCellContent(model, "A1", "=Sheet2!A1");
    await autofill(model, "A1", "A3");
    expect(getCellText(model, "A2")).toBe("=Sheet2!A2");
    expect(getCellText(model, "A3")).toBe("=Sheet2!A3");
  });

  test("Autofill cross-sheet references with a space in the name", async () => {
    await createSheetWithName(model, { sheetId: "42" }, "Sheet 2");
    await setCellContent(model, "A1", "='Sheet 2'!A1");
    await autofill(model, "A1", "A3");
    expect(getCellText(model, "A2")).toBe("='Sheet 2'!A2");
    expect(getCellText(model, "A3")).toBe("='Sheet 2'!A3");
  });

  test("date tooltip is formatted", async () => {
    await setCellContent(model, "A1", "10/10/2021");
    expect(await autofillTooltip("A1", "A2")).toBe("10/11/2021");
    expect(await autofillTooltip("A1", "A3")).toBe("10/12/2021");
  });

  test("copy number tooltip is formatted", async () => {
    await updateCell(model, "A1", { content: "1", format: "0.00%" });
    expect(await autofillTooltip("A1", "A2")).toBe("100.00%");
  });

  test("increment number tooltip is formatted", async () => {
    await updateCell(model, "A1", { content: "1", format: "0.00%" });
    await updateCell(model, "A2", { content: "2", format: "0.00%" });
    expect(await autofillTooltip("A1:A2", "A3")).toBe("300.00%");
  });

  test("formula tooltip shows the adapted formula", async () => {
    await setCellContent(model, "A1", "=B1");
    expect(await autofillTooltip("A1", "A2")).toBe("=B2");
  });

  test("link tooltip is formatted", async () => {
    await setCellContent(model, "A1", "[label](url)");
    expect(await autofillTooltip("A1", "A2")).toBe("label");
  });
});
