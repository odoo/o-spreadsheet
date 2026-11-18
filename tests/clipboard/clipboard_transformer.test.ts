import { Model } from "../../src";
import { parseOSClipboardContent } from "../../src/helpers/clipboard/clipboard_helpers";
import {
  CrossSpreadsheetClipboardTransformer,
  crossSpreadsheetClipboardTransformerRegistry,
} from "../../src/registries/clipboard_handlers_registries";
import { ClipboardStore } from "../../src/stores/clipboard_store";
import { Store } from "../../src/types/store_engine";
import {
  addDataValidation,
  addEqualCf,
  copy,
  getCellText,
  paste,
  pasteFromOSClipboard,
  setCellContent,
} from "../test_helpers";
import { makeStore } from "../test_helpers/stores";

/**
 * A bogus cross spreadsheet transformer for testing purposes.
 * It collects all the SUM formulas from the copied content, transforms them to either PRODUCT
 * or MINUS depending on if a formula has the number "42", and writes something in A1 to confirm the operation was done.
 */
const sumTransformer: CrossSpreadsheetClipboardTransformer<any, any> = {
  collectData(getters, copiedContent, handlers) {
    const sums: string[] = [];
    for (const { handlerName, handler } of handlers) {
      handler.mapFormulas(copiedContent[handlerName], (formula) => {
        if (formula.includes("SUM")) {
          sums.push(formula);
        }
        return formula;
      });
    }
    return sums;
  },
  onCrossSpreadsheetPaste(getters, dispatch, sums: string[]) {
    dispatch("UPDATE_CELL", {
      sheetId: getters.getActiveSheetId(),
      col: 0,
      row: 0,
      content: `Sums transformed !`,
    });
    const replaceWith = sums.some((formula) => formula.includes("42")) ? "PRODUCT" : "MINUS";
    return replaceWith;
  },
  transform(replaceWith, copiedContent, handlers) {
    for (const { handlerName, handler } of handlers) {
      handler.mapFormulas(copiedContent[handlerName], (formula) => {
        return formula.replace("SUM", replaceWith);
      });
    }
  },
};

describe("Cross spreadsheet clipboard transformer", () => {
  let modelA: Model;
  let storeA: Store<ClipboardStore>;
  let modelB: Model;

  beforeEach(() => {
    ({ model: modelA, store: storeA } = makeStore(ClipboardStore));
    ({ model: modelB } = makeStore(ClipboardStore));
    crossSpreadsheetClipboardTransformerRegistry.add("sumTransformer", sumTransformer);
  });

  afterEach(() => {
    crossSpreadsheetClipboardTransformerRegistry.remove("sumTransformer");
  });

  test("Can transform a SUM cell", async () => {
    setCellContent(modelA, "A1", "=SUM(1,2)");

    copy(modelA, "A1:A2");
    const osClipboardContent = parseOSClipboardContent(
      await storeA.getClipboardTextAndImageContent()
    );
    pasteFromOSClipboard(modelB, "E1", osClipboardContent);

    expect(getCellText(modelB, "A1")).toBe("Sums transformed !");
    expect(getCellText(modelB, "E1")).toBe("=MINUS(1,2)");
  });

  test("Formulas in CFs/DVs are also transformed", async () => {
    setCellContent(modelA, "A1", "=SUM(1,2)");
    addEqualCf(modelA, "A1:A2", { bold: true }, "=SUM(42)");
    addDataValidation(modelA, "A1:A2", "id", { type: "isEqual", values: ["=SUM(B1)"] });

    copy(modelA, "A1:A2");
    const osClipboardContent = parseOSClipboardContent(
      await storeA.getClipboardTextAndImageContent()
    );
    pasteFromOSClipboard(modelB, "E1", osClipboardContent);

    expect(getCellText(modelB, "A1")).toBe("Sums transformed !");
    expect(getCellText(modelB, "E1")).toBe("=PRODUCT(1,2)");

    const sheetId = modelB.getters.getActiveSheetId();
    expect(modelB.getters.getDataValidationRules(sheetId)[0]?.criterion.values).toEqual([
      "=PRODUCT(B1)",
    ]);

    expect(modelB.getters.getConditionalFormats(sheetId)[0]?.rule).toMatchObject({
      values: ["=PRODUCT(42)"],
    });
  });

  test("Transformer is not used on normal copy paste", () => {
    setCellContent(modelA, "A1", "=SUM(1,2)");
    copy(modelA, "A1:A2");

    paste(modelA, "E1");
    expect(getCellText(modelA, "A1")).toBe("=SUM(1,2)");
    expect(getCellText(modelA, "E1")).toBe("=SUM(1,2)");
  });
});
