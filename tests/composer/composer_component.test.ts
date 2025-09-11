import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { tokenColors } from "../../src/constants";
import { colors, toCartesian, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { Store } from "../../src/store_engine";
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
  getComposerColors,
  getTextNodes,
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
  getInputSelection,
  mountComposerWrapper,
  nextTick,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let model: Model;
let composerEl: Element;
let fixture: HTMLElement;
let parent: ComposerWrapper;
let composerStore: Store<CellComposerStore>;

async function startComposition(text?: string): Promise<HTMLDivElement> {
  parent.startComposition(text);
  await nextTick();
  return fixture.querySelector("div.o-composer")! as HTMLDivElement;
}

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    parent.startComposition();
  }
  const composerEl = await typeInComposerHelper("div.o-composer", text, false);
  return composerEl;
}

async function moveToStart() {
  // TODO: remove keyup at refactoring of content editable helper
  keyDown({ key: "Home" });
  keyUp({ key: "Home" });
  const firstTextNode = getTextNodes(composerEl)[0];
  if (firstTextNode) {
    const selection = document.getSelection()!;
    selection.collapse(firstTextNode, 0);
  }
}
async function moveToEnd(composerEl: Element) {
  await keyDown({ key: "End" });
  const lastTextNode = getTextNodes(composerEl).at(-1);
  if (lastTextNode) {
    const selection = document.getSelection()!;
    if (selection.rangeCount === 0) {
      const range = document.createRange();
      selection.addRange(range);
    }
    const range = selection.getRangeAt(0);
    range.setStart(lastTextNode, lastTextNode.textContent!.length);
    range.setEnd(lastTextNode, lastTextNode.textContent!.length);
  }
  await keyUp({ key: "End" });
}

beforeEach(async () => {
  ({ model, parent, fixture } = await mountComposerWrapper());
  composerStore = parent.env.getStore(CellComposerStore);
});

