import { zoneToXc } from "../../src/helpers";
import { Model } from "../../src/model";
import { CommandResult, coreTypes, UID } from "../../src/types";
import {
  activateSheet,
  addColumns,
  addRows,
  createSheet,
  redo,
  resizeColumns,
  resizeRows,
  selectCell,
  setCellContent,
  setCellFormat,
  setFormat,
  setStyle,
  setZoneBorders,
  undo,
} from "../test_helpers/commands_helpers";
import {
  getCell,
  getCellContent,
  getEvaluatedCell,
  getRangeFormattedValues,
  getRangeValues,
} from "../test_helpers/getters_helpers";
import { makeTestComposerStore, toRangesData } from "../test_helpers/helpers";

describe("core", () => {
  describe("format", () => {
    test("format cell that point to an empty cell properly", () => {
      const model = new Model();
      setCellContent(model, "A1", "=A2");

      expect(getCellContent(model, "A1")).toBe("0");
    });

    test("format cell without content: empty string", () => {
      const model = new Model();
      selectCell(model, "B2");
      setZoneBorders(model, { position: "bottom" });
      expect(getCellContent(model, "B2")).toBe("");
    });

    test("format cell with the zero value", () => {
      const model = new Model();
      setCellContent(model, "A1", "0");
      selectCell(model, "A1");
      setFormat(model, "A1", "0.00000");
      expect(getCellContent(model, "A1")).toBe("0.00000");
      setCellContent(model, "A2", "0");
      setFormat(model, "A2", "0.00%");
      expect(getCellContent(model, "A2")).toBe("0.00%");
    });

    test("evaluate properly a cell with a style just recently applied", () => {
      const model = new Model();
      setCellContent(model, "A1", "=sum(A2) + 1");
      setStyle(model, "A1", { bold: true });
      expect(getCellContent(model, "A1")).toEqual("1");
    });

    test("format cell to a boolean value", () => {
      const model = new Model();
      setCellContent(model, "A1", "=false");
      setCellContent(model, "A2", "=true");

      expect(getCellContent(model, "A1")).toBe("FALSE");
      expect(getCellContent(model, "A2")).toBe("TRUE");
    });

    describe("detect format number automatically", () => {
      test("if contain currency", () => {
        const model = new Model();
        setCellContent(model, "A1", "3$");
        setCellContent(model, "A2", "-$3");
        setCellContent(model, "A3", "$-3");
        setCellContent(model, "A4", "$-3.123");

        setCellContent(model, "A5", "3€");
        setCellContent(model, "A6", "-€3");
        setCellContent(model, "A7", "€-3");
        setCellContent(model, "A8", "€-3.123");

        expect(getCellContent(model, "A1")).toBe("3$");
        expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");
        expect(getCellContent(model, "A2")).toBe("-$3");
        expect(getEvaluatedCell(model, "A2").format).toBe("[$$]#,##0");
        expect(getCellContent(model, "A3")).toBe("-$3");
        expect(getEvaluatedCell(model, "A3").format).toBe("[$$]#,##0");
        expect(getCellContent(model, "A4")).toBe("-$3.12");
        expect(getEvaluatedCell(model, "A4").format).toBe("[$$]#,##0.00");

        expect(getCellContent(model, "A5")).toBe("3€");
        expect(getEvaluatedCell(model, "A5").format).toBe("#,##0[$€]");
        expect(getCellContent(model, "A6")).toBe("-€3");
        expect(getEvaluatedCell(model, "A6").format).toBe("[$€]#,##0");
        expect(getCellContent(model, "A7")).toBe("-€3");
        expect(getEvaluatedCell(model, "A7").format).toBe("[$€]#,##0");
        expect(getCellContent(model, "A8")).toBe("-€3.12");
        expect(getEvaluatedCell(model, "A8").format).toBe("[$€]#,##0.00");
      });

      test("if contain percent", () => {
        const model = new Model();
        setCellContent(model, "A1", "3%");
        setCellContent(model, "A2", "3.4%");
        expect(getCellContent(model, "A1")).toBe("3%");
        expect(getEvaluatedCell(model, "A1").format).toBe("0%");
        expect(getCellContent(model, "A2")).toBe("3.40%");
        expect(getEvaluatedCell(model, "A2").format).toBe("0.00%");
      });

      test("currency format most important than percent format", () => {
        const model = new Model();
        setCellContent(model, "A1", "12300%$");
        expect(getCellContent(model, "A1")).toBe("123$");
        expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");

        setCellContent(model, "A2", "€12300%");
        expect(getCellContent(model, "A2")).toBe("€123");
        expect(getEvaluatedCell(model, "A2").format).toBe("[$€]#,##0");
      });
    });
    describe("detect format formula automatically", () => {
      test("from formula without return format", () => {
        const model = new Model();
        setCellContent(model, "A1", "=CONCAT(4,2)");
        expect(getEvaluatedCell(model, "A1").format).toBe(undefined);
      });

      test("from formula without return format and format seted on the formula", () => {
        const model = new Model();
        setCellContent(model, "A1", "=CONCAT(4,2)");
        setCellFormat(model, "A1", "#,##0[$$]");
        expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");
      });

      test("from formula with return format", () => {
        const model = new Model();
        setCellContent(model, "A1", "=TIME(42,42,42)");
        expect(getEvaluatedCell(model, "A1").format).toBe("hh:mm:ss a");
      });

      test("from formula with return format and format seted on the formula", () => {
        const model = new Model();
        setCellContent(model, "A1", "=TIME(42,42,42)");
        setCellFormat(model, "A1", "#,##0[$$]");
        expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");
      });

      describe("from formula depending on the reference", () => {
        test("with the reference declared before the formula", () => {
          const model = new Model();
          setCellContent(model, "A1", "3%");
          expect(getEvaluatedCell(model, "A1").format).toBe("0%");

          setCellContent(model, "A2", "=1+A1");
          expect(getEvaluatedCell(model, "A1").format).toBe("0%");
          expect(getEvaluatedCell(model, "A2").format).toBe("0%");
        });

        test("with a reference to an empty cell", () => {
          const model = new Model();
          setCellFormat(model, "A1", "#,##0[$$]");
          setCellContent(model, "A2", "=A1");
          expect(getEvaluatedCell(model, "A2")?.format).toBe("#,##0[$$]");
        });

        test("with the reference declared before the formula and format applied on the formula", () => {
          const model = new Model();
          setCellContent(model, "A1", "3%");
          expect(getEvaluatedCell(model, "A1").format).toBe("0%");

          setCellContent(model, "A2", "=1+A1");
          setCellFormat(model, "A2", "#,##0[$$]");
          expect(getEvaluatedCell(model, "A1").format).toBe("0%");
          expect(getEvaluatedCell(model, "A2").format).toBe("#,##0[$$]");
        });

        test("with the reference declared before the formula and format applied on the reference", () => {
          const model = new Model();
          setCellContent(model, "A1", "3%");
          expect(getEvaluatedCell(model, "A1").format).toBe("0%");

          setCellContent(model, "A2", "=1+A1");
          setCellFormat(model, "A1", "#,##0[$$]");
          expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");
          expect(getEvaluatedCell(model, "A2").format).toBe("#,##0[$$]");
        });

        test("with the formula declared before the reference ", () => {
          const model = new Model();
          setCellContent(model, "A1", "=1+A2");
          expect(getEvaluatedCell(model, "A1").format).toBe(undefined);

          setCellContent(model, "A2", "3%");
          expect(getEvaluatedCell(model, "A1").format).toBe("0%");
          expect(getEvaluatedCell(model, "A2").format).toBe("0%");
        });

        test("with the formula declared before the reference and format seted on the formula", () => {
          const model = new Model();
          setCellContent(model, "A1", "=1+A2");
          expect(getEvaluatedCell(model, "A1").format).toBe(undefined);

          setCellFormat(model, "A1", "#,##0[$$]");
          setCellContent(model, "A2", "3%");
          expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");
          expect(getEvaluatedCell(model, "A2").format).toBe("0%");
        });

        test("with the formula declared before the reference and format seted on the reference", () => {
          const model = new Model();
          setCellContent(model, "A1", "=1+A2");
          expect(getEvaluatedCell(model, "A1").format).toBe(undefined);

          setCellContent(model, "A2", "3%");
          setCellFormat(model, "A2", "#,##0[$$]");
          expect(getEvaluatedCell(model, "A1").format).toBe("#,##0[$$]");
          expect(getEvaluatedCell(model, "A2").format).toBe("#,##0[$$]");
        });
      });
    });
  });

  test("does not reevaluate cells if edition does not change content", () => {
    const model = new Model();
    const composerStore = makeTestComposerStore(model);
    setCellContent(model, "A1", "=rand()");

    expect(getEvaluatedCell(model, "A1").value).toBeDefined();
    const val = getEvaluatedCell(model, "A1").value;

    composerStore.startEdition();
    composerStore.stopEdition();
    expect(getEvaluatedCell(model, "A1").value).toBe(val);
  });

  test("core cell getter does not crash if invalid col/row", () => {
    const model = new Model();
    const sheetId = model.getters.getActiveSheetId();
    expect(model.getters.getCell({ sheetId, col: -1, row: -1 })).toBeUndefined();
  });

  test("single cell XC conversion", () => {
    const model = new Model({});
    expect(
      model.getters.zoneToXC(
        model.getters.getActiveSheetId(),
        /*A1*/ { top: 0, left: 0, right: 0, bottom: 0 }
      )
    ).toBe("A1");
  });

  test("multi cell zone XC conversion", () => {
    const model = new Model({});
    expect(
      model.getters.zoneToXC(
        model.getters.getActiveSheetId(),
        /*A1:B2*/ { top: 0, left: 0, right: 1, bottom: 1 }
      )
    ).toBe("A1:B2");
  });

  test("xc is expanded to overlapping merges", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B2"] }] });
    expect(
      model.getters.zoneToXC(
        model.getters.getActiveSheetId(),
        /*A2:B3*/ { top: 1, bottom: 2, left: 0, right: 1 }
      )
    ).toBe("A1:B3");
  });

  test("zone is across two merges", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B2", "A4:B5"] }],
    });
    expect(
      model.getters.zoneToXC(
        model.getters.getActiveSheetId(),
        /*A2:B4*/ { top: 1, bottom: 3, left: 0, right: 1 }
      )
    ).toBe("A1:B5");
  });

  test("merge is considered as one single cell", () => {
    const model = new Model({ sheets: [{ colNumber: 10, rowNumber: 10, merges: ["A1:B2"] }] });
    expect(
      model.getters.zoneToXC(
        model.getters.getActiveSheetId(),
        /*A2:B2*/ { top: 1, bottom: 1, left: 0, right: 1 }
      )
    ).toBe("A1");
  });

  test("can get row/col of inactive sheet", () => {
    const model = new Model();
    createSheet(model, { sheetId: "42" });
    const [, sheet2Id] = model.getters.getSheetIds();
    resizeRows(model, [0], 24, sheet2Id);
    resizeColumns(model, ["A"], 42, sheet2Id);
    expect(sheet2Id).not.toBe(model.getters.getActiveSheetId());
    expect(model.getters.getRowSize(sheet2Id, 0)).toEqual(24);
    expect(model.getters.getColSize(sheet2Id, 0)).toEqual(42);
  });

  test("can get row/col number of inactive sheet", () => {
    const model = new Model({
      sheets: [
        { colNumber: 10, rowNumber: 10, id: "1" },
        { colNumber: 19, rowNumber: 29, id: "2" },
      ],
    });
    expect(model.getters.getActiveSheetId()).not.toBe("2");
    expect(model.getters.getNumberRows("2")).toEqual(29);
    expect(model.getters.getNumberCols("2")).toEqual(19);
  });

  test("Range with absolute references are correctly updated on rows manipulation", () => {
    const model = new Model();
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "=SUM($C$1:$C$5)");
    addRows(model, "after", 2, 1);
    expect(getCellContent(model, "A1")).toBe("=SUM($C$1:$C$6)");
    addRows(model, "before", 0, 1);
    expect(getCellContent(model, "A2")).toBe("=SUM($C$2:$C$7)");
  });

  test("Absolute references are correctly updated on rows manipulation", () => {
    const model = new Model();
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "=SUM($C$1)");
    addRows(model, "after", 2, 1);
    expect(getCellContent(model, "A1")).toBe("=SUM($C$1)");
    addRows(model, "before", 0, 1);
    expect(getCellContent(model, "A2")).toBe("=SUM($C$2)");
  });

  test("Range with absolute references are correctly updated on columns manipulation", () => {
    const model = new Model();
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "=SUM($A$2:$E$2)");
    addColumns(model, "after", "C", 1);
    expect(getCellContent(model, "A1")).toBe("=SUM($A$2:$F$2)");
    addColumns(model, "before", "A", 1);
    expect(getCellContent(model, "B1")).toBe("=SUM($B$2:$G$2)");
  });

  test("Absolute references are correctly updated on columns manipulation", () => {
    const model = new Model();
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    setCellContent(model, "A1", "=SUM($A$2)");
    addColumns(model, "after", "C", 1);
    expect(getCellContent(model, "A1")).toBe("=SUM($A$2)");
    addColumns(model, "before", "A", 1);
    expect(getCellContent(model, "B1")).toBe("=SUM($B$2)");
  });
});

