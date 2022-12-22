import {
  selectionIndicatorClass,
  tokenColors,
} from "../../src/components/composer/composer/composer";
import { colors, toCartesian, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { Highlight } from "../../src/types";
import { ContentEditableHelper } from "../__mocks__/content_editable_helper";
import { MockClipboardData, getClipboardEvent } from "../test_helpers/clipboard";
import {
  createSheet,
  createSheetWithName,
  merge,
  resizeAnchorZone,
  selectCell,
  setCellContent,
  updateLocale,
} from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import {
  click,
  keyDown,
  keyUp,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import {
  getCellContent,
  getCellText,
  getEvaluatedCell,
  getSelectionAnchorCellXc,
} from "../test_helpers/getters_helpers";
import {
  ComposerWrapper,
  mountComposerWrapper,
  nextTick,
  typeInComposerHelper,
} from "../test_helpers/helpers";
jest.mock("../../src/components/composer/content_editable_helper.ts", () =>
  require("../__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;
let cehMock: ContentEditableHelper;
let parent: ComposerWrapper;

function getHighlights(model: Model): Highlight[] {
  return model.getters.getHighlights();
}

async function startComposition(text?: string): Promise<HTMLDivElement> {
  parent.startComposition(text);
  await nextTick();
  // @ts-ignore
  cehMock = window.mockContentHelper;
  return fixture.querySelector("div.o-composer")! as HTMLDivElement;
}

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    parent.startComposition();
  }
  const composerEl = await typeInComposerHelper("div.o-composer", text, false);
  // @ts-ignore
  cehMock = window.mockContentHelper;
  return composerEl;
}

async function moveToStart() {
  // TODO: remove keyup at refactoring of content editable helper
  keyDown({ key: "Home" });
  keyUp({ key: "Home" });
}
async function moveToEnd() {
  await keyDown({ key: "End" });
  await keyUp({ key: "End" });
}

beforeEach(async () => {
  ({ model, parent, fixture } = await mountComposerWrapper());
});

describe("ranges and highlights", () => {
  test("=SU, the = should be colored", async () => {
    await typeInComposer("=SU");
    const contentColors = cehMock.colors;
    expect(contentColors["="]).toBe("#3da4ab");
    expect(contentColors["SU"]).toBe("#000");
  });

  test.each([
    "A1",
    "$A1",
    "A$1",
    "A1:B2",
    "Sheet1!A1",
    "Sheet1!A1:B2",
    "'Sheet1'!A1",
    "Sheet1!$A$1",
  ])("reference %s should be colored", async (ref) => {
    await typeInComposer(`=SUM(${ref})`);
    expect(cehMock.colors[ref]).toBe(colors[0]);
  });

  test("=Key DOWN in A1, should select and highlight A2", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2");
  });

  test("reference position is reset at each selection", async () => {
    composerEl = await typeInComposer("=");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(1);
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2");
    composerEl = await typeInComposer("+", false);
    expect(composerEl.textContent).toBe("=A2+");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(4);
    expect(model.getters.getEditionMode()).toBe("selecting");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2+A2");
  });

  test("=Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A3");
  });

  test("=Key RIGHT in A1, should select and highlight B1", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowRight" });
    expect(composerEl.textContent).toBe("=B1");
  });

  test("=Key RIGHT twice selects C1", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowRight" });
    await keyUp({ key: "ArrowRight" });
    expect(composerEl.textContent).toBe("=B1");
    await keyDown({ key: "ArrowRight" });
    await keyUp({ key: "ArrowRight" });
    expect(composerEl.textContent).toBe("=C1");
  });

  test("=Key UP in B2, should select and highlight B1", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowUp" });
    expect(composerEl.textContent).toBe("=B1");
  });

  test("=Key LEFT in B2, should select and highlight A2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowLeft" });
    expect(composerEl.textContent).toBe("=A2");
  });

  test("=Key DOWN and UP in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    await keyDown({ key: "ArrowUp" });
    expect(composerEl.textContent).toBe("=B2");
  });

  test("=key UP 2 times and key DOWN in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowUp" });
    await keyDown({ key: "ArrowUp" });
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=B2");
  });

  test("While selecting a ref, Shift+UP/DOWN/LEFT/RIGHT extend the range selection and updates the composer", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2");
    await keyDown({ key: "ArrowDown", shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:A3");
    await keyDown({ key: "ArrowRight", shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:B3");
    await keyDown({ key: "ArrowUp", shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:B2");
    await keyDown({ key: "ArrowLeft", shiftKey: true });
    expect(composerEl.textContent).toBe("=A2");
  });

  test("Create a ref with merges with keyboard -> the merge should be treated as one cell", async () => {
    selectCell(model, "B2");
    resizeAnchorZone(model, "down");
    resizeAnchorZone(model, "right");
    merge(model, "B2:C3");
    selectCell(model, "C1");
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=B2");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject(toZone("B2:C3"));
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=C4");
  });

  test("Create a ref overlapping merges by typing -> the merge is ignored if the range covers several cells", async () => {
    merge(model, "B2:C3");
    selectCell(model, "C1");
    composerEl = await typeInComposer("=B2:B10");
    expect(composerEl.textContent).toBe("=B2:B10");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject(toZone("B2:B10"));
    await keyDown({ key: "Escape" });
    await keyUp({ key: "Escape" });
    composerEl = await typeInComposer("=B2:B3");
    expect(composerEl.textContent).toBe("=B2:B3");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject(toZone("B2:B3"));
  });

  describe("change highlight position in the grid", () => {
    test("change the associated range in the composer ", async () => {
      composerEl = await typeInComposer("=SUM(B2)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C3"), zone: toZone("C3") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C3)");
    });

    test("highlights change handle unbounded ranges ", async () => {
      composerEl = await typeInComposer("=SUM(B:B)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B100"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1:C100") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C:C)");
    });

    test("change the first associated range in the composer when ranges are the same", async () => {
      composerEl = await typeInComposer("=SUM(B2, B2)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C3"), zone: toZone("C3") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C3, B2)");
    });

    test("the first range doesn't change if other highlight transit by the first range state ", async () => {
      composerEl = await typeInComposer("=SUM(B2, B1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B2"), zone: toZone("B2") },
        { unbounded: true }
      );
      model.selection.selectZone(
        { cell: toCartesian("B3"), zone: toZone("B3") },
        { unbounded: true }
      );

      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B2, B3)");
    });

    test("Changing superimposed highlights gives priority to the token at cursor", async () => {
      composerEl = await typeInComposer("=SUM(B1,B1,B1)");
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 9, end: 9 });
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B4"), zone: toZone("B4") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1,B4,B1)");
    });

    test("can change references of different length", async () => {
      composerEl = await typeInComposer("=SUM(B1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B1"), zone: toZone("B1:B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1:B2)");
    });

    test("can change references with sheetname", async () => {
      composerEl = await typeInComposer("=Sheet42!B1");
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B2"), zone: toZone("B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=Sheet42!B2");
    });

    test("change references of the current sheet", async () => {
      composerEl = await typeInComposer("=SUM(B1,Sheet42!B1)");
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B2"), zone: toZone("B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1,Sheet42!B2)");
    });

    test.each([
      ["=b$1", "=C$1"],
      ["=$b1", "=$C1"],
    ])("can change cells reference with index fixed", async (ref, resultRef) => {
      composerEl = await typeInComposer(ref);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe(resultRef);
    });

    test.each([
      ["=B1:B$2", "=C1:C$2"],
      ["=B1:$B$2", "=C1:$C$2"],
      ["=B1:$B2", "=C1:$C2"],
      ["=$B1:B2", "=$C1:C2"],
      ["=$B$1:B2", "=$C$1:C2"],
      ["=B$1:B2", "=C$1:C2"],
      ["=$B1:$B2", "=$C1:$C2"],
      ["=B$1:B$2", "=C$1:C$2"],
      ["=$B$1:$B$2", "=$C$1:$C$2"],
    ])("can change ranges reference with index fixed", async (ref, resultRef) => {
      composerEl = await typeInComposer(ref);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1:C2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe(resultRef);
    });

    test("can change cells merged reference", async () => {
      merge(model, "B1:B2");
      composerEl = await typeInComposer("=B1");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=C1");

      composerEl = await typeInComposer("+B2", false);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C2"), zone: toZone("C2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=C1+C2");
    });

    test("can change cells merged reference with index fixed", async () => {
      merge(model, "B1:B2");
      composerEl = await typeInComposer("=B$2");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1:B2"),
      });
      model.selection.selectZone(
        { cell: toCartesian("C1"), zone: toZone("C1:C2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=C$1:C$2");
    });

    test("references are expanded to include merges", async () => {
      merge(model, "C1:D1");
      composerEl = await typeInComposer("=A1:B1");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("A1:B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B1"), zone: toZone("B1:C1") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=B1:D1");
    });

    test("can change references of different length with index fixed", async () => {
      composerEl = await typeInComposer("=SUM($B$1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        zone: toZone("B1"),
      });
      model.selection.selectZone(
        { cell: toCartesian("B1"), zone: toZone("B1:B2") },
        { unbounded: true }
      );
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM($B$1:$B$2)");
    });
  });

  test("Can select full column as unbounded zone", async () => {
    composerEl = await typeInComposer("=");
    model.selection.selectColumn(2, "newAnchor");
    await nextTick();
    expect(composerEl.textContent).toBe("=C:C");
  });

  test("Can select full row as unbounded zone", async () => {
    composerEl = await typeInComposer("=");
    model.selection.selectRow(2, "newAnchor");
    await nextTick();
    expect(composerEl.textContent).toBe("=3:3");
  });
});