describe("ranges and highlights", () => {
  test("=SU, the = should be colored", async () => {
    const composerEl = await typeInComposer("=SU");
    const contentColors = getComposerColors(composerEl);
    expect(contentColors["="]).toBeSameColorAs("#3da4ab");
    expect(contentColors["SU"]).toBeSameColorAs("#000000");
  });

  test("+SU, the + should be colored", async () => {
    const composerEl = await typeInComposer("+SU");
    const contentColors = getComposerColors(composerEl);
    expect(contentColors["+"]).toBeSameColorAs("#3da4ab");
    expect(contentColors["SU"]).toBeSameColorAs("#000000");
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
    const composerEl = await typeInComposer(`=SUM(${ref})`);
    expect(getComposerColors(composerEl)[ref]).toBeSameColorAs(colors[0]);
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
  ])("reference %s should be colored using +", async (ref) => {
    const composerEl = await typeInComposer(`+SUM(${ref})`);
    expect(getComposerColors(composerEl)[ref]).toBeSameColorAs(colors[0]);
  });

  test("=Key DOWN in A1, should select and highlight A2", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2");
  });

  test("+Key DOWN in A1, should select and highlight A2", async () => {
    composerEl = await typeInComposer("+");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("+A2");
  });

  test("=Key LEFT in A2, should select and highlight A1", async () => {
    selectCell(model, "B1");
    composerEl = await startComposition("=");
    await keyDown({ key: "ArrowLeft" });
    expect(composerEl.textContent).toBe("=A1");
  });

  test("reference position is reset at each selection", async () => {
    composerEl = await typeInComposer("=");
    expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
    expect(getInputSelection()).toEqual({
      anchorNodeText: "=",
      anchorOffset: 1,
      focusNodeText: "=",
      focusOffset: 1,
    });
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2");
    composerEl = await typeInComposer("+", false);
    expect(composerEl.textContent).toBe("=A2+");
    expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
    expect(getInputSelection()).toEqual({
      anchorNodeText: "+",
      anchorOffset: 1,
      focusNodeText: "+",
      focusOffset: 1,
    });
    expect(composerStore.editionMode).toBe("selecting");
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A2+A2");
  });

  test("=Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    composerEl = await typeInComposer("=");
    await keyDown({ key: "ArrowDown" });
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=A3");
  });

  test("+Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    composerEl = await typeInComposer("+");
    await keyDown({ key: "ArrowDown" });
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("+A3");
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
    expect(composerStore.highlights).toHaveLength(1);
    expect(composerStore.highlights[0].range.zone).toMatchObject(toZone("B2:C3"));
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=C4");
  });

  test("Create a ref overlapping merges by typing -> the merge is ignored if the range covers several cells", async () => {
    merge(model, "B2:C3");
    selectCell(model, "C1");
    composerEl = await typeInComposer("=B2:B10");
    expect(composerEl.textContent).toBe("=B2:B10");
    expect(composerStore.highlights).toHaveLength(1);
    expect(composerStore.highlights[0].range.zone).toMatchObject(toZone("B2:B10"));
    await keyDown({ key: "Escape" });
    await keyUp({ key: "Escape" });
    composerEl = await typeInComposer("=B2:B3");
    expect(composerEl.textContent).toBe("=B2:B3");
    expect(composerStore.highlights).toHaveLength(1);
    expect(composerStore.highlights[0].range.zone).toMatchObject(toZone("B2:B3"));
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
      composerStore.changeComposerCursorSelection(9, 9);
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
    expect(composerStore.editionMode).toBe("inactive");
    expect(getCellText(model, "A1")).toBe("=C8");
  });

  test("type '+', select a cell, press enter", async () => {
    composerEl = await typeInComposer("+");
    selectCell(model, "C8");
    await nextTick();
    expect(composerEl.textContent).toBe("+C8");
    await keyDown({ key: "Enter" });
    expect(composerStore.editionMode).toBe("inactive");
    expect(getCellText(model, "A1")).toBe("=C8");
  });

  test("full rows/cols ranges are correctly displayed", async () => {
    composerEl = await typeInComposer("=SUM(A:A)");
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "A1")).toBe("=SUM(A:A)");
  });

  test("full rows/cols ranges are correctly displayed using +", async () => {
    composerEl = await typeInComposer("+SUM(A:A)");
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
    expect(composerStore.editionMode).toBe("editing");
    // Enter is pressed really fast while another character is pressed such that
    // the character keyup event happens after the Enter
    keyDown({ key: "Enter" });
    keyUp({ key: "Enter" });
    keyUp({ key: "d" });
    await nextTick();
    expect(composerStore.editionMode).toBe("inactive");
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
          expect(composerStore.editionMode).toBe("selecting");
          expect(composerEl.textContent).toBe(content);
          expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
          expect(getInputSelection()).toEqual({
            anchorNodeText: matchingValue,
            anchorOffset: 1,
            focusNodeText: matchingValue,
            focusOffset: 1,
          });
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          composerEl = await startComposition();
          await typeInComposer(content);
          expect(composerStore.editionMode).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content);
          expect(composerEl.querySelector(".selector-flag")).toBeNull();
        }
      );

      test.each(matchingValues.concat(["("]))(
        "a matching value & spaces --> activate 'selecting' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          const newContent = content + "   ";
          await startComposition();
          composerEl = await typeInComposer(newContent);
          expect(composerStore.editionMode).toBe("selecting");
          expect(composerEl.textContent).toBe(newContent);
          expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
          expect(getInputSelection()).toEqual({
            anchorNodeText: "   ",
            anchorOffset: 3,
            focusNodeText: "   ",
            focusOffset: 3,
          });
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value & spaces --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          composerEl = await startComposition();
          await typeInComposer(content + "   ");
          expect(composerStore.editionMode).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content + "   ");
          expect(composerEl.querySelector(".selector-flag")).toBeNull();
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a UNKNOWN token & a matching value --> not activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          const content = formula + "'" + matchingValue;
          composerEl = await startComposition();
          await typeInComposer(content);
          expect(composerStore.editionMode).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before matching value --> activate waitingForRangeSelection mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(matchingValue);
          await moveToStart();
          composerEl = await typeInComposer(formula + ",", false);
          expect(composerStore.editionMode).toBe("selecting");
          expect(composerEl.textContent).toBe(formula + "," + matchingValue);
          expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
          expect(getInputSelection()).toEqual({
            anchorNodeText: ",",
            anchorOffset: 1,
            focusNodeText: ",",
            focusOffset: 1,
          });
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",", false);
          expect(composerStore.editionMode).not.toBe("selecting");
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
          expect(composerStore.editionMode).toBe("selecting");
          expect(composerEl.textContent).toBe(formulaInput + matchingValue);
          expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
          expect(getInputSelection()).toEqual({
            anchorNodeText: "  ",
            anchorOffset: 2,
            focusNodeText: "  ",
            focusOffset: 2,
          });
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & spaces & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          composerEl = await startComposition();
          await typeInComposer(mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",  ", false);
          expect(composerStore.editionMode).not.toBe("selecting");
          expect(composerEl.textContent).toBe(formula + ",  " + mismatchingValue);
          expect(composerEl.querySelector(".selector-flag")).toBeNull();
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before spaces & matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposer("   " + matchingValue);
          await moveToStart();
          composerEl = await typeInComposer(formula + ",", false);
          expect(composerStore.editionMode).toBe("selecting");
          expect(composerEl.textContent).toBe(formula + ",   " + matchingValue);
          expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
          expect(getInputSelection()).toEqual({
            anchorNodeText: ",",
            anchorOffset: 1,
            focusNodeText: ",",
            focusOffset: 1,
          });
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before spaces & mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          composerEl = await startComposition();
          await typeInComposer("   " + mismatchingValue);
          await moveToStart();
          composerEl = await typeInComposer(formula + ",", false);
          expect(composerStore.editionMode).not.toBe("selecting");
          expect(composerEl.querySelector(".selector-flag")).toBeNull();
          expect(composerEl.textContent).toBe(formula + ",   " + mismatchingValue);
        }
      );
    });

    test.each([",", "*", ")", "("])(
      "typing a matching values (except '=' & '+') --> not activate 'waitingForRangeSelection' mode",
      async (value) => {
        await startComposition();
        composerEl = await typeInComposer(value);
        expect(composerStore.editionMode).not.toBe("selecting");
        expect(composerEl.querySelector(".selector-flag")).toBeNull();
        expect(composerEl.textContent).toBe(value);
      }
    );

    test("typing '='--> activate 'waitingForRangeSelection' mode", async () => {
      await startComposition();
      composerEl = await typeInComposer("=");
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerEl.textContent).toBe("=");
      expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
      expect(getInputSelection()).toEqual({
        anchorNodeText: "=",
        anchorOffset: 1,
        focusNodeText: "=",
        focusOffset: 1,
      });
    });

    test("typing '+'--> activate 'waitingForRangeSelection' mode", async () => {
      await startComposition();
      composerEl = await typeInComposer("+");
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerEl.textContent).toBe("+");
      expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
      expect(getInputSelection()).toEqual({
        anchorNodeText: "+",
        anchorOffset: 1,
        focusNodeText: "+",
        focusOffset: 1,
      });
    });

    test("typing '=' & spaces --> activate 'selecting' mode", async () => {
      composerEl = await startComposition();
      const content = "=   ";
      await typeInComposer(content);
      expect(composerStore.editionMode).toBe("selecting");
      expect(composerEl.textContent).toBe("=   ");
      expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
      expect(getInputSelection()).toEqual({
        anchorNodeText: "   ",
        anchorOffset: 3,
        focusNodeText: "   ",
        focusOffset: 3,
      });
    });
  });

  test("dont show selection indicator if in editing mode ", async () => {
    composerEl = await startComposition("=");
    await simulateClick(composerEl);
    expect(composerEl.querySelector(".selector-flag")).toBeNull();
    expect(composerStore.showSelectionIndicator).toBeFalsy();
  });

  test("Home key sets cursor at the beginning", async () => {
    composerEl = await typeInComposer("Hello");
    expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
    await keyDown({ key: "Home" });
    const selection = document.getSelection()!;
    const range = selection.getRangeAt(0);
    const textNode = getTextNodes(composerEl)[0];
    range.setStart(textNode, 0);
    range.setEnd(textNode, 0);
    await keyUp({ key: "Home" });
    expect(composerStore.composerSelection).toEqual({ start: 0, end: 0 });
  });

  test("End key sets cursor at the end", async () => {
    composerEl = await typeInComposer("Hello");
    composerStore.changeComposerCursorSelection(0, 0);
    await nextTick();
    await keyDown({ key: "End" });
    const selection = document.getSelection()!;
    const range = selection.getRangeAt(0);
    const textNode = getTextNodes(composerEl)[0];
    range.setStart(textNode, 5);
    range.setEnd(textNode, 5);
    await keyUp({ key: "End" });
    expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
  });

  test("Move cursor while in edit mode with non empty cell", async () => {
    const composerEl = fixture.querySelector<HTMLElement>("div.o-composer")!;
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await simulateClick("div.o-composer");
    await moveToEnd(composerEl);
    expect(composerStore.editionMode).toBe("editing");
    expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
    for (const _ in [1, 2, 3]) {
      await keyDown({ key: "ArrowLeft" });
    }
    const selection = document.getSelection()!;
    const range = selection.getRangeAt(0);
    const textNode = getTextNodes(composerEl)[0];
    range.setStart(textNode, 2);
    range.setEnd(textNode, 2);
    await keyUp({ key: "ArrowLeft" });
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 2 });
    for (const _ in [1, 2]) {
      await keyDown({ key: "ArrowRight" });
    }
    range.setStart(textNode, 4);
    range.setEnd(textNode, 4);
    await keyUp({ key: "ArrowRight" });

    expect(composerStore.composerSelection).toEqual({ start: 4, end: 4 });
  });

  test("Move cursor while in edit mode with empty cell", async () => {
    composerEl = await typeInComposer("Hello");
    expect(composerStore.editionMode).toBe("editing");
    expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
    await keyDown({ key: "ArrowLeft" });
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Select a left-to-right range with the keyboard in a non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await simulateClick("div.o-composer");
    composerEl = fixture.querySelector<HTMLElement>("div.o-composer")!;
    await moveToEnd(composerEl);
    composerStore.changeComposerCursorSelection(0, 0);
    await nextTick();
    await keyDown({ key: "ArrowRight", shiftKey: true });
    const selection = document.getSelection()!;
    const range = selection.getRangeAt(0);
    const textNode = getTextNodes(composerEl)[0];
    range.setStart(textNode, 0);
    range.setEnd(textNode, 1);
    await keyUp({ key: "ArrowRight", shiftKey: true });
    expect(composerStore.composerSelection).toEqual({ start: 0, end: 1 });
  });

  test("Select a left-to-right range with the keyboard in an empty cell", async () => {
    composerEl = await typeInComposer("Hello");
    expect(composerStore.editionMode).toBe("editing");
    composerStore.changeComposerCursorSelection(0, 0);
    await nextTick();
    await keyDown({ key: "ArrowRight", shiftKey: true });
    await keyUp({ key: "ArrowRight", shiftKey: true });
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Can select a right-to-left range that spans multiple span elements", async () => {
    setCellContent(model, "A1", "=A1+SUM(A2)");
    await nextTick();
    await simulateClick("div.o-composer");
    composerEl = fixture.querySelector<HTMLElement>("div.o-composer")!;

    composerStore.changeComposerCursorSelection(5, 5);
    await nextTick();

    composerStore.changeComposerCursorSelection(5, 2);
    await nextTick();
    const selection = document.getSelection()!;
    await nextTick();
    expect(selection?.toString()).toBe("1+S");
    expect(selection.anchorNode?.textContent).toBe("A1");
    expect(selection.focusNode?.textContent).toBe("SUM");
  });

  test("clicking on the composer while in selecting mode should put the composer in edition mode", async () => {
    composerEl = await typeInComposer("=");
    expect(composerStore.editionMode).toBe("selecting");
    await click(composerEl);
    expect(composerStore.editionMode).toBe("editing");
  });

  test("type '=', stop editing with enter, click on the modified cell --> the edition mode should be inactive", async () => {
    // type '=' in C8
    selectCell(model, "C8");
    await nextTick();
    composerEl = await typeInComposer("=");
    expect(composerStore.editionMode).toBe("selecting");

    // stop editing with enter
    await keyDown({ key: "Enter" });
    expect(getCellText(model, "C8")).toBe("=");
    expect(getEvaluatedCell(model, "C8").value).toBe("#BAD_EXPR");
    expect(getSelectionAnchorCellXc(model)).toBe("C9");
    expect(composerStore.editionMode).toBe("inactive");

    // click on the modified cell C8
    selectCell(model, "C8");
    await nextTick();
    expect(getSelectionAnchorCellXc(model)).toBe("C8");
    expect(composerStore.editionMode).toBe("inactive");
  });

  test("Add a character changing the edition mode to 'selecting' correctly renders the composer", async () => {
    composerEl = await typeInComposer("=sum(4");
    expect(composerEl.querySelector(".selector-flag")).toBeNull();
    await typeInComposer(",", false);
    expect(composerEl.querySelector(".selector-flag")).toBeTruthy();
  });

  test("Hitting 'Tab' without the autocomplete open should move the cursor to the next cell", async () => {
    await startComposition("test");
    await keyDown({ key: "Tab" });
    expect(composerStore.editionMode).toBe("inactive");
  });

  describe("F4 shorcut will loop through reference combinations", () => {
    test("f4 shortcut on cell symbol", async () => {
      composerEl = await typeInComposer("=A1");
      composerStore.changeComposerCursorSelection(1, 1);
      await keyDown({ key: "F4" });
      expect(composerStore.currentContent).toBe("=$A$1");
      await keyDown({ key: "F4" });
      expect(composerStore.currentContent).toBe("=A$1");
      await keyDown({ key: "F4" });
      expect(composerStore.currentContent).toBe("=$A1");
      await keyDown({ key: "F4" });
      expect(composerStore.currentContent).toBe("=A1");
    });
  });

  test("Can go to a new line in the composer with alt + enter or ctrl + enter", async () => {
    composerEl = await typeInComposer("A");
    expect(composerStore.composerSelection).toEqual({ start: 1, end: 1 });

    await keyDown({ key: "Enter", altKey: true });
    expect(composerStore.composerSelection).toEqual({ start: 2, end: 2 });
    expect(composerStore.currentContent).toEqual("A\n");

    await keyDown({ key: "Enter", ctrlKey: true });
    expect(composerStore.composerSelection).toEqual({ start: 3, end: 3 });
    expect(composerStore.currentContent).toEqual("A\n\n");

    await typeInComposer("C");
    expect(composerStore.composerSelection).toEqual({ start: 4, end: 4 });
    expect(composerStore.currentContent).toEqual("A\n\nC");

    await keyDown({ key: "Enter" });
    expect(getCellContent(model, "A1")).toEqual("A\n\nC");
  });

  test.each(["alt", "ctrl"])(
    "Hitting %s + enter replace current selection with a new line",
    async (key) => {
      await typeInComposer("Azerty");
      expect(composerStore.currentContent).toEqual("Azerty");
      expect(composerStore.composerSelection).toEqual({ start: 6, end: 6 });

      composerStore.changeComposerCursorSelection(4, 6);
      await nextTick();
      await keyDown({ key: "Enter", bubbles: true, [`${key}Key`]: true });
      expect(composerStore.currentContent).toEqual("Azer\n");
      expect(composerStore.composerSelection).toEqual({ start: 5, end: 5 });
    }
  );

  test("Composer content is localized", async () => {
    updateLocale(model, FR_LOCALE);
    setCellContent(model, "A1", "1.2");
    await startComposition();
    expect(composerStore.currentContent).toEqual("1,2");
  });

  test("Numpad decimal have a different behaviour depending on the locale", async () => {
    await startComposition("5");
    keyDown({ code: "NumpadDecimal", key: "." });
    keyUp({ code: "NumpadDecimal", key: "." });
    await nextTick();
    expect(composerStore.currentContent).toBe("5.");

    updateLocale(model, FR_LOCALE);
    keyDown({ code: "NumpadDecimal", key: "." });
    keyUp({ code: "NumpadDecimal", key: "." });
    await nextTick();
    expect(composerStore.currentContent).toBe("5.,");
  });

  test("Pressing F2 will toggle edition mode on ranges", async () => {
    await startComposition("=A1+A2");
    expect(composerStore.editionMode).toBe("editing");
    await keyDown({ key: "F2" });
    expect(composerStore.editionMode).toBe("selecting");
    await keyDown({ key: "F2" });
    expect(composerStore.editionMode).toBe("editing");
  });

  test("Composer assistant can be hidden", async () => {
    ({ fixture, parent } = await mountComposerWrapper(undefined, { showAssistant: false }));
    composerStore = parent.env.getStore(CellComposerStore);
    await startComposition("=s");
    expect(fixture.querySelector(".o-composer-assistant-container")).toBeNull();
  });

  test("Can select text in the composer in readonly mode", async () => {
    await typeInComposer("=12");
    model.updateMode("readonly");
    await nextTick();
    const spans = fixture.querySelectorAll(".o-composer span");
    triggerMouseEvent(spans[0], "pointerdown");
    const selection = document.getSelection()!;
    const range = document.createRange();
    range.setStart(spans[0].childNodes[0], 0);
    range.setEnd(spans[1].childNodes[0], 1);
    selection.addRange(range);
    triggerMouseEvent(spans[1], "pointerup");
    await nextTick();
    expect(selection.toString()).toBe("=1");
  });
});