describe("history", () => {
  test("can undo and redo a add cell operation", () => {
    const model = new Model();

    expect(model.getters.canUndo()).toBe(false);

    setCellContent(model, "A1", "abc");
    expect(model.getters.canUndo()).toBe(true);

    undo(model);
    expect(getCell(model, "A1")).toBeUndefined();
    expect(model.getters.canUndo()).toBe(false);

    redo(model);
    expect(getCellContent(model, "A1")).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);
  });

  test("can undo and redo a cell update", () => {
    const model = new Model({
      sheets: [{ colNumber: 10, rowNumber: 10, cells: { A1: { content: "1" } } }],
    });
    const composerStore = makeTestComposerStore(model);

    expect(model.getters.canUndo()).toBe(false);

    composerStore.startEdition("abc");
    composerStore.stopEdition();

    expect(getCellContent(model, "A1")).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);

    undo(model);
    expect(getCellContent(model, "A1")).toBe("1");
    expect(model.getters.canUndo()).toBe(false);

    redo(model);
    expect(getCellContent(model, "A1")).toBe("abc");
    expect(model.getters.canUndo()).toBe(true);
  });

  test("can undo and redo a delete cell operation", () => {
    const model = new Model();
    setCellContent(model, "A2", "3");

    expect(getCellContent(model, "A2")).toBe("3");
    selectCell(model, "A2");
    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    });
    expect(getCell(model, "A2")).toBeUndefined();

    undo(model);
    expect(getCellContent(model, "A2")).toBe("3");

    redo(model);
    expect(getCell(model, "A2")).toBeUndefined();
  });

  test("can delete a cell with a style", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    setStyle(model, "A1", { bold: true });
    expect(getCellContent(model, "A1")).toBe("3");

    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
    });
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("can delete a cell with a border", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    setZoneBorders(model, { position: "bottom" }, ["A1"]);

    expect(getCellContent(model, "A1")).toBe("3");

    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
    });
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("can delete a cell with a format", () => {
    const model = new Model();
    setCellContent(model, "A1", "3");
    setFormat(model, "A1", "#,##0.00");

    expect(getCellContent(model, "A1")).toBe("3.00");

    model.dispatch("DELETE_CONTENT", {
      sheetId: model.getters.getActiveSheetId(),
      target: [{ left: 0, top: 0, right: 0, bottom: 0 }],
    });
    expect(getCellContent(model, "A1")).toBe("");
  });

  test("setting a date to a cell will reformat it", () => {
    const model = new Model();
    setCellContent(model, "A1", "03/2/2011");
    setCellContent(model, "A2", " 03/12/2011");
    expect(getCellContent(model, "A1")).toBe("03/02/2011");
    expect(getCellContent(model, "A2")).toBe("03/12/2011");
  });

  test("get cell formula text", () => {
    const model = new Model();
    setCellContent(model, "A1", "=SUM(1, 2)");
    setCellContent(model, "A2", "This is Patrick");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(getCellContent(model, "A1")).toBe("=SUM(1, 2)");
    expect(getCellContent(model, "A2")).toBe("This is Patrick");
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    expect(getCellContent(model, "A1")).toBe("3");
    expect(getCellContent(model, "A2")).toBe("This is Patrick");
  });

  test("set formula visibility is idempotent", () => {
    const model = new Model();
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(model.getters.shouldShowFormulas()).toBe(true);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: true });
    expect(model.getters.shouldShowFormulas()).toBe(true);
    model.dispatch("SET_FORMULA_VISIBILITY", { show: false });
    expect(model.getters.shouldShowFormulas()).toBe(false);
  });

  test("Cannot update a cell in invalid sheet", async () => {
    const model = new Model();
    expect(setCellContent(model, "B2", "hello", "invalid")).toBeCancelledBecause(
      CommandResult.InvalidSheetId
    );
  });

  test("Can select a cell in another sheet", async () => {
    const model = new Model({
      sheets: [
        { id: "1", cells: { A1: { content: "Sheet1A1" } } },
        { id: "2", cells: { A1: { content: "Sheet2A1" } } },
      ],
    });
    expect(getCellContent(model, "A1", "1")).toBe("Sheet1A1");
    expect(getCellContent(model, "A1", "2")).toBe("Sheet2A1");
  });

  describe("getters", () => {
    test("getRangeFormattedValues", () => {
      const sheet1Id = "42";
      const sheet2Id = "43";
      const model = new Model({
        sheets: [
          {
            id: sheet1Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "1000" },
              A3: { content: "2000" },
              B2: { content: "TRUE" },
            },
            formats: {
              A1: 1,
              A3: 1,
              B2: 1,
            },
          },
          {
            id: sheet2Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "21000" },
              A3: { content: "12-31-2020" },
              B2: { content: "TRUE" },
            },
            formats: {
              A1: 1,
              A3: 2,
              B2: 1,
            },
          },
        ],
        formats: { "1": "#,##0", "2": "mm/dd/yyyy" },
      });
      activateSheet(model, sheet2Id); // evaluate Sheet2
      expect(getRangeFormattedValues(model, "A1:A3", sheet1Id)).toEqual(["1,000", "", "2,000"]);
      expect(getRangeFormattedValues(model, "$A$1:$A$3", sheet1Id)).toEqual(["1,000", "", "2,000"]);
      expect(getRangeFormattedValues(model, "Sheet1!A1:A3", sheet1Id)).toEqual([
        "1,000",
        "",
        "2,000",
      ]);
      expect(getRangeFormattedValues(model, "Sheet2!A1:A3", sheet2Id)).toEqual([
        "21,000",
        "",
        "12/31/2020",
      ]);
      expect(getRangeFormattedValues(model, "Sheet2!A1:A3", sheet1Id)).toEqual([
        "21,000",
        "",
        "12/31/2020",
      ]);
      expect(getRangeFormattedValues(model, "'Sheet2'!A1:A3", sheet1Id)).toEqual([
        "21,000",
        "",
        "12/31/2020",
      ]);
      expect(getRangeFormattedValues(model, "B2", sheet1Id)).toEqual(["TRUE"]);
      expect(getRangeFormattedValues(model, "Sheet1!B2", sheet1Id)).toEqual(["TRUE"]);
      expect(getRangeFormattedValues(model, "Sheet2!B2", sheet2Id)).toEqual(["TRUE"]);
      expect(getRangeFormattedValues(model, "Sheet2!B2", sheet1Id)).toEqual(["TRUE"]);
      expect(getRangeFormattedValues(model, "'Sheet2'!B2", sheet1Id)).toEqual(["TRUE"]);
    });

    test("getRangeValues", () => {
      const sheet1Id = "42";
      const sheet2Id = "43";
      const model = new Model({
        sheets: [
          {
            id: sheet1Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "1000", format: "#,##0" },
              A3: { content: "2000", format: "#,##0" },
              B2: { content: "TRUE", format: "#,##0" },
            },
          },
          {
            id: sheet2Id,
            colNumber: 10,
            rowNumber: 10,
            cells: {
              A1: { content: "21000", format: "#,##0" },
              A3: { content: "12-31-2020", format: "mm/dd/yyyy" },
              B2: { content: "TRUE", format: "#,##0" },
            },
          },
        ],
      });
      expect(getRangeValues(model, "A1:A3", sheet1Id)).toEqual([1000, null, 2000]);
      expect(getRangeValues(model, "$A$1:$A$3", sheet1Id)).toEqual([1000, null, 2000]);
      expect(getRangeValues(model, "Sheet1!A1:A3", sheet1Id)).toEqual([1000, null, 2000]);
      expect(getRangeValues(model, "Sheet2!A1:A3", sheet2Id)).toEqual([21000, null, 44196]);
      expect(getRangeValues(model, "Sheet2!A1:A3", sheet1Id)).toEqual([21000, null, 44196]);
      expect(getRangeValues(model, "B2", sheet1Id)).toEqual([true]);
      expect(getRangeValues(model, "Sheet1!B2", sheet1Id)).toEqual([true]);
      expect(getRangeValues(model, "Sheet2!B2", sheet2Id)).toEqual([true]);
      expect(getRangeValues(model, "Sheet2!B2", sheet1Id)).toEqual([true]);
      expect(getRangeValues(model, "B2", "invalidSheetId")).toEqual([]);
    });
  });
});

