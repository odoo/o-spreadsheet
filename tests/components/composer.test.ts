import {
  MatchingParenColor,
  NumberColor,
  tokenColor,
} from "../../src/components/composer/composer/composer";
import { fontSizes } from "../../src/fonts";
import { colors, toCartesian, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { Highlight, LinkCell } from "../../src/types";
import {
  activateSheet,
  createSheet,
  createSheetWithName,
  merge,
  resizeAnchorZone,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import {
  clickCell,
  gridMouseEvent,
  hoverCell,
  keyDown,
  keyUp,
  rightClickCell,
  selectColumnByClicking,
  simulateClick,
} from "../test_helpers/dom_helper";
import { getActiveXc, getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import {
  createEqualCF,
  MockClipboard,
  mountSpreadsheet,
  nextTick,
  startGridComposition,
  toRangesData,
  typeInComposerGrid as typeInComposerGridHelper,
} from "../test_helpers/helpers";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let gridInputEl: Element;
let fixture: HTMLElement;
let cehMock: ContentEditableHelper;

function getHighlights(model: Model): Highlight[] {
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

beforeEach(async () => {
  jest.useFakeTimers();
  ({ model, fixture } = await mountSpreadsheet());
  gridInputEl = fixture.querySelector(".o-grid div.o-composer")!;
});

describe("ranges and highlights", () => {
  test("=+Click Cell, the cell ref should be colored", async () => {
    composerEl = await typeInComposerGrid("=");
    await clickCell(model, "C8");
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
    gridMouseEvent(model, "mousedown", "C8");
    gridMouseEvent(model, "mousemove", "B8");
    gridMouseEvent(model, "mouseup", "B8");
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
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2");
  });

  test("reference position is reset at each selection", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(1);
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2");
    composerEl = await typeInComposerGrid("+", false);
    expect(composerEl.textContent).toBe("=A2+");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(4);
    expect(model.getters.getEditionMode()).toBe("selecting");
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2+A2");
  });

  test("=Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowDown");
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=A3");
  });

  test("=Key RIGHT in A1, should select and highlight B1", async () => {
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowRight");
    expect(composerEl.textContent).toBe("=B1");
  });

  test("=Key RIGHT twice selects C1", async () => {
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowRight");
    await keyUp("ArrowRight");
    expect(composerEl.textContent).toBe("=B1");
    await keyDown("ArrowRight");
    await keyUp("ArrowRight");
    expect(composerEl.textContent).toBe("=C1");
  });

  test("=Key UP in B2, should select and highlight B1", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowUp");
    expect(composerEl.textContent).toBe("=B1");
  });

  test("=Key LEFT in B2, should select and highlight A2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowLeft");
    expect(composerEl.textContent).toBe("=A2");
  });

  test("=Key DOWN and UP in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowDown");
    await keyDown("ArrowUp");
    expect(composerEl.textContent).toBe("=B2");
  });

  test("=key UP 2 times and key DOWN in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowUp");
    await keyDown("ArrowUp");
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=B2");
  });

  test("While selecting a ref, Shift+UP/DOWN/LEFT/RIGHT extend the range selection and updates the composer", async () => {
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=A2");
    await keyDown("ArrowDown", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:A3");
    await keyDown("ArrowRight", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:B3");
    await keyDown("ArrowUp", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2:B2");
    await keyDown("ArrowLeft", { shiftKey: true });
    expect(composerEl.textContent).toBe("=A2");
  });

  test("Create a ref with merges with keyboard -> the merge should be treated as one cell", async () => {
    selectCell(model, "B2");
    resizeAnchorZone(model, "down");
    resizeAnchorZone(model, "right");
    merge(model, "B2:C3");
    selectCell(model, "C1");
    composerEl = await typeInComposerGrid("=");
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=B2");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject(toZone("B2:C3"));
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toBe("=C4");
  });

  test("Create a ref overlapping merges by typing -> the merge is ignored if the range covers several cells", async () => {
    merge(model, "B2:C3");
    selectCell(model, "C1");
    composerEl = await typeInComposerGrid("=B2:B10");
    expect(composerEl.textContent).toBe("=B2:B10");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject(toZone("B2:B10"));
    model.dispatch("STOP_EDITION", { cancel: true });
    composerEl = await typeInComposerGrid("=B2:B3");
    expect(composerEl.textContent).toBe("=B2:B3");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject(toZone("B2:B3"));
  });

  describe("change highlight position in the grid", () => {
    test("change the associated range in the composer ", async () => {
      composerEl = await typeInComposerGrid("=SUM(B2)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C3"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C3)");
    });

    test("highlights change handle unbounded ranges ", async () => {
      composerEl = await typeInComposerGrid("=SUM(B:B)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B:B"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C:C"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C:C)");
    });

    test("change the first associated range in the composer when ranges are the same", async () => {
      composerEl = await typeInComposerGrid("=SUM(B2, B2)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C3"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(C3, B2)");
    });

    test("the first range doesn't change if other highlight transit by the first range state ", async () => {
      composerEl = await typeInComposerGrid("=SUM(B2, B1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B3"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B2, B3)");
    });

    test("can change references of different length", async () => {
      composerEl = await typeInComposerGrid("=SUM(B1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:B2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1:B2)");
    });

    test("can change references with sheetname", async () => {
      composerEl = await typeInComposerGrid("=Sheet42!B1");
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=Sheet42!B2");
    });

    test("change references of the current sheet", async () => {
      composerEl = await typeInComposerGrid("=SUM(B1,Sheet42!B1)");
      createSheetWithName(model, { sheetId: "42", activate: true }, "Sheet42");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM(B1,Sheet42!B2)");
    });

    test.each([
      ["=b$1", "=C$1"],
      ["=$b1", "=$C1"],
    ])("can change cells reference with index fixed", async (ref, resultRef) => {
      composerEl = await typeInComposerGrid(ref);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C1"),
      });
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
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C1:C2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe(resultRef);
    });

    test("can change cells merged reference", async () => {
      merge(model, "B1:B2");
      composerEl = await typeInComposerGrid("=B1");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C1"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=C1");

      composerEl = await typeInComposerGrid("+B2", false);
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=C1+C2");
    });

    test("can change cells merged reference with index fixed", async () => {
      merge(model, "B1:B2");
      composerEl = await typeInComposerGrid("=B$2");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:B2"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "C1:C2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=C$1:C$2");
    });

    test("references are expanded to include merges", async () => {
      merge(model, "C1:D1");
      composerEl = await typeInComposerGrid("=A1:B1");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "A1:B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:C1"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=B1:D1");
    });

    test("can change references of different length with index fixed", async () => {
      composerEl = await typeInComposerGrid("=SUM($B$1)");
      model.dispatch("START_CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1"),
      });
      model.dispatch("CHANGE_HIGHLIGHT", {
        range: model.getters.getRangeDataFromXc(model.getters.getActiveSheetId(), "B1:B2"),
      });
      await nextTick();
      expect(composerEl.textContent).toBe("=SUM($B$1:$B$2)");
    });
  });
});