describe("composer formula color", () => {
  test('type "=SUM" --> SUM should have specific function color', async () => {
    const composerEl = await typeInComposer("=SUM");
    expect(getComposerColors(composerEl)["SUM"]).toBeSameColorAs(tokenColors["FUNCTION"]);
  });

  test('type "=SUM(" --> left parenthesis should have specific function color', async () => {
    const composerEl = await typeInComposer("=SUM(");
    expect(getComposerColors(composerEl)["("]).toBeSameColorAs(tokenColors["LEFT_PAREN"]);
  });

  test('type "=SUM(1" --> left parenthesis should have specific parenthesis color', async () => {
    const composerEl = await typeInComposer("=SUM(1");
    expect(getComposerColors(composerEl)["("]).toBeSameColorAs(tokenColors["LEFT_PAREN"]);
  });

  test('type "=SUM(1" --> number should have specific number color', async () => {
    const composerEl = await typeInComposer("=SUM(1");
    expect(getComposerColors(composerEl)["1"]).toBeSameColorAs(tokenColors["NUMBER"]);
  });

  test('type "=SUM(1," --> comma should have specific comma color', async () => {
    const composerEl = await typeInComposer("=SUM(1,");
    expect(getComposerColors(composerEl)[","]).toBeSameColorAs(tokenColors["ARG_SEPARATOR"]);
  });

  test(`type '=SUM(1, "2"' --> string should have specific string color`, async () => {
    const composerEl = await typeInComposer('=SUM(1, "2"');
    expect(getComposerColors(composerEl)[`"2"`]).toBeSameColorAs(tokenColors["STRING"]);
  });

  test(`type '=SUM(1, "2")' --> right parenthesis should have specific function color`, async () => {
    const composerEl = await typeInComposer('=SUM(1, "2")');
    expect(getComposerColors(composerEl)[")"]).toBeSameColorAs(tokenColors["RIGHT_PAREN"]);
  });

  test(`type '=SUM(1, "2") +' --> right parenthesis should have specific parenthesis color`, async () => {
    const composerEl = await typeInComposer('=SUM(1, "2") +');
    expect(getComposerColors(composerEl)[")"]).toBeSameColorAs(tokenColors["RIGHT_PAREN"]);
  });

  test(`type '=SUM(1, "2") +' --> operator should have specific operator color`, async () => {
    const composerEl = await typeInComposer('=SUM(1, "2") +');
    expect(getComposerColors(composerEl)["+"]).toBeSameColorAs(tokenColors["OPERATOR"]);
  });

  test(`type '=SUM(1, "2") + TRUE' --> boolean should have specific bolean color`, async () => {
    const composerEl = await typeInComposer('=SUM(1, "2") + TRUE');
    expect(getComposerColors(composerEl)["TRUE"]).toBeSameColorAs(tokenColors.NUMBER);
  });

  test(`type '=SUM(1, "2"))' --> extra parenthesis should have specific parenthesis color`, async () => {
    const composerEl = await typeInComposer('=SUM(1, "2"))');
    expect(getComposerColors(composerEl)[")"]).toBeSameColorAs(tokenColors.ORPHAN_RIGHT_PAREN);
  });
});