describe("composer", () => {
  test("type '=', select a cell, press enter", async () => {
    composerEl = await typeInComposer("=");
    selectCell(model, "C8");
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
    await keyDown({ key: "Enter" });
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCellText(model, "A1")).toBe("=C8");
  });

  test("full rows/cols ranges are correctly displayed", async () => {
    composerEl = await typeInComposer("=SUM(A:A)");
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe("=SUM(A:A)");
  });

  test("clicking on the composer while typing text (not formula) does not duplicates text", async () => {
    composerEl = await typeInComposer("a");
    await simulateClick(composerEl);
    expect(composerEl.textContent).toBe("a");
  });

  test("typing incorrect formula then enter exits the edit mode and moves to the next cell down", async () => {
    composerEl = await typeInComposer("=qsdf");
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe("=qsdf");
    expect(getEvaluatedCell(model, "A1").value).toBe("#BAD_EXPR");
  });

  test("typing text then enter exits the edit mode and moves to the next cell down", async () => {
    composerEl = await startComposition();
    await typeInComposer("qsdf");
    await keyDown({ key: "Enter" });
    expect(getCellContent(model, "A1")).toBe("qsdf");
    expect(getEvaluatedCell(model, "A1").value).toBe("qsdf");
  });

  test("keyup event triggered after edition end", async () => {
    await startComposition("d");
    expect(model.getters.getEditionMode()).toBe("editing");
    // Enter is pressed really fast while another character is pressed such that
    // the character keyup event happens after the Enter
    keyDown({ key: "Enter" });
    keyUp({ key: "Enter" });
    keyUp({ key: "d" });
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("edit link cell changes the label", async () => {
    setCellContent(model, "A1", "[label](http://odoo.com)");
    composerEl = await startComposition();
    await typeInComposer(" updated");
    await keyDown({ key: "Enter" });
    const link = getEvaluatedCell(model, "A1").link;
    expect(link?.label).toBe("label updated");
    expect(link?.url).toBe("http://odoo.com");
  });

  describe("change selecting mode when typing specific token value", () => {
    const matchingValues = [",", "+", "*", "="];
    const mismatchingValues = ["1", '"coucou"', "TRUE", "SUM", "A2"];
    const formulas = ["=", "=SUM("];

    describe.each(formulas)("typing %s followed by", (formula) => {
      test.each(matchingValues.concat(["("]))(
        "a matching value --> activate 'selecting' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          await startComposition();
          composerEl = await typeInComposer(content);
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(composerEl.textContent).toBe(content);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe(content.length);
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          composerEl = await startComposition();
          await typeInComposer(content);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content);
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(matchingValues.concat(["("]))(
        "a matching value & spaces --> activate 'selecting' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          const newContent = content + "   ";
          await startComposition();
          composerEl = await typeInComposer(newContent);
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(composerEl.textContent).toBe(newContent);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe(newContent.length);
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value & spaces --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          composerEl = await startComposition();
          await typeInComposer(content + "   ");
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content + "   ");
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a UNKNOWN token & a matching value --> not activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          const content = formula + "'" + matchingValue;
          composerEl = await startComposition();
          await typeInComposer(content);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(matchingValue);
          await moveToStart();
          composerEl = await typeInComposer(formula + ",", false);
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(composerEl.textContent).toBe(formula + "," + matchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe((formula + ",").length);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",", false);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(formula + "," + mismatchingValue);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & spaces & located before matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(matchingValue);
          await moveToStart();
          const formulaInput = formula + ",  ";
          composerEl = await typeInComposer(formulaInput, false);
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(composerEl.textContent).toBe(formulaInput + matchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe(formulaInput.length);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & spaces & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",  ", false);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(formula + ",  " + mismatchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before spaces & matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposer("   " + matchingValue);
          await moveToStart();
          composerEl = await typeInComposer(formula + ",", false);
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(composerEl.textContent).toBe(formula + ",   " + matchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe((formula + ",").length);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before spaces & mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          composerEl = await startComposition();
          await typeInComposer("   " + mismatchingValue);
          await moveToStart();
          composerEl = await typeInComposer(formula + ",", false);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
          expect(composerEl.textContent).toBe(formula + ",   " + mismatchingValue);
        }
      );
    });

    test.each([",", "+", "*", ")", "("])(
      "typing a matching values (except '=') --> not activate 'waitingForRangeSelection' mode",
      async (value) => {
        await startComposition();
        composerEl = await typeInComposer(value);
        expect(model.getters.getEditionMode()).not.toBe("selecting");
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        expect(composerEl.textContent).toBe(value);
      }
    );

    test("typing '='--> activate 'waitingForRangeSelection' mode", async () => {
      await startComposition();
      composerEl = await typeInComposer("=");
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(composerEl.textContent).toBe("=");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(1);
    });

    test("typing '=' & spaces --> activate 'selecting' mode", async () => {
      composerEl = await startComposition();
      const content = "=   ";
      await typeInComposer(content);
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(composerEl.textContent).toBe("=   ");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(content.length);
    });
  });

  test("dont show selection indicator if in editing mode ", async () => {
    composerEl = await startComposition("=");
    await simulateClick(composerEl);
    expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
    expect(model.getters.showSelectionIndicator()).toBeFalsy();
  });

  test("Home key sets cursor at the beginning", async () => {
    composerEl = await typeInComposer("Hello");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    await keyDown({ key: "Home" });
    await keyUp({ key: "Home" });
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 0 });
  });

  test("End key sets cursor at the end", async () => {
    composerEl = await typeInComposer("Hello");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keyDown({ key: "End" });
    await keyUp({ key: "End" });
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
  });

  test("Move cursor while in edit mode with non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await simulateClick("div.o-composer");
    await moveToEnd();
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    for (let _ in [1, 2, 3]) {
      await keyDown({ key: "ArrowLeft" });
    }
    await keyUp({ key: "ArrowLeft" });
    expect(model.getters.getComposerSelection()).toEqual({ start: 2, end: 2 });
    for (let _ in [1, 2]) {
      await keyDown({ key: "ArrowRight" });
    }
    await keyUp({ key: "ArrowRight" });

    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
  });

  test("Move cursor while in edit mode with empty cell", async () => {
    composerEl = await typeInComposer("Hello");
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    await keyDown({ key: "ArrowLeft" });
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Select a right-to-left range with the keyboard", async () => {
    setCellContent(model, "A1", "Hello");
    composerEl = fixture.querySelector<HTMLElement>("div.o-composer")!;
    await simulateClick("div.o-composer");
    await moveToEnd();
    const { end } = model.getters.getComposerSelection();
    await keyDown({ key: "ArrowLeft", shiftKey: true });
    await keyUp({ key: "ArrowLeft", shiftKey: true });
    expect(model.getters.getComposerSelection()).toEqual({
      start: end,
      end: end - 1,
    });
  });

  test("Select a left-to-right range with the keyboard in a non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await simulateClick("div.o-composer");
    await moveToEnd();
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keyDown({ key: "ArrowRight", shiftKey: true });
    await keyUp({ key: "ArrowRight", shiftKey: true });
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 1 });
  });

  test("Select a left-to-right range with the keyboard in an empty cell", async () => {
    composerEl = await typeInComposer("Hello");
    expect(model.getters.getEditionMode()).toBe("editing");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keyDown({ key: "ArrowRight", shiftKey: true });
    await keyUp({ key: "ArrowRight", shiftKey: true });
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("clicking on the composer while in selecting mode should put the composer in edition mode", async () => {
    composerEl = await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    await click(composerEl);
    expect(model.getters.getEditionMode()).toBe("editing");
  });

  test("type '=', stop editing with enter, click on the modified cell --> the edition mode should be inactive", async () => {
    // type '=' in C8
    selectCell(model, "C8");
    await nextTick();
    composerEl = await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");

    // stop editing with enter
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "C8")).toBe("=");
    expect(getEvaluatedCell(model, "C8").value).toBe("#BAD_EXPR");
    expect(getSelectionAnchorCellXc(model)).toBe("C9");
    expect(model.getters.getEditionMode()).toBe("inactive");

    // click on the modified cell C8
    selectCell(model, "C8");
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("C8");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Add a character changing the edition mode to 'selecting' correctly renders the composer", async () => {
    await typeInComposer("=sum(4");
    expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
    await typeInComposer(",", false);
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
  });

  test("Hitting 'Tab' without the autocomplete open should move the cursor to the next cell", async () => {
    await startComposition("test");
    await keyDown({ key: "Tab" });
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  describe("F4 shorcut will loop through reference combinations", () => {
    test("f4 shortcut on cell symbol", async () => {
      composerEl = await typeInComposer("=A1");
      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
      await keyDown({ key: "F4" });
      expect(model.getters.getCurrentContent()).toBe("=$A$1");
      await keyDown({ key: "F4" });
      expect(model.getters.getCurrentContent()).toBe("=A$1");
      await keyDown({ key: "F4" });
      expect(model.getters.getCurrentContent()).toBe("=$A1");
      await keyDown({ key: "F4" });
      expect(model.getters.getCurrentContent()).toBe("=A1");
    });
  });

  test("Can go to a new line in the composer with alt + enter or ctrl + enter", async () => {
    composerEl = await typeInComposer("A");
    expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 1 });

    await keyDown({ key: "Enter", altKey: true });
    expect(model.getters.getComposerSelection()).toEqual({ start: 2, end: 2 });
    expect(model.getters.getCurrentContent()).toEqual("A\n");

    await keyDown({ key: "Enter", ctrlKey: true });
    expect(model.getters.getComposerSelection()).toEqual({ start: 3, end: 3 });
    expect(model.getters.getCurrentContent()).toEqual("A\n\n");

    await typeInComposer("C");
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
    expect(model.getters.getCurrentContent()).toEqual("A\n\nC");

    await keyDown({ key: "Enter" });
    expect(getCellContent(model, "A1")).toEqual("A\n\nC");
  });

  test.each(["alt", "ctrl"])(
    "Hitting %s + enter replace current selection with a new line",
    async (key) => {
      await typeInComposer("Azerty");
      expect(model.getters.getCurrentContent()).toEqual("Azerty");
      expect(model.getters.getComposerSelection()).toEqual({ start: 6, end: 6 });

      model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 6, end: 4 });
      await nextTick();
      await keyDown({ key: "Enter", bubbles: true, [`${key}Key`]: true });
      expect(model.getters.getCurrentContent()).toEqual("Azer\n");
      expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    }
  );

  test("Composer content is localized", async () => {
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "1.2");
    await startComposition();
    expect(model.getters.getCurrentContent()).toEqual("1,2");
  });

  test("Numpad decimal have a different behaviour depending on the locale", async () => {
    await startComposition("5");
    keyDown({ code: "NumpadDecimal", key: "." });
    keyUp({ code: "NumpadDecimal", key: "." });
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("5.");

    updateLocale(model, FR_LOCALE);
    keyDown({ code: "NumpadDecimal", key: "." });
    keyUp({ code: "NumpadDecimal", key: "." });
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("5.,");
  });
});

