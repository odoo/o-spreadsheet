import { Spreadsheet } from "../../src";
import {
  MatchingParenColor,
  NumberColor,
  tokenColor,
} from "../../src/components/composer/composer";
import { fontSizes } from "../../src/fonts";
import { colors, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { LinkCell } from "../../src/types";
import {
  activateSheet,
  createSheet,
  createSheetWithName,
  merge,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { clickCell, simulateClick, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getActiveXc, getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import {
  makeTestFixture,
  mountSpreadsheet,
  nextTick,
  startGridComposition,
  typeInComposerGrid as typeInComposerGridHelper,
} from "../test_helpers/helpers";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let canvasEl: Element;
let fixture: HTMLElement;
let parent: Spreadsheet;
let cehMock: ContentEditableHelper;

function getHighlights(model: Model): any[] {
  return model.getters.getHighlights();
}

async function startComposition(key?: string) {
  const composerEl = await startGridComposition(key);
  // @ts-ignore
  cehMock = window.mockContentHelper;
  return composerEl;
}

async function typeInComposerGrid(text: string, fromScratch: boolean = true) {
  const composerEl = await typeInComposerGridHelper(text, fromScratch);
  // @ts-ignore
  cehMock = window.mockContentHelper;
  return composerEl;
}

async function keydown(key: string, options: any = {}) {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, options))
  );
  await nextTick();
  await nextTick();
}
async function keyup(key: string, options: any = {}) {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent("keyup", Object.assign({ key, bubbles: true, cancelable: true }, options))
  );
  await nextTick();
  await nextTick();
}