function getBlurredState(composerStore: Store<CellComposerStore>) {
  const result: { isBlurred: boolean; value: string }[] = [];

  let blurredState = !!composerStore.currentTokens[0].isBlurred;
  let value = "";

  for (const token of composerStore.currentTokens) {
    if (!!token.isBlurred !== blurredState) {
      result.push({ isBlurred: blurredState, value });
      value = token.value;
      blurredState = !!token.isBlurred;
    } else {
      value += token.value;
    }
  }
  result.push({ isBlurred: blurredState, value });

  return result;
}

describe("Composer blurs formula parts not affected by cursor position.", () => {
  describe("Type an unfinished formula --> lighten the unfinished part.", () => {
    let firstPart: string;
    test.each([
      "=",
      "= ",
      "= S",
      "= SU",
      "= SUM",
      "= SUM( COS ( A1 ) )",
      "= SUM( COS ( A1 ) ) ",
      "= SUM( COS ( A1 ) ) +",
      "= SUM( COS ( A1 ) ) + ",
      "= SUM( COS ( A1 ) ) + A",
      "= SUM( COS ( A1 ) ) + AB",
      "= SUM( COS ( A1 ) ) + ABS",
      "= SUM( COS ( A1 ) ) + ABS ",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) )",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ",
    ])('type "%s" --> lighten all', async (str: string) => {
      await typeInComposer(str);
      expect(getBlurredState(composerStore)).toEqual([{ isBlurred: false, value: str }]);
    });

    firstPart = "= ";
    test.each([
      "SUM(",
      "SUM( ",
      "SUM( C",
      "SUM( CO",
      "SUM( COS",
      "SUM( COS ",
      "SUM( COS ( A1 )",
      "SUM( COS ( A1 ) ",
    ])(`type "${firstPart}%s" --> lighten all elements in SUM`, async (str: string) => {
      await typeInComposer(firstPart + str);
      expect(getBlurredState(composerStore)).toEqual([
        { isBlurred: true, value: firstPart },
        { isBlurred: false, value: str },
      ]);
    });

    firstPart = "= SUM( ";
    test.each(["COS (", "COS ( ", "COS ( A", "COS ( A", "COS ( A1", "COS ( A1 "])(
      `type "${firstPart}%s" --> lighten all elements in COS`,
      async (str: string) => {
        await typeInComposer(firstPart + str);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: firstPart },
          { isBlurred: false, value: str },
        ]);
      }
    );

    firstPart = "= SUM( COS ( A1 ) ) + ";
    test.each([
      "ABS (",
      "ABS ( ",
      "ABS ( 4",
      "ABS ( 42",
      "ABS ( 42 ",
      "ABS ( 42 +",
      "ABS ( 42 + ",
      "ABS ( 42 + (",
      "ABS ( 42 + (3",
      "ABS ( 42 + (3*",
      "ABS ( 42 + (3*2",
      "ABS ( 42 + (3*2)",
      "ABS ( 42 + (3*2) ",
    ])(`type "${firstPart}%s" --> lighten all elements in ABS`, async (str: string) => {
      await typeInComposer(firstPart + str);
      expect(getBlurredState(composerStore)).toEqual([
        { isBlurred: true, value: firstPart },
        { isBlurred: false, value: str },
      ]);
    });
  });

  describe("Move cursor on a nested formula --> lighten the concerned part", () => {
    test.each([
      "",
      "=",
      "= ", // controversy case --> on google Sheet, lighten only elements in "SUM"
      "= SUM( COS ( A1 ) )",
      "= SUM( COS ( A1 ) ) ",
      "= SUM( COS ( A1 ) ) +",
      "= SUM( COS ( A1 ) ) + ", // controversy case --> on google Sheet, lighten only elements in "ABS"
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) )",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ",
    ])(
      'type "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) " and move cursor after "%s" --> lighten all',
      async (str: string) => {
        await typeInComposer("= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: false, value: "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) " },
        ]);
      }
    );

    test.each([
      "= S",
      "= SU",
      "= SUM",
      "= SUM(",
      "= SUM( ", // controversy case --> on google Sheet, lighten only elements in "COS"
      "= SUM( COS ( A1 )",
      "= SUM( COS ( A1 ) ",
    ])(
      'type "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) " and move cursor after "%s" --> lighten all elements in "SUM"',
      async (str: string) => {
        await typeInComposer("= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: "= " },
          { isBlurred: false, value: "SUM( COS ( A1 ) )" },
          { isBlurred: true, value: " + ABS ( 42 + (3*2) ) " },
        ]);
      }
    );

    test.each([
      "= SUM( C",
      "= SUM( CO",
      "= SUM( COS",
      "= SUM( COS ",
      "= SUM( COS (",
      "= SUM( COS ( A",
      "= SUM( COS ( A1",
      "= SUM( COS ( A1 ",
    ])(
      'type "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) " and move cursor after "%s" --> lighten all elements in "COS"',
      async (str: string) => {
        await typeInComposer("= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: "= SUM( " },
          { isBlurred: false, value: "COS ( A1 )" },
          { isBlurred: true, value: " ) + ABS ( 42 + (3*2) ) " },
        ]);
      }
    );

    test.each([
      "= SUM( COS ( A1 ) ) + A",
      "= SUM( COS ( A1 ) ) + AB",
      "= SUM( COS ( A1 ) ) + ABS",
      "= SUM( COS ( A1 ) ) + ABS ",
      "= SUM( COS ( A1 ) ) + ABS (",
      "= SUM( COS ( A1 ) ) + ABS ( ",
      "= SUM( COS ( A1 ) ) + ABS ( 4",
      "= SUM( COS ( A1 ) ) + ABS ( 42",
      "= SUM( COS ( A1 ) ) + ABS ( 42 ",
      "= SUM( COS ( A1 ) ) + ABS ( 42 +",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + ",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2)",
      "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ",
    ])(
      'type "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) " and move cursor after "%s" --> lighten all elements in "ABS"',
      async (str: string) => {
        await typeInComposer("= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: "= SUM( COS ( A1 ) ) + " },
          { isBlurred: false, value: "ABS ( 42 + (3*2) )" },
          { isBlurred: true, value: " " },
        ]);
      }
    );
  });

  test("Do nothing when selectionStart !== selectionEnd", async () => {
    const str = "= SUM( COS ( A";
    await typeInComposer("= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) ");
    composerStore.changeComposerCursorSelection(str.length, str.length + 1);
    expect(getBlurredState(composerStore)).toEqual([
      { isBlurred: false, value: "= SUM( COS ( A1 ) ) + ABS ( 42 + (3*2) ) " },
    ]);
  });

  describe("lighten correctly when too much parenthesis", () => {
    test.each([
      "",
      "=", // controversy case --> on google Sheet, lighten only elements in "SUM"
      "=SUM(COS(A1))",
      "=SUM(COS(A1)) ",
      "=SUM(COS(A1)) )",
      "=SUM(COS(A1)) ))",
      "=SUM(COS(A1)) )))",
      "=SUM(COS(A1)) ))) ",
      "=SUM(COS(A1)) ))) +",
      "=SUM(COS(A1)) ))) + ", // controversy case --> on google Sheet, lighten only elements in "ABS"
      "=SUM(COS(A1)) ))) + ABS(42+(3*2))",
      "=SUM(COS(A1)) ))) + ABS(42+(3*2)) ",
    ])(
      'type "=SUM(COS(A1)) ))) + ABS(42+(3*2)) " and move cursor after "%s" --> lighten all',
      async (str: string) => {
        await typeInComposer("=SUM(COS(A1)) ))) + ABS(42+(3*2)) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: false, value: "=SUM(COS(A1)) ))) + ABS(42+(3*2)) " },
        ]);
      }
    );

    test.each([
      "=S",
      "=SU",
      "=SUM",
      "=SUM(", // controversy case --> on google Sheet, lighten only elements in "COS"
      "=SUM(COS(A1)",
    ])(
      'type "=SUM(COS(A1)) ))) + ABS(42+(3*2)) " and move cursor after "%s" --> lighten all elements in "SUM"',
      async (str: string) => {
        await typeInComposer("=SUM(COS(A1)) ))) + ABS(42+(3*2)) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: "=" },
          { isBlurred: false, value: "SUM(COS(A1))" },
          { isBlurred: true, value: " ))) + ABS(42+(3*2)) " },
        ]);
      }
    );

    test.each(["=SUM(C", "=SUM(CO", "=SUM(COS", "=SUM(COS(", "=SUM(COS(A", "=SUM(COS(A1"])(
      'type "=SUM(COS(A1)) ))) + ABS(42+(3*2)) " and move cursor after "%s" --> lighten all elements in "COS"',
      async (str: string) => {
        await typeInComposer("=SUM(COS(A1)) ))) + ABS(42+(3*2)) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: "=SUM(" },
          { isBlurred: false, value: "COS(A1)" },
          { isBlurred: true, value: ") ))) + ABS(42+(3*2)) " },
        ]);
      }
    );

    test.each([
      "=SUM(COS(A1)) ))) + A",
      "=SUM(COS(A1)) ))) + AB",
      "=SUM(COS(A1)) ))) + ABS",
      "=SUM(COS(A1)) ))) + ABS(",
      "=SUM(COS(A1)) ))) + ABS(4",
      "=SUM(COS(A1)) ))) + ABS(42",
      "=SUM(COS(A1)) ))) + ABS(42+",
      "=SUM(COS(A1)) ))) + ABS(42+(",
      "=SUM(COS(A1)) ))) + ABS(42+(3",
      "=SUM(COS(A1)) ))) + ABS(42+(3*",
      "=SUM(COS(A1)) ))) + ABS(42+(3*2",
      "=SUM(COS(A1)) ))) + ABS(42+(3*2)",
    ])(
      'type "=SUM(COS(A1)) ))) + ABS(42+(3*2)) " and move cursor after "%s" --> lighten all elements in "ABS"',
      async (str: string) => {
        await typeInComposer("=SUM(COS(A1)) ))) + ABS(42+(3*2)) ");
        composerStore.changeComposerCursorSelection(str.length, str.length);
        expect(getBlurredState(composerStore)).toEqual([
          { isBlurred: true, value: "=SUM(COS(A1)) ))) + " },
          { isBlurred: false, value: "ABS(42+(3*2))" },
          { isBlurred: true, value: " " },
        ]);
      }
    );
  });
});