describe("Generic allowDispatch", () => {
  let model: Model;
  let sheetId: UID;

  function dispatch(type: string, payload: any) {
    //@ts-ignore
    return model.dispatch(type, payload);
  }

  beforeEach(() => {
    //@ts-ignore
    coreTypes.add("MY_CORE_CMD");
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  afterEach(() => {
    //@ts-ignore
    coreTypes.delete("MY_CORE_CMD");
  });

  describe.each(["MY_CORE_CMD", "My_UI_CMD"])("Generic allowDispatch", (cmdType: string) => {
    test("Sheet dependant command", () => {
      const result = dispatch(cmdType, { sheetId: "notARealSheet" });
      expect(result).toBeCancelledBecause(CommandResult.InvalidSheetId);
    });

    test("Zone dependant command", () => {
      const sheetZone = model.getters.getSheetZone(sheetId);
      const outOfSheetZone = { ...sheetZone, right: sheetZone.right + 10 };
      const result = dispatch(cmdType, { sheetId, zone: outOfSheetZone });
      expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });

    test("Target dependant command", () => {
      const sheetZone = model.getters.getSheetZone(sheetId);
      const outOfSheetZone = { ...sheetZone, right: sheetZone.right + 10 };
      const result = dispatch(cmdType, { sheetId, target: [outOfSheetZone] });
      expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });

    test("Range dependant command", () => {
      const sheetZone = model.getters.getSheetZone(sheetId);
      const outOfSheetZoneXc = zoneToXc({ ...sheetZone, right: sheetZone.right + 10 });
      const result = dispatch(cmdType, {
        sheetId,
        ranges: toRangesData(sheetId, outOfSheetZoneXc),
      });
      expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });

    test("Position dependant command", () => {
      const sheetZone = model.getters.getSheetZone(sheetId);
      const result = dispatch(cmdType, {
        sheetId,
        col: sheetZone.right + 1,
        row: sheetZone.bottom + 1,
      });
      expect(result).toBeCancelledBecause(CommandResult.TargetOutOfSheet);
    });
  });
});