beforeEach(async () => {
  fixture = makeTestFixture();
  parent = await mountSpreadsheet(fixture);
  model = parent.model;
  canvasEl = parent.el?.querySelector(".o-grid")!;
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("ranges and highlights", () => {
  test("=+Click Cell, the cell ref should be colored", async () => {
    composerEl = await typeInComposerGrid("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
    expect(
      // @ts-ignore
      (window.mockContentHelper as ContentEditableHelper).colors["C8"]
    ).toBe(colors[0]);
  });

  test("=SU, the = should be colored", async () => {
    await typeInComposerGrid("=SU");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["="]).toBe("#3da4ab");
    expect(contentColors["SU"]).toBe("#000");
  });

  test("=+Click range, the range ref should be colored", async () => {
    composerEl = await typeInComposerGrid("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    triggerMouseEvent("canvas", "mousemove", 200, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=B8:C8");
    expect(
      // @ts-ignore
      (window.mockContentHelper as ContentEditableHelper).colors["B8:C8"]
    ).toBe(colors[0]);
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
    await typeInComposerGrid(`=SUM(${ref})`);
    expect(
      // @ts-ignore
      (window.mockContentHelper as ContentEditableHelper).colors[ref]
    ).toBe(colors[0]);
  });

  test("=Key DOWN in A1, should select and highlight A2", async () => {
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2");
  });

  test("reference position is reset at each selection", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(1);
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2");
    composerEl = await typeInComposerGrid("+", false);
    expect(composerEl.textContent).toBe("=A2+");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(4);
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2+A2");
  });

  test("=Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowDown");
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=A3");
  });

  test("=Key RIGHT in A1, should select and highlight B1", async () => {
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowRight");
    expect(composerEl.textContent).toBe("=B1");
  });

  test("=Key RIGHT twice selects C1", async () => {
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowRight");
    await keyup("ArrowRight");
    expect(composerEl.textContent).toBe("=B1");
    await keydown("ArrowRight");
    await keyup("ArrowRight");
    expect(composerEl.textContent).toBe("=C1");
  });

  test("=Key UP in B2, should select and highlight B1", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowUp");
    expect(composerEl.textContent).toBe("=B1");
  });

  test("=Key LEFT in B2, should select and highlight A2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowLeft");
    expect(composerEl.textContent).toBe("=A2");
  });

  test("=Key DOWN and UP in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowDown");
    await keydown("ArrowUp");
    expect(composerEl.textContent).toBe("=B2");
  });

  test("=key UP 2 times and key DOWN in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowUp");
    await keydown("ArrowUp");
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=B2");
  });

  test("While selecting a ref, Shift+UP/DOWN/LEFT/RIGHT extend the range selection and updates the composer", async () => {
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2");
    await keydown("ArrowDown", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:A3");
    await keydown("ArrowRight", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:B3");
    await keydown("ArrowUp", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:B2");
    await keydown("ArrowLeft", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2");
  });

  test("Create a ref with merges with keyboard -> the merge should be treated as one cell", async () => {
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { delta: [1, 1] });
    merge(model, "B2:C3");
    selectCell(model, "C1");
    composerEl = await typeInComposerGrid("=");
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=B2");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject({
      top: 1,
      bottom: 2,
      left: 1,
      right: 2,
    });
    await keydown("ArrowDown");
    expect(composerEl.textContent).toBe("=C4");
  });

  describe("change highlight position in the grid", () => {
    test("change the associated range in the composer ", async () => {
      composerEl = await typeInComposerGrid("=SUM(B2)");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C3") });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C3)");
    });

    test("change the first associated range in the composer when ranges are the same", async () => {
      composerEl = await typeInComposerGrid("=SUM(B2, B2)");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C3") });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C3, B2)");
    });

    test("the first range doesn't change if other highlight transit by the first range state ", async () => {
      composerEl = await typeInComposerGrid("=SUM(B2, B1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B3") });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B2, B3)");
    });

    test("can change references of different length", async () => {
      composerEl = await typeInComposerGrid("=SUM(B1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B1:B2") });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1:B2)");
    });

    test("can change references with sheetname", async () => {
      composerEl = await typeInComposerGrid("=Sheet42!B1");
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      await nextTick();
      expect(composerEl.textContent).toBe("=Sheet42!B2");
    });

    test("change references of the current sheet", async () => {
      composerEl = await typeInComposerGrid("=SUM(B1,Sheet42!B1)");
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1,Sheet42!B2)");
    });

    test.each([
      ["=b$1", "=C$1"],
      ["=$b1", "=$C1"],
    ])("can change cells reference with index fixed", async (ref, resultRef) => {
      composerEl = await typeInComposerGrid(ref);
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C1") });
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
      composerEl = await typeInComposerGrid(ref);
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1:B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C1:C2") });
      await nextTick();
      expect(composerEl.textContent).toBe(resultRef);
    });

    test("can change cells merged reference", async () => {
      merge(model, "B1:B2");
      composerEl = await typeInComposerGrid("=B1");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1:B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C1") });
      await nextTick();
      expect(composerEl.textContent).toBe("=C1");

      composerEl = await typeInComposerGrid("+B2");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1:B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C2") });
      await nextTick();
      expect(composerEl.textContent).toBe("=C1+C2");
    });

    test("can change cells merged reference with index fixed", async () => {
      merge(model, "B1:B2");
      composerEl = await typeInComposerGrid("=B$2");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1:B2") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("C1:C2") });
      await nextTick();
      expect(composerEl.textContent).toBe("=C$1:C$2");
    });

    test("can change references of different length with index fixed", async () => {
      composerEl = await typeInComposerGrid("=SUM($B$1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B1:B2") });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM($B$1:$B$2)");
    });

    test("change the edition mode", async () => {
      await typeInComposerGrid("=SUM(B1,");
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      await nextTick();
      expect(model.getters.getEditionMode()).toBe("editing");

      await typeInComposerGrid("=SUM(B1,");
      triggerMouseEvent("canvas", "mousedown", 300, 200);
      window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
      await nextTick();
      expect(model.getters.getEditionMode()).toBe("rangeSelected");
      model.dispatch("START_CHANGE_HIGHLIGHT", { zone: toZone("B1") });
      model.dispatch("CHANGE_HIGHLIGHT", { zone: toZone("B2") });
      await nextTick();
      expect(model.getters.getEditionMode()).toBe("editing");
    });
  });
});