describe("composer set background on matching parenthesis ", () => {
  test('type "=SUM(" --> left parenthesis should not have background', async () => {
    await typeInComposer("=SUM(");
    expect(composerStore.tokenAtCursor?.isParenthesisLinkedToCursor).toBe(false);
  });

  test('type "=SUM()" --> left and right parenthesis should have background', async () => {
    await typeInComposer("=SUM()");
    expect(
      composerStore.currentTokens
        .filter((t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type))
        .every((t) => t.isParenthesisLinkedToCursor === true)
    ).toBe(true);
  });

  test('type "=SUM( COS(42) )" --> left and right parenthesis of "SUM" should have background', async () => {
    await typeInComposer("=SUM( COS(42) )");
    expect(
      composerStore.currentTokens
        .filter((t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type) && t.parenthesesCode === "1")
        .every((t) => t.isParenthesisLinkedToCursor === true)
    ).toBe(true);

    expect(
      composerStore.currentTokens
        .filter((t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type) && t.parenthesesCode !== "1")
        .every((t) => t.isParenthesisLinkedToCursor === false)
    ).toBe(true);
  });

  test('type "=SUM( COS(42) ) + SIN(24)" and move cursor on left "COS" parenthesis --> only left and right parenthesis of "COS" should have background', async () => {
    await typeInComposer("=SUM( COS(42) ) + SIN(24)");
    const str = "=SUM( COS(";
    composerStore.changeComposerCursorSelection(str.length, str.length);

    expect(
      composerStore.currentTokens
        .filter(
          (t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type) && t.parenthesesCode === "1:1"
        )
        .every((t) => t.isParenthesisLinkedToCursor === true)
    ).toBe(true);

    expect(
      composerStore.currentTokens
        .filter(
          (t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type) && t.parenthesesCode !== "1:1"
        )
        .every((t) => t.isParenthesisLinkedToCursor === false)
    ).toBe(true);
  });

  test('type "=SUM( COS(42) ) + SIN(24)" and move cursor on right "COS" parenthesis --> only left and right parenthesis of "COS" should have background', async () => {
    await typeInComposer("=SUM( COS(42) ) + SIN(24)");
    const str = "=SUM( COS(42)";
    composerStore.changeComposerCursorSelection(str.length, str.length);

    expect(
      composerStore.currentTokens
        .filter(
          (t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type) && t.parenthesesCode === "1:1"
        )
        .every((t) => t.isParenthesisLinkedToCursor === true)
    ).toBe(true);

    expect(
      composerStore.currentTokens
        .filter(
          (t) => ["RIGHT_PAREN", "LEFT_PAREN"].includes(t.type) && t.parenthesesCode !== "1:1"
        )
        .every((t) => t.isParenthesisLinkedToCursor === false)
    ).toBe(true);
  });

  test('type "=SUM(42, 24))))" --> right parenthesis should not have background', async () => {
    await typeInComposer("=SUM(42, 24))))");
    expect(composerStore.tokenAtCursor?.isParenthesisLinkedToCursor).toBe(false);
  });
});

