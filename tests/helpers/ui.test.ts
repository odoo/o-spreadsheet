import { interactiveCut } from "../../src/helpers/ui/cut_interactive";
import {
  AddMergeInteractiveContent,
  interactiveAddMerge,
} from "../../src/helpers/ui/merge_interactive";
import {
  interactivePaste,
  interactivePasteFromOS,
  PasteInteractiveContent,
} from "../../src/helpers/ui/paste_interactive";
import { interactiveRenameSheet } from "../../src/helpers/ui/sheet_interactive";
import { Model } from "../../src/model";
import { EditTextOptions, SpreadsheetChildEnv, UID } from "../../src/types";
import {
  addCellToSelection,
  copy,
  createChart,
  createSheetWithName,
  cut,
  merge,
  selectCell,
  setCellContent,
  setSelection,
} from "../test_helpers/commands_helpers";
import { getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import { makeInteractiveTestEnv, target } from "../test_helpers/helpers";

describe("Interactive rename sheet", () => {
  test.each([
    ["", "The sheet name cannot be empty."],
    [
      "hééélo///",
      "Some used characters are not allowed in a sheet name (Forbidden characters are ' * ? / \\ [ ]).",
    ],
  ])(
    "Rename a sheet with interaction with wrong name %s",
    async (sheetName, expectedErrorMessage) => {
      const nameCallback = jest.fn().mockReturnValueOnce(sheetName).mockReturnValueOnce("new name");
      const titleTextSpy = jest.fn();
      const errorTextSpy = jest.fn();
      const editText = (
        title: string,
        callback: (text: string | null) => any,
        options: EditTextOptions | undefined
      ) => {
        titleTextSpy(title.toString());
        errorTextSpy(options?.error?.toString());
        callback(nameCallback());
      };
      const model = new Model({});
      const env = makeInteractiveTestEnv(model, { editText });
      interactiveRenameSheet(env, model.getters.getActiveSheetId());
      expect(titleTextSpy).toHaveBeenCalledTimes(2);
      expect(titleTextSpy).toHaveBeenNthCalledWith(1, "Rename Sheet");
      expect(titleTextSpy).toHaveBeenNthCalledWith(2, "Rename Sheet");
      expect(errorTextSpy).toHaveBeenCalledTimes(2);
      expect(errorTextSpy).toHaveBeenNthCalledWith(1, undefined);
      expect(errorTextSpy).toHaveBeenNthCalledWith(2, expectedErrorMessage);
    }
  );

  test("Rename a sheet with interaction with same name as other sheet", async () => {
    const sheetName = "existing sheet";
    const nameCallback = jest.fn().mockReturnValueOnce(sheetName).mockReturnValueOnce("new name");
    const titleTextSpy = jest.fn();
    const errorTextSpy = jest.fn();
    const editText = (
      title: string,
      callback: (text: string | null) => any,
      options: EditTextOptions | undefined
    ) => {
      titleTextSpy(title.toString());
      errorTextSpy(options?.error?.toString());
      callback(nameCallback());
    };
    const model = new Model({});
    const env = makeInteractiveTestEnv(model, { editText });
    createSheetWithName(model, { sheetId: "42", activate: false }, sheetName);
    interactiveRenameSheet(env, model.getters.getActiveSheetId());
    expect(titleTextSpy).toHaveBeenCalledTimes(2);
    expect(titleTextSpy).toHaveBeenCalledWith("Rename Sheet");
    expect(errorTextSpy).toHaveBeenCalledTimes(2);
    expect(errorTextSpy).toHaveBeenNthCalledWith(1, undefined);
    expect(errorTextSpy).toHaveBeenNthCalledWith(
      2,
      `A sheet with the name ${sheetName} already exists. Please select another name.`
    );
  });
});

describe("UI Helpers", () => {
  let env: SpreadsheetChildEnv;
  let notifyUserTextSpy: jest.Mock<any, any>;
  let askConfirmationTextSpy: jest.Mock<any, any>;
  let model: Model;
  let sheetId: UID;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    notifyUserTextSpy = jest.fn();
    askConfirmationTextSpy = jest.fn();
    const notifyUser = (content: string) => {
      notifyUserTextSpy(content.toString());
    };
    const askConfirmation = (content: string, confirm: () => any, cancel?: () => any) => {
      askConfirmationTextSpy(content.toString());
    };
    env = makeInteractiveTestEnv(model, { notifyUser, askConfirmation });
  });

  describe("Interactive paste", () => {
    test("paste without copied value interactively", () => {
      interactivePaste(env, target("D2"));
      expect(getCellContent(model, "D2")).toBe("");
    });

    test("Interactive paste paste options are working", async () => {
      const style = { fontSize: 36 };
      setCellContent(model, "A1", "=42");
      model.dispatch("UPDATE_CELL", { sheetId, col: 0, row: 0, style });

      copy(model, "A1");
      const env = makeInteractiveTestEnv(model);
      interactivePaste(env, target("B1"), "onlyFormat");
      interactivePaste(env, target("B2"), "onlyValue");
      interactivePaste(env, target("B3"));

      expect(getCellText(model, "B1")).toBe("");
      expect(getCell(model, "B1")!.style).toEqual(style);

      expect(getCellText(model, "B2")).toBe("42");
      expect(getCell(model, "B2")!.style).toBeUndefined();

      expect(getCellText(model, "B3")).toBe("=42");
      expect(getCell(model, "B3")!.style).toEqual(style);
    });

    test("paste a zone with more than one value will warn user", async () => {
      cut(model, "A1:A2");

      selectCell(model, "C4");
      addCellToSelection(model, "F6");
      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });

    test("paste a zone with more than one value will warn user", async () => {
      copy(model, "A1:A2");

      // select C4 and F6
      selectCell(model, "C4");
      addCellToSelection(model, "F6");

      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });

    test("will warn user if paste in several selection", () => {
      copy(model, "A1", "C1");
      interactivePaste(env, target("A2, B2"));
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });

    test("paste special with a figure will warn the user", async () => {
      createChart(model, {}, "chartId");
      model.dispatch("SELECT_FIGURE", { id: "chartId" });
      copy(model);
      interactivePaste(env, target("A1"), "onlyFormat");
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongFigurePasteOption.toString()
      );
    });

    test("Pasting content that will destroy a merge will notify the user", async () => {
      merge(model, "B2:C3");
      copy(model, "B2");
      selectCell(model, "A1");
      interactivePaste(env, model.getters.getSelectedZones());
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.willRemoveExistingMerge.toString()
      );
    });

    describe("Paste from OS", () => {
      const clipboardString = "a\t1\nb\t2";

      test("Can interactive paste", () => {
        interactivePasteFromOS(env, target("D2"), clipboardString);
        expect(getCellContent(model, "D2")).toBe("a");
        expect(getCellContent(model, "E2")).toBe("1");
        expect(getCellContent(model, "D3")).toBe("b");
        expect(getCellContent(model, "E3")).toBe("2");
      });

      test("Pasting content that will destroy a merge will notify the user", async () => {
        merge(model, "B2:C3");
        selectCell(model, "A1");
        interactivePasteFromOS(env, model.getters.getSelectedZones(), clipboardString);
        expect(notifyUserTextSpy).toHaveBeenCalledWith(
          PasteInteractiveContent.willRemoveExistingMerge.toString()
        );
      });
    });
  });

  describe("Interactive cut", () => {
    test("cutting with multiple selection will warn user", async () => {
      setSelection(model, ["A1", "A2"]);
      interactiveCut(env);
      expect(notifyUserTextSpy).toHaveBeenCalledWith(
        PasteInteractiveContent.wrongPasteSelection.toString()
      );
    });
  });

  describe("Interactive Merge", () => {
    test("Successfully Create a merge", () => {
      interactiveAddMerge(env, sheetId, target("A1:B5"));
      expect(askConfirmationTextSpy).toHaveBeenCalledTimes(0);
      expect(notifyUserTextSpy).toHaveBeenCalledTimes(0);
    });

    test("Destructive merge", () => {
      setCellContent(model, "A2", ":)");
      interactiveAddMerge(env, sheetId, target("A1:B5"));
      expect(askConfirmationTextSpy).toHaveBeenCalledWith(
        AddMergeInteractiveContent.mergeIsDestructive.toString()
      );
    });
  });
});