describe("composer formula color", () => {
  test('type "=SUM" --> SUM should have specific function color', async () => {
    await typeInComposer("=SUM");
    expect(cehMock.colors["SUM"]).toBe(tokenColors["FUNCTION"]);
  });

  test('type "=SUM(" --> left parenthesis should be highlighted', async () => {
    await typeInComposer("=SUM(");
    expect(cehMock.colors["("]).toBe(tokenColors.MATCHING_PAREN);
  });

  test('type "=SUM(1" --> left parenthesis should have specific parenthesis color', async () => {
    await typeInComposer("=SUM(1");
    expect(cehMock.colors["("]).toBe(tokenColors["LEFT_PAREN"]);
  });

  test('type "=SUM(1" --> number should have specific number color', async () => {
    await typeInComposer("=SUM(1");
    expect(cehMock.colors["1"]).toBe(tokenColors["NUMBER"]);
  });

  test('type "=SUM(1," --> comma should have specific comma color', async () => {
    await typeInComposer("=SUM(1,");
    expect(cehMock.colors[","]).toBe(tokenColors["ARG_SEPARATOR"]);
  });

  test(`type '=SUM(1, "2"' --> string should have specific string color`, async () => {
    await typeInComposer('=SUM(1, "2"');
    expect(cehMock.colors[`"2"`]).toBe(tokenColors["STRING"]);
  });

  test(`type '=SUM(1, "2")' --> right parenthesis should be highlighted`, async () => {
    await typeInComposer('=SUM(1, "2")');
    expect(cehMock.colors[")"]).toBe(tokenColors.MATCHING_PAREN);
  });

  test(`type '=SUM(1, "2") +' --> right parenthesis should have specific parenthesis color`, async () => {
    await typeInComposer('=SUM(1, "2") +');
    expect(cehMock.colors[")"]).toBe(tokenColors["RIGHT_PAREN"]);
  });

  test(`type '=SUM(1, "2") +' --> operator should have specific operator color`, async () => {
    await typeInComposer('=SUM(1, "2") +');
    expect(cehMock.colors["+"]).toBe(tokenColors["OPERATOR"]);
  });

  test(`type '=SUM(1, "2") + TRUE' --> boolean should have specific bolean color`, async () => {
    await typeInComposer('=SUM(1, "2") + TRUE');
    expect(cehMock.colors["TRUE"]).toBe(tokenColors.NUMBER);
  });
});