describe("composer highlights color", () => {
  test("colors start with first color", async () => {
    setCellContent(model, "A1", "=a1+a2");
    await startComposition();
    expect(composerStore.highlights.length).toBe(2);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerStore.highlights[1].color).toBe(colors[1]);
  });

  test("colors start with first color using +", async () => {
    setCellContent(model, "A1", "+a1+a2");
    await startComposition();
    expect(composerStore.highlights.length).toBe(2);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerStore.highlights[1].color).toBe(colors[1]);
  });

  test("colors always start with first color", async () => {
    setCellContent(model, "A1", "=b1+b2");
    setCellContent(model, "A2", "=b1+b3");
    await startComposition();
    expect(composerStore.highlights.length).toBe(2);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerStore.highlights[1].color).toBe(colors[1]);
    await keyDown({ key: "Enter" });

    await startComposition();
    expect(composerStore.highlights.length).toBe(2);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerStore.highlights[1].color).toBe(colors[1]);
  });

  test("duplicate highlights when there are several same ranges", async () => {
    setCellContent(model, "A1", "=a1+a1");
    await startComposition();
    expect(composerStore.highlights.length).toBe(2);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerStore.highlights[1].color).toBe(colors[0]);
  });

  test("highlight range", async () => {
    setCellContent(model, "A1", "=sum(a1:a10)");
    composerEl = await startComposition();
    expect(composerStore.highlights.length).toBe(1);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerEl.textContent).toBe("=sum(A1:A10)");
  });

  test("highlight range using +", async () => {
    setCellContent(model, "A1", "+sum(A1:A10)");
    composerEl = await startComposition();
    expect(composerStore.highlights.length).toBe(1);
    expect(composerStore.highlights[0].color).toBe(colors[0]);
    expect(composerEl.textContent).toBe("+sum(A1:A10)");
  });

  test("highlight 'reverse' ranges", async () => {
    setCellContent(model, "A1", "=sum(B3:a1)");
    await startComposition();
    expect(composerStore.highlights[0].range.zone).toEqual({
      left: 0,
      right: 1,
      top: 0,
      bottom: 2,
    });
  });

  test("Do not highlight invalid ref", async () => {
    setCellContent(model, "A1", "=A1A");
    composerEl = await startComposition();
    expect(composerStore.highlights.length).toBe(0);
    expect(composerEl.textContent).toBe("=A1A");
  });

  test("highlight cross-sheet ranges", async () => {
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "=B1+Sheet2!A1");
    await startComposition();
    const highlights = composerStore.highlights;
    expect(highlights).toHaveLength(2);
    expect(highlights[0].range.sheetId).toBe(model.getters.getActiveSheetId());
    expect(highlights[0].range.zone).toEqual({ left: 1, right: 1, top: 0, bottom: 0 });
    expect(highlights[1].range.sheetId).toBe("42");
    expect(highlights[1].range.zone).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  test("highlight cross-sheet ranges using +", async () => {
    createSheet(model, { sheetId: "42" });
    setCellContent(model, "A1", "+B1+Sheet2!A1");
    await startComposition();
    const highlights = composerStore.highlights;
    expect(highlights).toHaveLength(2);
    expect(highlights[0].range.sheetId).toBe(model.getters.getActiveSheetId());
    expect(highlights[0].range.zone).toEqual({ left: 1, right: 1, top: 0, bottom: 0 });
    expect(highlights[1].range.sheetId).toBe("42");
    expect(highlights[1].range.zone).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  test.skip("grid composer is resized when top bar composer grows", async () => {});
});

describe("Composer string is correctly translated to DOM", () => {
  test("Simple string", async () => {
    const composerEl = await typeInComposer("I'm a simple content");
    expect(composerEl).toMatchSnapshot();
  });
  test("Simple formula", async () => {
    const composerEl = await typeInComposer("=1 + A1");
    expect(composerEl).toMatchSnapshot();
  });
  test("Selection indicator in simple formula", async () => {
    const composerEl = await typeInComposer("=");
    expect(composerEl).toMatchSnapshot();
  });
  test("Multi-line string", async () => {
    const composerEl = await typeInComposer("\nI'm\nmulti\n\nline\n");
    expect(composerEl).toMatchSnapshot();
  });
  test("Multi-line formula", async () => {
    const composerEl = await typeInComposer("=\nA1: \nA2\n\n+SUM(\n5)");
    expect(composerEl).toMatchSnapshot();
  });
  test("Selection indicator in multi-line formula", async () => {
    const composerEl = await typeInComposer("=\n\n");
    expect(composerEl).toMatchSnapshot();
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
    expect(composerStore.editionMode).not.toBe("inactive");
    expect(fixture.querySelectorAll("div.o-composer")).toHaveLength(1);
    expect(pasteFn).not.toHaveBeenCalled();
    fixture.removeEventListener("paste", parentPasteFn);
  });

  test("Default paste is prevented in a closed composer", async () => {
    composerEl = fixture.querySelector("div.o-composer")! as HTMLDivElement;
    const pasteEvent = new Event("paste", { cancelable: true });
    composerEl.dispatchEvent(pasteEvent);
    await nextTick();
    expect(pasteEvent.defaultPrevented).toBeTruthy();
    expect(composerStore.editionMode).toBe("inactive");
  });
});

describe("Double click selection in composer", () => {
  test("Double click on range in the formula will select the whole range", async () => {
    const composerEl = await typeInComposer("=SUM(A1:A30)");
    // mock the real situation
    // first, A30 will be selected if we double click on the A30 part
    // this step is done in `onClick` before `onDblClick`
    composerStore.changeComposerCursorSelection(8, 11);
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 8,
      end: 11,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 5,
      end: 11,
    });
  });

  test("Double click at the end of content will not select anything", async () => {
    const content = "=SUM(A1:A30)";
    const composerEl = await typeInComposer(content);
    composerStore.changeComposerCursorSelection(content.length - 1, content.length - 1);
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: content.length - 1,
      end: content.length - 1,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: content.length - 1,
      end: content.length - 1,
    });
  });

  test("Double click on normal text won't select the whole text", async () => {
    const composerEl = await typeInComposer("A1:A30");
    composerStore.changeComposerCursorSelection(3, 6);
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 3,
      end: 6,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 3,
      end: 6,
    });
  });

  test("Double quoted STRING token after = sign will be selected word by word after double click", async () => {
    const composerEl = await typeInComposer('="Doule quoted string"');
    composerStore.changeComposerCursorSelection(8, 14); // select word "quoted"
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 8,
      end: 14,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 8,
      end: 14,
    });
  });

  test("Double click on function parameters does not produce a traceback", async () => {
    const composerEl = await typeInComposer("=A1+A2+A3");
    composerStore.changeComposerCursorSelection(1, 6);
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 1,
      end: 6,
    });
    triggerMouseEvent(composerEl, "dblclick");
    await nextTick();
    expect(composerStore.composerSelection).toEqual({
      start: 1,
      end: 6,
    });
  });
});