describe("composer", () => {
  test("starting the edition with enter, the composer should have the focus", async () => {
    await startComposition();
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getPosition()).toEqual([0, 0]);
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer")!);
  });

  test("starting the edition with a key stroke =, the composer should have the focus after the key input", async () => {
    composerEl = await startComposition("=");
    expect(composerEl.textContent).toBe("=");
  });

  test("starting the edition with a key stroke B, the composer should have the focus after the key input", async () => {
    composerEl = await startComposition("b");
    expect(composerEl.textContent).toBe("b");
  });

  test("ArrowKeys will move to neighbour cell, if not in contentFocus mode (left/right)", async () => {
    composerEl = await startComposition("a");
    expect(composerEl.textContent).toBe("a");
    await keydown("ArrowRight");
    expect(getCellText(model, "A1")).toBe("a");
    expect(model.getters.getPosition()).toEqual([1, 0]);

    composerEl = await startComposition("b");
    expect(composerEl.textContent).toBe("b");
    await keydown("ArrowRight");
    expect(getCellText(model, "B1")).toBe("b");
    expect(model.getters.getPosition()).toEqual([2, 0]);

    await keydown("ArrowLeft");
    expect(model.getters.getPosition()).toEqual([1, 0]);
    await keydown("ArrowLeft");
    expect(model.getters.getPosition()).toEqual([0, 0]);
    composerEl = await startComposition("c");
    expect(composerEl.textContent).toBe("c");
    await keydown("Enter");
    expect(getCellText(model, "B1")).toBe("b");
    expect(getCellText(model, "A1")).toBe("c");
  });

  test("ArrowKeys will move to neighbour cell, if not in contentFocus mode (up/down)", async () => {
    composerEl = await startComposition("a");
    expect(composerEl.textContent).toBe("a");
    await keydown("ArrowDown");
    expect(getCellText(model, "A1")).toBe("a");
    expect(model.getters.getPosition()).toEqual([0, 1]);

    composerEl = await startComposition("b");
    expect(composerEl.textContent).toBe("b");
    await keydown("ArrowDown");
    expect(getCellText(model, "A2")).toBe("b");
    expect(model.getters.getPosition()).toEqual([0, 2]);

    await keydown("ArrowUp");
    expect(model.getters.getPosition()).toEqual([0, 1]);
    await keydown("ArrowUp");
    expect(model.getters.getPosition()).toEqual([0, 0]);
    composerEl = await startComposition("c");
    expect(composerEl.textContent).toBe("c");
    await keydown("Enter");
    expect(getCellText(model, "A2")).toBe("b");
    expect(getCellText(model, "A1")).toBe("c");
  });

  test("type '=', backspace and select a cell should not add it", async () => {
    composerEl = await typeInComposerGrid("=");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    cehMock.removeAll();
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new Event("keyup"));
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    await nextTick();
    expect(getActiveXc(model)).toBe("C8");
    expect(fixture.querySelectorAll(".o-grid div.o-composer")).toHaveLength(0);
  });

  test("type '=' in the sheet and select a cell", async () => {
    composerEl = await startComposition("=");
    expect(composerEl.textContent).toBe("=");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(1);
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
  });

  test("type '=', select twice a cell", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("rangeSelected");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
  });

  test("type '=', select a cell, press enter", async () => {
    composerEl = await typeInComposerGrid("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
    expect(model.getters.getEditionMode()).toBe("rangeSelected");
    await keydown("Enter");
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCellText(model, "A1")).toBe("=C8");
  });

  test("clicking on the composer while typing text (not formula) does not duplicates text", async () => {
    composerEl = await typeInComposerGrid("a");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(composerEl.textContent).toBe("a");
  });

  test("typing incorrect formula then enter exits the edit mode and moves to the next cell down", async () => {
    await typeInComposerGrid("=qsdf");
    await keydown("Enter");
    expect(getCellText(model, "A1")).toBe("=qsdf");
    expect(getCell(model, "A1")!.evaluated.value).toBe("#BAD_EXPR");
  });

  test("typing text then enter exits the edit mode and moves to the next cell down", async () => {
    await startComposition();
    await typeInComposerGrid("qsdf");
    await keydown("Enter");
    expect(getCellContent(model, "A1")).toBe("qsdf");
    expect(getCell(model, "A1")!.evaluated.value).toBe("qsdf");
  });

  test("typing CTRL+C does not type C in the cell", async () => {
    canvasEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("");
  });
  test("keyup event triggered after edition end", async () => {
    canvasEl.dispatchEvent(
      new KeyboardEvent("keydown", Object.assign({ key: "d", bubbles: true }))
    );
    await nextTick();
    const composerEl = fixture.querySelector("div.o-composer")!;
    expect(model.getters.getEditionMode()).toBe("editing");
    // Enter is pressed really fast while another character is pressed such that
    // the character keyup event happens after the Enter
    composerEl.dispatchEvent(
      new KeyboardEvent("keydown", Object.assign({ key: "Enter", bubbles: true }))
    );
    composerEl.dispatchEvent(
      new KeyboardEvent("keyup", Object.assign({ key: "Enter", bubbles: true }))
    );
    composerEl.dispatchEvent(
      new KeyboardEvent("keyup", Object.assign({ key: "d", bubbles: true }))
    );
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("edit link cell changes the label", async () => {
    setCellContent(model, "A1", "[label](http://odoo.com)");
    await clickCell(model, "A1");
    await nextTick();
    expect(fixture.querySelector(".o-link-tool")).not.toBeNull();
    await startComposition();
    await typeInComposerGrid(" updated");
    await keydown("Enter");
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.label).toBe("label updated");
    expect(cell.link.url).toBe("http://odoo.com");
    expect(fixture.querySelector(".o-link-tool")).toBeNull();
  });

  test("Hitting enter on topbar composer will properly update it", async () => {
    setCellContent(model, "A1", "I am Tabouret");
    await clickCell(model, "A1");
    const topbarComposerElement = fixture.querySelector(
      ".o-topbar-toolbar .o-composer-container div"
    )!;
    expect(topbarComposerElement.textContent).toBe("I am Tabouret");
    await simulateClick(topbarComposerElement);
    await keydown("Enter");
    expect(topbarComposerElement.textContent).toBe("");
  });

  test("Losing focus on topbar composer will properly update it", async () => {
    setCellContent(model, "A1", "I am Tabouret");
    await clickCell(model, "A1");
    const topbarComposerElement = fixture.querySelector(
      ".o-topbar-toolbar .o-composer-container div"
    )!;
    expect(topbarComposerElement.textContent).toBe("I am Tabouret");
    await simulateClick(topbarComposerElement); // gain focus on topbar composer
    await keydown("ArrowLeft");
    await simulateClick("canvas", 300, 200); // focus another Cell (i.e. C8)
    expect(topbarComposerElement.textContent).toBe("");
  });

  test("focus topbar composer then focus grid composer", async () => {
    const topbarComposerElement = fixture.querySelector(
      ".o-topbar-toolbar .o-composer-container div"
    )!;
    await simulateClick(topbarComposerElement);
    expect(document.activeElement).toBe(topbarComposerElement);
    const gridComposerElement = fixture.querySelector(".o-grid .o-composer-container div")!;
    await simulateClick(gridComposerElement);
    expect(document.activeElement).toBe(gridComposerElement);
  });

  describe("change selecting mode when typing specific token value", () => {
    const matchingValues = [",", "+", "*", "="];
    const mismatchingValues = ["1", '"coucou"', "TRUE", "SUM", "A2"];
    const formulas = ["=", "=SUM("];

    describe.each(formulas)("typing %s followed by", (formula) => {
      test.each(matchingValues.concat(["("]))(
        "a matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          await startComposition();
          composerEl = await typeInComposerGrid(content);
          expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(content);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe(content.length);
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          await startComposition();
          composerEl = await typeInComposerGrid(content);
          expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(content);
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(matchingValues.concat(["("]))(
        "a matching value & spaces --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          const newContent = content + "   ";
          await startComposition();
          composerEl = await typeInComposerGrid(newContent);
          expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(newContent);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe(newContent.length);
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value & spaces --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          await startComposition();
          composerEl = await typeInComposerGrid(content + "   ");
          expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(content + "   ");
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a UNKNOWN token & a matching value --> not activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          const content = formula + "'" + matchingValue;
          await startComposition();
          composerEl = await typeInComposerGrid(content);
          expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(content);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          await startComposition();
          await typeInComposerGrid(matchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",");
          expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(formula + "," + matchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe((formula + ",").length);
        }
      );

      async function moveToStart() {
        model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
        await nextTick();
        model.dispatch("STOP_COMPOSER_RANGE_SELECTION");
        await nextTick();
      }

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          await startComposition();
          await typeInComposerGrid(mismatchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",");
          expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(formula + "," + mismatchingValue);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & spaces & located before matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          await startComposition();
          await typeInComposerGrid(matchingValue);
          await moveToStart();
          const formulaInput = formula + ",  ";
          composerEl = await typeInComposerGrid(formulaInput);
          expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(formulaInput + matchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe(formulaInput.length);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & spaces & located before mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          await startComposition();
          await typeInComposerGrid(mismatchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",  ");
          expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(formula + ",  " + mismatchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before spaces & matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          await startComposition();
          await typeInComposerGrid("   " + matchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",");
          expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
          expect(composerEl.textContent).toBe(formula + ",   " + matchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
          expect(cehMock.selectionState.position).toBe((formula + ",").length);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before spaces & mismatching value --> not activate 'waitingForRangeSelection' mode",
        async (mismatchingValue) => {
          await startComposition();
          await typeInComposerGrid("   " + mismatchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",");
          expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
          expect(composerEl.textContent).toBe(formula + ",   " + mismatchingValue);
        }
      );
    });

    test.each([",", "+", "*", ")", "("])(
      "typing a matching values (except '=') --> not activate 'waitingForRangeSelection' mode",
      async (value) => {
        await startComposition();
        composerEl = await typeInComposerGrid(value);
        expect(model.getters.getEditionMode()).not.toBe("waitingForRangeSelection");
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        expect(composerEl.textContent).toBe(value);
      }
    );

    test("typing '='--> activate 'waitingForRangeSelection' mode", async () => {
      await startComposition();
      composerEl = await typeInComposerGrid("=");
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      expect(composerEl.textContent).toBe("=");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(1);
    });

    test("typing '=' & spaces --> activate 'waitingForRangeSelection' mode", async () => {
      await startComposition();
      const content = "=   ";
      composerEl = await typeInComposerGrid(content);
      expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
      expect(composerEl.textContent).toBe("=   ");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(content.length);
    });
  });

  test("type '=', select a cell in another sheet", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    createSheet(model, { sheetId: "42", activate: true });
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("rangeSelected");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=Sheet2!C8");
  });

  test("type =, select a cell in another sheet which contains spaces", async () => {
    const sheetId = model.getters.getActiveSheetId();
    createSheetWithName(model, { sheetId: "42", position: 1 }, "Sheet 2");
    setCellContent(model, "C8", "1", "42");
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    activateSheet(model, "42");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("='Sheet 2'!C8");
    model.dispatch("STOP_EDITION");
    expect(getCellContent(model, "A1", sheetId)).toBe("1");
  });

  test("Home key sets cursor at the beginning", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    await keydown("Home");
    await keyup("Home");
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 0 });
  });

  test("End key sets cursor at the end", async () => {
    await typeInComposerGrid("Hello");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keydown("End");
    await keyup("End");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
  });

  test("Move cursor while in edit mode with non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await keydown("Enter");
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    for (let _ in [1, 2, 3]) {
      await keydown("ArrowLeft");
    }
    await keyup("ArrowLeft");
    expect(model.getters.getComposerSelection()).toEqual({ start: 2, end: 2 });
    for (let _ in [1, 2]) {
      await keydown("ArrowRight");
    }
    await keyup("ArrowRight");

    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
  });

  test("Move cursor while in edit mode with empty cell", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    await keydown("ArrowLeft");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Select a right-to-left range with the keyboard", async () => {
    setCellContent(model, "A1", "Hello");
    await keydown("Enter");
    const { end } = model.getters.getComposerSelection();
    await keydown("ArrowLeft", { shiftKey: true });
    await keyup("ArrowLeft", { shiftKey: true });
    expect(model.getters.getComposerSelection()).toEqual({
      start: end,
      end: end - 1,
    });
  });

  test("Select a left-to-right range with the keyboard in a non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await keydown("Enter");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keydown("ArrowRight", { shiftKey: true });
    await keyup("ArrowRight", { shiftKey: true });
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 1 });
  });

  test("Select a left-to-right range with the keyboard in an empty cell", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getEditionMode()).toBe("editing");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keydown("ArrowRight", { shiftKey: true });
    await keyup("ArrowRight", { shiftKey: true });
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("type '=', select a cell in another sheet with space in name", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet 2");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("rangeSelected");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("='Sheet 2'!C8");
  });

  test("type '=', select a cell in another sheet, select a cell in the active sheet", async () => {
    composerEl = await typeInComposerGrid("=");
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    activateSheet(model, sheet);
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
  });

  describe("composer's style depends on the style of the cell", () => {
    test("with text color", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { textColor: "#123456" },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.color).toBe("rgb(18, 52, 86)");
      // @ts-ignore
      const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
      // the composer doesn't force any color
      expect(contentColors["Hello"]).toBeUndefined();
    });

    test("with background color", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { fillColor: "#123456" },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.background).toBe("rgb(18, 52, 86)");
    });

    test("with font size", async () => {
      const fontSize = fontSizes[0];
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { fontSize: fontSize.pt },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontSize).toBe("10px");
    });

    test("with font weight", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { bold: true },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontWeight).toBe("bold");
    });

    test("with font style", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { italic: true },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontStyle).toBe("italic");
    });

    test("with text decoration strikethrough", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { strikethrough: true },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("line-through");
    });

    test("with text decoration underline", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { underline: true },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("underline");
    });

    test("with text decoration strikethrough and underline", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { strikethrough: true, underline: true },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("line-through underline");
    });

    test("with text align", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { align: "right" },
      });
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textAlign).toBe("right");
    });
  });

  describe("composer's style does not depend on the style of the cell when it is a formula", () => {
    test("with text color", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { textColor: "#123456" },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.color).toBe("rgb(0, 0, 0)");
    });

    test("with background color", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { textColor: "#123456" },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.background).toBe("rgb(255, 255, 255)");
    });

    test("with font size", async () => {
      const fontSize = fontSizes[0];
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { fontSize: fontSize.pt },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontSize).toBe("13px");
    });

    test("with font weight", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { bold: true },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontWeight).toBe("500");
    });

    test("with font style", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { italic: true },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontStyle).toBe("normal");
    });

    test("with text decoration", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { strikethrough: true },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("none");
    });

    test("with text align", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { align: "right" },
      });
      await typeInComposerGrid("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textAlign).toBe("left");
    });
  });

  test("clicking on the composer while in 'waitingForRangeSelection' mode should put the composer in 'edition' mode", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("editing");
  });

  test("The composer should be closed before opening the context menu", async () => {
    await typeInComposerGrid("=");
    triggerMouseEvent("canvas", "contextmenu", 300, 200);
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(fixture.querySelectorAll(".o-grid div.o-composer")).toHaveLength(0);
  });

  test("type '=', stop editing with enter, click on the modified cell --> the edition mode should be inactive", async () => {
    // type '=' in C8
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("waitingForRangeSelection");

    // stop editing with enter
    await keydown("Enter");
    expect(getCellText(model, "C8")).toBe("=");
    expect(getCell(model, "C8")!.evaluated.value).toBe("#BAD_EXPR");
    expect(getActiveXc(model)).toBe("C9");
    expect(model.getters.getEditionMode()).toBe("inactive");

    // click on the modified cell C8
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(getActiveXc(model)).toBe("C8");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Add a character changing the edition mode to waitingForRangeSelection correctly renders the composer", async () => {
    await typeInComposerGrid("=sum(4");
    expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
    await typeInComposerGrid(",");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
  });
});