describe("composer", () => {
  test("grid composer is not visible when not editing", async () => {
    expect(model.getters.getEditionMode()).toBe("inactive");
    const gridComposerEl = fixture.querySelector(".o-grid-composer") as HTMLDivElement;
    expect(gridComposerEl.style.zIndex).toBe("-1000");
    await startComposition();
    expect(gridComposerEl.style.zIndex).toBe("");
  });

  test("starting the edition with enter, the grid composer should have the focus", async () => {
    await startComposition();
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getPosition()).toEqual(toCartesian("A1"));
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
    await nextTick();
    expect(composerEl.textContent).toBe("a");
    await keyDown("ArrowRight");
    expect(getCellText(model, "A1")).toBe("a");
    expect(model.getters.getPosition()).toEqual(toCartesian("B1"));

    composerEl = await startComposition("b");
    expect(composerEl.textContent).toBe("b");
    await keyDown("ArrowRight");
    expect(getCellText(model, "B1")).toBe("b");
    expect(model.getters.getPosition()).toEqual(toCartesian("C1"));

    await keyDown("ArrowLeft");
    expect(model.getters.getPosition()).toEqual(toCartesian("B1"));
    await keyDown("ArrowLeft");
    expect(model.getters.getPosition()).toEqual(toCartesian("A1"));
    composerEl = await startComposition("c");
    expect(composerEl.textContent).toBe("c");
    await keyDown("Enter");
    expect(getCellText(model, "B1")).toBe("b");
    expect(getCellText(model, "A1")).toBe("c");
  });

  test("Arrow keys will not move to neighbor cell when a formula", async () => {
    composerEl = await startComposition("=");
    await typeInComposerGrid(`"`, false);
    await typeInComposerGrid(`"`, false);
    expect(composerEl.textContent).toBe(`=""`);
    await keyDown("ArrowLeft");
    expect(model.getters.getEditionMode()).not.toBe("inactive");
  });

  test("ArrowKeys will move to neighbour cell, if not in contentFocus mode (up/down)", async () => {
    composerEl = await startComposition("a");
    expect(composerEl.textContent).toBe("a");
    await keyDown("ArrowDown");
    expect(getCellText(model, "A1")).toBe("a");
    expect(model.getters.getPosition()).toEqual(toCartesian("A2"));

    composerEl = await startComposition("b");
    expect(composerEl.textContent).toBe("b");
    await keyDown("ArrowDown");
    expect(getCellText(model, "A2")).toBe("b");
    expect(model.getters.getPosition()).toEqual(toCartesian("A3"));

    await keyDown("ArrowUp");
    expect(model.getters.getPosition()).toEqual(toCartesian("A2"));
    await keyDown("ArrowUp");
    expect(model.getters.getPosition()).toEqual(toCartesian("A1"));
    composerEl = await startComposition("c");
    expect(composerEl.textContent).toBe("c");
    await keyDown("Enter");
    expect(getCellText(model, "A2")).toBe("b");
    expect(getCellText(model, "A1")).toBe("c");
  });

  test("type '=', backspace and select a cell should not add it", async () => {
    composerEl = await typeInComposerGrid("=");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    cehMock.removeAll();
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new Event("keyup"));
    await rightClickCell(model, "C8");
    expect(getActiveXc(model)).toBe("C8");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("type '=' in the sheet and select a cell", async () => {
    composerEl = await startComposition("=");
    expect(composerEl.textContent).toBe("=");
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
    expect(cehMock.selectionState.position).toBe(1);
    expect(model.getters.getEditionMode()).toBe("selecting");
    await clickCell(model, "C8");
    expect(composerEl.textContent).toBe("=C8");
  });

  test("type '=', select twice a cell", async () => {
    composerEl = await typeInComposerGrid("=");
    await clickCell(model, "C8");
    await clickCell(model, "C8");
    expect(composerEl.textContent).toBe("=C8");
  });

  test("type '=', select a cell, press enter", async () => {
    composerEl = await typeInComposerGrid("=");
    await clickCell(model, "C8");
    expect(composerEl.textContent).toBe("=C8");
    await keyDown("Enter");
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCellText(model, "A1")).toBe("=C8");
  });

  test("full rows/cols ranges are correctly displayed", async () => {
    composerEl = await typeInComposerGrid("=SUM(A:A)");
    await keyDown("Enter");
    expect(getCellText(model, "A1")).toBe("=SUM(A:A)");
  });

  test("clicking on the composer while typing text (not formula) does not duplicates text", async () => {
    composerEl = await typeInComposerGrid("a");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(composerEl.textContent).toBe("a");
  });

  test("typing incorrect formula then enter exits the edit mode and moves to the next cell down", async () => {
    await typeInComposerGrid("=qsdf");
    await keyDown("Enter");
    expect(getCellText(model, "A1")).toBe("=qsdf");
    expect(getCell(model, "A1")!.evaluated.value).toBe("#BAD_EXPR");
  });

  test("typing text then enter exits the edit mode and moves to the next cell down", async () => {
    await startComposition();
    await typeInComposerGrid("qsdf");
    await keyDown("Enter");
    expect(getCellContent(model, "A1")).toBe("qsdf");
    expect(getCell(model, "A1")!.evaluated.value).toBe("qsdf");
  });

  test("typing CTRL+C does not type C in the cell", async () => {
    gridInputEl.dispatchEvent(
      new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true })
    );
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("");
  });

  test("keyup event triggered after edition end", async () => {
    gridInputEl.dispatchEvent(new InputEvent("input", Object.assign({ data: "d", bubbles: true })));
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
  test("input event triggered from a paste should not open composer", async () => {
    gridInputEl.dispatchEvent(
      new InputEvent("input", {
        data: "d",
        bubbles: true,
        isComposing: false,
        inputType: "insertFromPaste",
      })
    );
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("edit link cell changes the label", async () => {
    setCellContent(model, "A1", "[label](http://odoo.com)");
    await hoverCell(model, "A1", 400);
    expect(fixture.querySelector(".o-link-tool")).not.toBeNull();
    await typeInComposerGrid(" updated");
    await keyDown("Enter");
    const cell = getCell(model, "A1") as LinkCell;
    expect(cell.link.url).toBe("http://odoo.com");
  });

  test("Pressing Enter while editing a label does not open grid composer", async () => {
    setCellContent(model, "A1", "[label](url.com)");
    await simulateClick(".o-topbar-menu[data-id='insert']");
    await simulateClick(".o-menu-item[data-name='insert_link']");
    const editor = fixture.querySelector(".o-link-editor");
    expect(editor).toBeTruthy();

    editor!.querySelectorAll("input")[0].focus();
    await keyDown("Enter");
    expect(fixture.querySelector(".o-link-editor")).toBeFalsy();
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Hitting enter on topbar composer will properly update it and stop the edition", async () => {
    setCellContent(model, "A1", "I am Tabouret");
    await clickCell(model, "A1");
    const topbarComposerElement = fixture.querySelector(
      ".o-topbar-toolbar .o-composer-container div"
    )!;
    expect(topbarComposerElement.textContent).toBe("I am Tabouret");
    await simulateClick(topbarComposerElement);
    await keyDown("Enter");
    expect(topbarComposerElement.textContent).toBe("");
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer")!);
  });

  test("Losing focus on topbar composer will properly update it", async () => {
    setCellContent(model, "A1", "I am Tabouret");
    await clickCell(model, "A1");
    const topbarComposerElement = fixture.querySelector(
      ".o-topbar-toolbar .o-composer-container div"
    )!;
    expect(topbarComposerElement.textContent).toBe("I am Tabouret");
    await simulateClick(topbarComposerElement); // gain focus on topbar composer
    await keyDown("ArrowLeft");
    await simulateClick(".o-grid-overlay", 300, 200); // focus another Cell (i.e. C8)
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
        "a matching value --> activate 'selecting' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          await startComposition();
          composerEl = await typeInComposerGrid(content);
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
          await typeInComposerGrid(content);
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
          composerEl = await typeInComposerGrid(newContent);
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
          await typeInComposerGrid(content + "   ");
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
          await typeInComposerGrid(content);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(content);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposerGrid(matchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",", false);
          expect(model.getters.getEditionMode()).toBe("selecting");
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
          composerEl = await startComposition();
          await typeInComposerGrid(mismatchingValue);
          await moveToStart();
          await typeInComposerGrid(formula + ",", false);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(formula + "," + mismatchingValue);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & spaces & located before matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposerGrid(matchingValue);
          await moveToStart();
          const formulaInput = formula + ",  ";
          composerEl = await typeInComposerGrid(formulaInput, false);
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
          await typeInComposerGrid(mismatchingValue);
          await moveToStart();
          await typeInComposerGrid(formula + ",  ", false);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(composerEl.textContent).toBe(formula + ",  " + mismatchingValue);
          expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before spaces & matching value --> activate 'waitingForRangeSelection' mode",
        async (matchingValue) => {
          composerEl = await startComposition();
          await typeInComposerGrid("   " + matchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",", false);
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
          await typeInComposerGrid("   " + mismatchingValue);
          await moveToStart();
          composerEl = await typeInComposerGrid(formula + ",", false);
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
        composerEl = await typeInComposerGrid(value);
        expect(model.getters.getEditionMode()).not.toBe("selecting");
        expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
        expect(composerEl.textContent).toBe(value);
      }
    );

    test("typing '='--> activate 'waitingForRangeSelection' mode", async () => {
      await startComposition();
      composerEl = await typeInComposerGrid("=");
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(composerEl.textContent).toBe("=");
      expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
      expect(cehMock.selectionState.position).toBe(1);
    });

    test("typing '=' & spaces --> activate 'selecting' mode", async () => {
      composerEl = await startComposition();
      const content = "=   ";
      await typeInComposerGrid(content);
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

  test.each([
    ["Sheet2", "=Sheet2!C8"],
    ["Sheet 2", "='Sheet 2'!C8"],
  ])("type '=', select a cell in another sheet", async (sheetName, expectedContent) => {
    composerEl = await typeInComposerGrid("=");
    createSheetWithName(model, { sheetId: "42", activate: true }, sheetName);
    await clickCell(model, "C8");
    expect(composerEl.textContent).toBe(expectedContent);
  });

  test("Home key sets cursor at the beginning", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    await keyDown("Home");
    await keyUp("Home");
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 0 });
  });

  test("End key sets cursor at the end", async () => {
    await typeInComposerGrid("Hello");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keyDown("End");
    await keyUp("End");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
  });

  test("Move cursor while in edit mode with non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await keyDown("Enter");
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    for (let _ in [1, 2, 3]) {
      await keyDown("ArrowLeft");
    }
    await keyUp("ArrowLeft");
    expect(model.getters.getComposerSelection()).toEqual({ start: 2, end: 2 });
    for (let _ in [1, 2]) {
      await keyDown("ArrowRight");
    }
    await keyUp("ArrowRight");

    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
  });

  test("Move cursor while in edit mode with empty cell", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getEditionMode()).toBe("editing");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    await keyDown("ArrowLeft");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Select a right-to-left range with the keyboard", async () => {
    setCellContent(model, "A1", "Hello");
    await keyDown("Enter");
    const { end } = model.getters.getComposerSelection();
    await keyDown("ArrowLeft", { shiftKey: true });
    await keyUp("ArrowLeft", { shiftKey: true });
    expect(model.getters.getComposerSelection()).toEqual({
      start: end,
      end: end - 1,
    });
  });

  test("Select a left-to-right range with the keyboard in a non empty cell", async () => {
    setCellContent(model, "A1", "Hello");
    await nextTick();
    await keyDown("Enter");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keyDown("ArrowRight", { shiftKey: true });
    await keyUp("ArrowRight", { shiftKey: true });
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 1 });
  });

  test("Select a left-to-right range with the keyboard in an empty cell", async () => {
    await typeInComposerGrid("Hello");
    expect(model.getters.getEditionMode()).toBe("editing");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 0 });
    await nextTick();
    await keyDown("ArrowRight", { shiftKey: true });
    await keyUp("ArrowRight", { shiftKey: true });
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("type '=', select a cell in another sheet, select a cell in the active sheet", async () => {
    composerEl = await typeInComposerGrid("=");
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", activate: true });
    await clickCell(model, "C8");
    activateSheet(model, sheet);
    await clickCell(model, "C8");
    expect(composerEl.textContent).toBe("=C8");
  });

  test("Composer is closed when changing sheet while not editing a formula", async () => {
    const baseSheetId = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    await nextTick();

    // Editing text
    await typeInComposerGrid("hey");
    expect(model.getters.getEditionMode()).not.toBe("inactive");
    activateSheet(model, "42");
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("inactive");

    // Editing formula
    await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).not.toBe("inactive");
    activateSheet(model, baseSheetId);
    await nextTick();
    expect(model.getters.getEditionMode()).not.toBe("inactive");
  });

  test("the composer should keep the focus after changing sheet", async () => {
    createSheet(model, { sheetId: "42", name: "Sheet2" });
    await nextTick();

    await startComposition("=");
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer")!);
    await simulateClick(fixture.querySelectorAll(".o-sheet-item.o-sheet")[1]);
    expect(model.getters.getActiveSheetId()).toEqual("42");
    expect(document.activeElement).toBe(fixture.querySelector(".o-grid div.o-composer")!);
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

    test("Composer inherit cell's CF formatting", async () => {
      const sheetId = model.getters.getActiveSheetId();
      model.dispatch("ADD_CONDITIONAL_FORMAT", {
        cf: createEqualCF(
          "4",
          {
            fillColor: "#0000FF",
            bold: true,
            italic: true,
            strikethrough: true,
            underline: true,
            textColor: "#FF0000",
          },
          "cfId"
        ),
        ranges: toRangesData(sheetId, "A1"),
        sheetId,
      });
      setCellContent(model, "A1", "4");
      await typeInComposerGrid("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("line-through underline");
      expect(gridComposer.style.fontWeight).toBe("bold");
      expect(gridComposer.style.background).toBeSameColorAs("#0000FF");
      expect(gridComposer.style.color).toBeSameColorAs("#FF0000");
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

  test("clicking on the composer while in selecting mode should put the composer in edition mode", async () => {
    composerEl = await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("editing");
  });

  test("The composer should be closed before opening the context menu", async () => {
    await typeInComposerGrid("=");
    await rightClickCell(model, "C8");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("The content in the composer should be kept after selecting headers", async () => {
    await clickCell(model, "C8");
    await typeInComposerGrid("Hello");
    await selectColumnByClicking(model, "C");
    expect(getCellText(model, "C8")).toBe("Hello");
  });

  test("type '=', stop editing with enter, click on the modified cell --> the edition mode should be inactive", async () => {
    // type '=' in C8
    await clickCell(model, "C8");
    await typeInComposerGrid("=");
    expect(model.getters.getEditionMode()).toBe("selecting");

    // stop editing with enter
    await keyDown("Enter");
    expect(getCellText(model, "C8")).toBe("=");
    expect(getCell(model, "C8")!.evaluated.value).toBe("#BAD_EXPR");
    expect(getActiveXc(model)).toBe("C9");
    expect(model.getters.getEditionMode()).toBe("inactive");

    // click on the modified cell C8
    await clickCell(model, "C8");
    expect(getActiveXc(model)).toBe("C8");
    expect(model.getters.getEditionMode()).toBe("inactive");
  });

  test("Add a character changing the edition mode to waitingForRangeSelection correctly renders the composer", async () => {
    await typeInComposerGrid("=sum(4");
    expect(cehMock.selectionState.isSelectingRange).toBeFalsy();
    await typeInComposerGrid(",", false);
    expect(cehMock.selectionState.isSelectingRange).toBeTruthy();
  });

  test("f4 shortcut on cell symbol", async () => {
    composerEl = await typeInComposerGrid("=A1");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toBe("=$A$1");
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toBe("=A$1");
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toBe("=$A1");
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toBe("=A1");
  });

  test("f4 shortcut on range symbol", async () => {
    composerEl = await typeInComposerGrid("=A1:B1");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=$A$1:$B$1");
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=A$1:B$1");
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=$A1:$B1");
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=A1:B1");
  });

  test("f4 shortcut on mixed selection", async () => {
    composerEl = await typeInComposerGrid("=SUM(A1,34,42+3,B$1:C$2,$A1+B$2)");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 30 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1,34,42+3,$B1:$C2,A1+$B2)");
  });

  test("f4 shortcut on reference to another sheet", async () => {
    composerEl = await typeInComposerGrid("=SUM(s2!A1:B1, s2!$A$1)");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 20 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=SUM(s2!$A$1:$B$1, s2!A$1)");
  });

  test("f4 shortcut on range with cell that have different fixed mode", async () => {
    composerEl = await typeInComposerGrid("=A$1:B2");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=$A1:$B$2");
  });

  test("f4 shortcut set composer selection to entire cell symbol on which f4 is applied", async () => {
    composerEl = await typeInComposerGrid("=AA1");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 2 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=$AA$1");
    expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 6 });
    expect(cehMock.currentState).toEqual({ cursorStart: 1, cursorEnd: 6 });
  });

  test("f4 shortcut set composer selection to entire range symbol on which f4 is applied", async () => {
    composerEl = await typeInComposerGrid("=A1:B2");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 2 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=$A$1:$B$2");
    expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 10 });
    expect(cehMock.currentState).toEqual({ cursorStart: 1, cursorEnd: 10 });
  });

  test("f4 shortcut set selection from the first range/cell symbol to the last", async () => {
    composerEl = await typeInComposerGrid("=SUM(A1,34,42+3,B$1:C$2)");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 20 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1,34,42+3,$B1:$C2)");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 25 });
    expect(cehMock.currentState).toEqual({ cursorStart: 5, cursorEnd: 25 });
  });

  test("f4 shortcut changes adjacent references", async () => {
    composerEl = await typeInComposerGrid("=A1+A2");
    // cursor just before +
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 3, end: 6 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=$A$1+$A$2");
    expect(model.getters.getComposerSelection()).toEqual({ start: 1, end: 10 });
    expect(cehMock.currentState).toEqual({ cursorStart: 1, cursorEnd: 10 });
  });

  test("f4 shortcut only change selected elements", async () => {
    composerEl = await typeInComposerGrid("=A1+A2");
    // cursor just after +
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 4, end: 6 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=A1+$A$2");
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 8 });
    expect(cehMock.currentState).toEqual({ cursorStart: 4, cursorEnd: 8 });
  });

  test("f4 shortcut reduces selection to select references only", async () => {
    composerEl = await typeInComposerGrid("=SUM(A1+A2)+SUM(B1)");
    // selection in the middle of SUMs
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 6, end: 13 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=SUM($A$1+$A$2)+SUM(B1)");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 14 });
    expect(cehMock.currentState).toEqual({ cursorStart: 5, cursorEnd: 14 });
  });

  test("f4 shortcut when no range is selected", async () => {
    composerEl = await typeInComposerGrid("=A1+1");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 4, end: 5 });
    await keyDown("F4");
    expect(model.getters.getCurrentContent()).toEqual("=A1+1");
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 5 });
    expect(cehMock.currentState).toEqual({ cursorStart: 4, cursorEnd: 5 });
  });

  test("f4 shortcut doesn't make selection caret appear and allow range selection", async () => {
    composerEl = await typeInComposerGrid("=SUM(A1,C2)");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 0, end: 10 });
    await keyDown("F4");
    expect(composerEl.textContent).toEqual("=SUM($A$1,$C$2)");
    await keyDown("ArrowDown");
    expect(composerEl.textContent).toEqual("=SUM($A$1,$C$2)");
  });

  test("f4 put selection at the end of looped token when the original selection was of size 0", async () => {
    composerEl = await typeInComposerGrid("=A1");
    model.dispatch("CHANGE_COMPOSER_CURSOR_SELECTION", { start: 1, end: 1 });
    await keyDown("F4");
    expect(composerEl.textContent).toEqual("=$A$1");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });

    await keyDown("F4");
    expect(composerEl.textContent).toEqual("=A$1");
    expect(model.getters.getComposerSelection()).toEqual({ start: 4, end: 4 });
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

    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await nextTick();
    gridInputEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
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
    expect(highlights[0].sheetId).toBe(model.getters.getActiveSheetId());
    expect(highlights[0].zone).toEqual({ left: 1, right: 1, top: 0, bottom: 0 });
    expect(highlights[1].sheetId).toBe("42");
    expect(highlights[1].zone).toEqual({ left: 0, right: 0, top: 0, bottom: 0 });
  });

  test("grid composer is resized when top bar composer grows", async () => {});
});

describe("Copy/paste in composer", () => {
  beforeAll(() => {
    const clipboard = new MockClipboard();
    Object.defineProperty(navigator, "clipboard", {
      get() {
        return clipboard;
      },
      configurable: true,
    });
  });

  test("Can copy random content inside the composer", async () => {
    const sypeDispatch = jest.spyOn(model, "dispatch");
    await startComposition();
    const clipboardEvent = new Event("paste", { bubbles: true, cancelable: true });
    //@ts-ignore
    clipboardEvent.clipboardData = { getData: () => "unimportant" };
    fixture.querySelector(".o-grid-composer .o-composer")!.dispatchEvent(clipboardEvent);
    await nextTick();
    expect(model.getters.getEditionMode()).not.toBe("inactive");
    expect(fixture.querySelectorAll(".o-grid-composer .o-composer")).toHaveLength(1);
    expect(sypeDispatch).not.toBeCalledWith("PASTE_FROM_OS_CLIPBOARD", expect.any);
    expect(sypeDispatch).not.toBeCalledWith("PASTE", expect.any);
  });
});