describe("composer highlights color", () => {
  test("colors start with first color", async () => {
    setCellContent(model, "A1", "=a1+a2");
    await startComposition();
    expect(getHighlights(model).length).toBe(2);
    expect(getHighlights(model)[0].color).toBe(colors[0]);
    expect(getHighlights(model)[1].color).toBe(colors[1]);
  });

  test("colors always start with first color", async () => {
    setCellContent(model, "A1", "=b1+b2");
    setCellContent(model, "A2", "=b1+b3");
    await startComposition();
    expect(getHighlights(model).length).toBe(2);
    expect(getHighlights(model)[0].color).toBe(colors[0]);
    expect(getHighlights(model)[1].color).toBe(colors[1]);
    await keyDown({ key: "Enter" });

    await startComposition();
    expect(getHighlights(model).length).toBe(2);
    expect(getHighlights(model)[0].color).toBe(colors[0]);
    expect(getHighlights(model)[1].color).toBe(colors[1]);
  });

  test("duplicate highlights when there are several same ranges", async () => {
    setCellContent(model, "A1", "=a1+a1");
    await startComposition();
    expect(getHighlights(model).length).toBe(2);
    expect(getHighlights(model)[0].color).toBe(colors[0]);
    expect(getHighlights(model)[1].color).toBe(colors[0]);
  });

  test("highlight range", async () => {
    setCellContent(model, "A1", "=sum(a1:a10)");
    composerEl = await startComposition();
    expect(getHighlights(model).length).toBe(1);
    expect(getHighlights(model)[0].color).toBe(colors[0]);
    expect(composerEl.textContent).toBe("=sum(A1:A10)");
  });

  test("highlight 'reverse' ranges", async () => {
    setCellContent(model, "A1", "=sum(B3:a1)");
    await startComposition();
    expect(getHighlights(model)[0].zone).toEqual({ left: 0, right: 1, top: 0, bottom: 2 });
  });

  test.each(["=ZZ1", "=A101", "=A1A"])("Do not highlight invalid ref", async (ref) => {
    setCellContent(model, "A1", ref);
    composerEl = await startComposition();
    expect(getHighlights(model).length).toBe(0);
    expect(composerEl.textContent).toBe(ref);
  });

  test("highlight cross-sheet ranges", async () => {
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "=B1+Sheet2!A1");
    await startComposition();
    const highlights = getHighlights(model);
    expect(highlights).toHaveLength(2);
    expect(highlights[0].sheetId).toBe(model.getters.getActiveSheetId());
    expect(highlights[0].zone).toEqual({ left: 1, right: 1, top: 0, bottom: 0 });
    expect(highlights[1].sheetId).toBe("42");
    expect(highlights[1].zone).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  test.skip("grid composer is resized when top bar composer grows", async () => {});
});

describe("Composer string is correctly translated to HtmlContents[][] for the contentEditableHelper", () => {
  test("Simple string", async () => {
    await typeInComposer("I'm a simple content");
    expect(cehMock.contents).toEqual([[{ value: "I'm a simple content" }]]);
  });

  test("Simple formula", async () => {
    await typeInComposer("=1 + A1");
    expect(cehMock.contents).toEqual([
      [
        { value: "=", color: tokenColors.OPERATOR },
        { value: "1", color: tokenColors.NUMBER },
        { value: " ", color: "#000" },
        { value: "+", color: tokenColors.OPERATOR },
        { value: " ", color: "#000" },
        { value: "A1", color: cehMock.colors["A1"] },
      ],
    ]);
  });

  test("Selection indicator in simple formula", async () => {
    await typeInComposer("=");
    expect(cehMock.contents).toEqual([
      [{ value: "=", color: tokenColors.OPERATOR, class: selectionIndicatorClass }],
    ]);
  });

  test("Multi-line string", async () => {
    await typeInComposer("\nI'm\nmulti\n\nline\n");
    expect(cehMock.contents).toEqual([
      [{ value: "" }],
      [{ value: "I'm" }],
      [{ value: "multi" }],
      [{ value: "" }],
      [{ value: "line" }],
      [{ value: "" }],
    ]);
  });

  test("Multi-line formula", async () => {
    await typeInComposer("=\nA1: \nA2\n\n+SUM(\n5)");
    expect(cehMock.contents).toEqual([
      [{ value: "=", color: tokenColors.OPERATOR }],
      [{ value: "A1: ", color: cehMock.colors["A1: "] }],
      [{ value: "A2", color: cehMock.colors["A1: "] }],
      [{ value: "", color: "#000" }],
      [
        { value: "+", color: tokenColors.OPERATOR },
        { value: "SUM", color: tokenColors.FUNCTION },
        { value: "(", color: tokenColors.MATCHING_PAREN },
      ],
      [
        { value: "5", color: tokenColors.NUMBER },
        { value: ")", color: tokenColors.MATCHING_PAREN },
      ],
    ]);
  });

  test("Selection indicator in multi-line formula", async () => {
    await typeInComposer("=\n\n");
    expect(cehMock.contents).toEqual([
      [{ value: "=", color: tokenColors.OPERATOR }],
      [{ value: "", color: "#000" }],
      [{ value: "", color: "#000", class: selectionIndicatorClass }],
    ]);
  });
});

describe("Copy/paste in composer", () => {
  test("Can copy random content inside the composer", async () => {
    const pasteFn = jest.fn();
    const parentPasteFn = () => pasteFn();
    fixture.addEventListener("paste", parentPasteFn);
    const clipboardData = new MockClipboardData();
    clipboardData.setText("Unimportant");
    const composerEl = await startComposition();
    const clipboardEvent = getClipboardEvent("paste", clipboardData);
    composerEl.dispatchEvent(clipboardEvent);
    await nextTick();
    expect(model.getters.getEditionMode()).not.toBe("inactive");
    expect(fixture.querySelectorAll("div.o-composer")).toHaveLength(1);
    expect(pasteFn).not.toBeCalled();
    fixture.removeEventListener("paste", parentPasteFn);
  });
});

describe("Double click selection in composer", () => {
  test("Double click on range in the formula will select the whole range", async () => {
    const composerEl = await typeInComposer("=SUM(A1:A30)");
    // mock the real situation
    // first, A30 will be selected if we double click on the A30 part
    // this step is done in `onClick` before `onDblClick`
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 8,
      end: 11,
    });
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 8,
      end: 11,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 5,
      end: 11,
    });
  });

  test("Double click at the end of content will not select anything", async () => {
    const content = "=SUM(A1:A30)";
    const composerEl = await typeInComposer(content);
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: content.length - 1,
      end: content.length - 1,
    });
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: content.length - 1,
      end: content.length - 1,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: content.length - 1,
      end: content.length - 1,
    });
  });

  test("Double click on normal text won't select the whole text", async () => {
    const composerEl = await typeInComposer("A1:A30");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 3,
      end: 6,
    });
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 3,
      end: 6,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 3,
      end: 6,
    });
  });

  test("Double quoted STRING token after = sign will be selected word by word after double click", async () => {
    const composerEl = await typeInComposer('="Doule quoted string"');
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 8,
      end: 14,
    }); // select word "quoted"
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 8,
      end: 14,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 8,
      end: 14,
    });
  });

  test("Double click on function parameters does not produce a traceback", async () => {
    const composerEl = await typeInComposer("=A1+A2+A3");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", {
      start: 1,
      end: 6,
    });
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 1,
      end: 6,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({
      start: 1,
      end: 6,
    });
  });
});