describe("composer formula color", () => {
  test('type "=SUM" --> SUM should have specific function color', async () => {
    composerEl = await typeInComposerGrid("=SUM");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["SUM"]).toBe(tokenColor["FUNCTION"]);
  });

  test('type "=SUM(" --> left parenthesis should be highlighted', async () => {
    composerEl = await typeInComposerGrid("=SUM(");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["("]).toBe(MatchingParenColor);
  });

  test('type "=SUM(1" --> left parenthesis should have specific parenthesis color', async () => {
    composerEl = await typeInComposerGrid("=SUM(1");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["("]).toBe(tokenColor["LEFT_PAREN"]);
  });

  test('type "=SUM(1" --> number should have specific number color', async () => {
    composerEl = await typeInComposerGrid("=SUM(1");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["1"]).toBe(tokenColor["NUMBER"]);
  });

  test('type "=SUM(1," --> comma should have specific comma color', async () => {
    composerEl = await typeInComposerGrid("=SUM(1,");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors[","]).toBe(tokenColor["COMMA"]);
  });

  test(`type '=SUM(1, "2"' --> string should have specific string color`, async () => {
    composerEl = await typeInComposerGrid('=SUM(1, "2"');
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors[`"2"`]).toBe(tokenColor["STRING"]);
  });

  test(`type '=SUM(1, "2")' --> right parenthesis should be highlighted`, async () => {
    composerEl = await typeInComposerGrid('=SUM(1, "2")');
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors[")"]).toBe(MatchingParenColor);
  });

  test(`type '=SUM(1, "2") +' --> right parenthesis should have specific parenthesis color`, async () => {
    composerEl = await typeInComposerGrid('=SUM(1, "2") +');
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors[")"]).toBe(tokenColor["RIGHT_PAREN"]);
  });

  test(`type '=SUM(1, "2") +' --> operator should have specific operator color`, async () => {
    composerEl = await typeInComposerGrid('=SUM(1, "2") +');
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["+"]).toBe(tokenColor["OPERATOR"]);
  });

  test(`type '=SUM(1, "2") + TRUE' --> boolean should have specific bolean color`, async () => {
    composerEl = await typeInComposerGrid('=SUM(1, "2") + TRUE');
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["TRUE"]).toBe(NumberColor);
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

    document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
    canvasEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    await nextTick();
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
    expect(highlights[0].sheet).toBe(model.getters.getActiveSheetId());
    expect(highlights[0].zone).toEqual({ left: 1, right: 1, top: 0, bottom: 0 });
    expect(highlights[1].sheet).toBe("42");
    expect(highlights[1].zone).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });
  test("grid composer is resized when top bar composer grows", async () => {});
});
