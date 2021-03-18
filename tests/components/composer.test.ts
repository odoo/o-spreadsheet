import { fontSizes } from "../../src/fonts";
import { colors, toZone } from "../../src/helpers/index";
import { Model } from "../../src/model";
import { HighlightPlugin } from "../../src/plugins/ui/highlight";
import {
  activateSheet,
  createSheet,
  merge,
  selectCell,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { triggerMouseEvent } from "../test_helpers/dom_helper";
import { getActiveXc, getCell, getCellContent, getCellText } from "../test_helpers/getters_helpers";
import {
  GridParent,
  makeTestFixture,
  nextTick,
  startGridComposition as startComposition,
  typeInComposer as typeInComposerHelper,
} from "../test_helpers/helpers";
import { ContentEditableHelper } from "./__mocks__/content_editable_helper";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("./__mocks__/content_editable_helper")
);

let model: Model;
let composerEl: Element;
let canvasEl: Element;
let fixture: HTMLElement;
let parent: GridParent;

function getHighlights(model: Model): any[] {
  const highlightPlugin = (model as any).handlers.find((h) => h instanceof HighlightPlugin);
  return highlightPlugin.highlights;
}

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    composerEl = await startComposition();
  }
  await typeInComposerHelper(composerEl, text);
}

async function keydown(key: string, options: any = {}) {
  composerEl.dispatchEvent(
    new KeyboardEvent("keydown", Object.assign({ key, bubbles: true }, options))
  );
  await nextTick();
}
async function keyup(key: string, options: any = {}) {
  composerEl.dispatchEvent(
    new KeyboardEvent("keyup", Object.assign({ key, bubbles: true }, options))
  );
  await nextTick();
}

beforeEach(async () => {
  fixture = makeTestFixture();
  model = new Model();
  parent = new GridParent(model);
  await parent.mount(fixture);
  model.dispatch("RESIZE_VIEWPORT", {
    width: 1000,
    height: 1000,
  });
  canvasEl = parent.grid.el;
});

afterEach(() => {
  parent.destroy();
  fixture.remove();
});

describe("ranges and highlights", () => {
  test("=+Click Cell, the cell ref should be colored", async () => {
    await typeInComposer("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("=C8");
    expect(
      // @ts-ignore
      (window.mockContentHelper as ContentEditableHelper).colors["C8"]
    ).toBe(colors[0]);
  });

  test("=SU, the = should be colored", async () => {
    await typeInComposer("=SU");
    // @ts-ignore
    const contentColors = (window.mockContentHelper as ContentEditableHelper).colors;
    expect(contentColors["="]).toBe("#3da4ab");
    expect(contentColors["SU"]).toBe("#000");
  });

  test("=+Click range, the range ref should be colored", async () => {
    await typeInComposer("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    triggerMouseEvent("canvas", "mousemove", 200, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 200, clientY: 200 }));
    await nextTick();
    expect(model.getters.getCurrentContent()).toBe("=B8:C8");
    expect(
      // @ts-ignore
      (window.mockContentHelper as ContentEditableHelper).colors["B8:C8"]
    ).toBe(colors[0]);
  });

  test("=Key DOWN in A1, should select and highlight A2", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=A2");
  });

  test("reference position is reset at each selection", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=A2");
    await typeInComposer("+", false);
    expect(model.getters.getCurrentContent()).toBe("=A2+␣");
    expect(model.getters.getEditionMode()).toBe("selecting");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=A2+A2");
  });

  test("=Key DOWN+DOWN in A1, should select and highlight A3", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=A3");
  });

  test("=Key RIGHT in A1, should select and highlight B1", async () => {
    await typeInComposer("=");
    await keydown("ArrowRight");
    expect(model.getters.getCurrentContent()).toBe("=B1");
  });

  test("=Key RIGHT twice selects C1", async () => {
    await typeInComposer("=");
    await keydown("ArrowRight");
    await keyup("ArrowRight");
    expect(model.getters.getCurrentContent()).toBe("=B1");
    await keydown("ArrowRight");
    await keyup("ArrowRight");
    expect(model.getters.getCurrentContent()).toBe("=C1");
  });

  test("=Key UP in B2, should select and highlight B1", async () => {
    selectCell(model, "B2");
    await typeInComposer("=");
    await keydown("ArrowUp");
    expect(model.getters.getCurrentContent()).toBe("=B1");
  });

  test("=Key LEFT in B2, should select and highlight A2", async () => {
    selectCell(model, "B2");
    await typeInComposer("=");
    await keydown("ArrowLeft");
    expect(model.getters.getCurrentContent()).toBe("=A2");
  });

  test("=Key DOWN and UP in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    await typeInComposer("=");
    await keydown("ArrowDown");
    await keydown("ArrowUp");
    expect(model.getters.getCurrentContent()).toBe("=B2");
  });

  test("=key UP 2 times and key DOWN in B2, should select and highlight B2", async () => {
    selectCell(model, "B2");
    await typeInComposer("=");
    await keydown("ArrowUp");
    await keydown("ArrowUp");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=B2");
  });

  test("While selecting a ref, Shift+UP/DOWN/LEFT/RIGHT extend the range selection and updates the composer", async () => {
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=A2");
    await keydown("ArrowDown", { shiftKey: true });
    expect(model.getters.getCurrentContent()).toBe("=A2:A3");
    await keydown("ArrowRight", { shiftKey: true });
    expect(model.getters.getCurrentContent()).toBe("=A2:B3");
    await keydown("ArrowUp", { shiftKey: true });
    expect(model.getters.getCurrentContent()).toBe("=A2:B2");
    await keydown("ArrowLeft", { shiftKey: true });
    expect(model.getters.getCurrentContent()).toBe("=A2");
  });

  test("Create a ref with merges with keyboard -> the merge should be treated as one cell", async () => {
    selectCell(model, "B2");
    model.dispatch("ALTER_SELECTION", { delta: [1, 1] });
    merge(model, "B2:C3");
    selectCell(model, "C1");
    await typeInComposer("=");
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=B2");
    expect(getHighlights(model)).toHaveLength(1);
    expect(getHighlights(model)[0].zone).toMatchObject({
      top: 1,
      bottom: 2,
      left: 1,
      right: 2,
    });
    await keydown("ArrowDown");
    expect(model.getters.getCurrentContent()).toBe("=C4");
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
    expect(composerEl.textContent).toBe("=␣");
  });

  test("starting the edition with a key stroke B, the composer should have the focus after the key input", async () => {
    composerEl = await startComposition("b");
    expect(composerEl.textContent).toBe("b");
  });

  test("type '=', backspace and select a cell should not add it", async () => {
    await typeInComposer("=");
    model.dispatch("SET_CURRENT_CONTENT", { content: "" });
    // @ts-ignore
    const cehMock = window.mockContentHelper as ContentEditableHelper;
    cehMock.removeAll();
    composerEl.dispatchEvent(new Event("input"));
    composerEl.dispatchEvent(new Event("beforeinput"));
    composerEl.dispatchEvent(new Event("keyup"));
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    await nextTick();
    expect(getActiveXc(model)).toBe("C8");
    expect(fixture.querySelectorAll(".o-grid div.o-composer")).toHaveLength(0);
  });

  test("type '=' in the sheet and select a cell", async () => {
    composerEl = await startComposition("=");
    expect(composerEl.textContent).toBe("=␣");
    expect(model.getters.getEditionMode()).toBe("selecting");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
  });

  test("type '=', select twice a cell", async () => {
    await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("selecting");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
  });

  test("type '=', select a cell, press enter", async () => {
    await typeInComposer("=");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=C8");
    expect(model.getters.getEditionMode()).toBe("selecting");
    await keydown("Enter");
    expect(model.getters.getEditionMode()).toBe("inactive");
    expect(getCellText(model, "A1")).toBe("=C8");
  });

  test("clicking on the composer while typing text (not formula) does not duplicates text", async () => {
    await typeInComposer("a");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(composerEl.textContent).toBe("a");
  });

  test("typing incorrect formula then enter exits the edit mode and moves to the next cell down", async () => {
    await typeInComposer("=qsdf");
    await keydown("Enter");
    expect(getCellText(model, "A1")).toBe("=qsdf");
    expect(getCell(model, "A1")!.value).toBe("#BAD_EXPR");
  });

  test("typing text then enter exits the edit mode and moves to the next cell down", async () => {
    await startComposition();
    await typeInComposer("qsdf");
    await keydown("Enter");
    expect(getCellContent(model, "A1")).toBe("qsdf");
    expect(getCell(model, "A1")!.value).toBe("qsdf");
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
          await typeInComposer(content);
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(content + "␣");
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          await startComposition();
          await typeInComposer(content);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(content);
        }
      );

      test.each(matchingValues.concat(["("]))(
        "a matching value & spaces --> activate 'selecting' mode",
        async (matchingValue) => {
          const content = formula + matchingValue;
          await startComposition();
          await typeInComposer(content + "   ");
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(content + "   ␣");
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a mismatching value & spaces --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          const content = formula + mismatchingValue;
          await startComposition();
          await typeInComposer(content + "   ");
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(content + "   ");
        }
      );

      test.each(mismatchingValues.concat([")"]))(
        "a UNKNOWN token & a matching value --> not activate 'selecting' mode",
        async (matchingValue) => {
          const content = formula + "'" + matchingValue;
          await startComposition();
          await typeInComposer(content);
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(content);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before matching value --> activate 'selecting' mode",
        async (matchingValue) => {
          await startComposition();
          await typeInComposer(matchingValue);
          await moveToStart();
          await typeInComposer(formula + ",");
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(formula + ",␣" + matchingValue);
        }
      );

      async function moveToStart() {
        model.dispatch("CHANGE_COMPOSER_SELECTION", { start: 0, end: 0 });
        await nextTick();
        model.dispatch("STOP_COMPOSER_SELECTION");
        await nextTick();
      }

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before mismatching value --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          await startComposition();
          await typeInComposer(mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",");
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(formula + "," + mismatchingValue);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & spaces & located before matching value --> activate 'selecting' mode",
        async (matchingValue) => {
          await startComposition();
          await typeInComposer(matchingValue);
          await moveToStart();
          await typeInComposer(formula + ",  ");
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(formula + ",  ␣" + matchingValue);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & spaces & located before mismatching value --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          await startComposition();
          await typeInComposer(mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",  ");
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(formula + ",  " + mismatchingValue);
        }
      );

      test.each(matchingValues.concat([")"]))(
        "a matching value & located before spaces & matching value --> activate 'selecting' mode",
        async (matchingValue) => {
          await startComposition();
          await typeInComposer("   " + matchingValue);
          await moveToStart();
          await typeInComposer(formula + ",");
          expect(model.getters.getEditionMode()).toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(formula + ",␣   " + matchingValue);
        }
      );

      test.each(mismatchingValues.concat(["("]))(
        "a matching value & located before spaces & mismatching value --> not activate 'selecting' mode",
        async (mismatchingValue) => {
          await startComposition();
          await typeInComposer("   " + mismatchingValue);
          await moveToStart();
          await typeInComposer(formula + ",");
          expect(model.getters.getEditionMode()).not.toBe("selecting");
          expect(model.getters.getCurrentContent()).toBe(formula + ",   " + mismatchingValue);
        }
      );
    });

    test.each([",", "+", "*", ")", "("])(
      "typing a matching values (except '=') --> not activate 'selecting' mode",
      async (value) => {
        await startComposition();
        await typeInComposer(value);
        expect(model.getters.getEditionMode()).not.toBe("selecting");
        expect(model.getters.getCurrentContent()).toBe(value);
      }
    );

    test("typing '='--> activate 'selecting' mode", async () => {
      await startComposition();
      await typeInComposer("=");
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(model.getters.getCurrentContent()).toBe("=␣");
    });

    test("typing '=' & spaces --> activate 'selecting' mode", async () => {
      await startComposition();
      await typeInComposer("=   ");
      expect(model.getters.getEditionMode()).toBe("selecting");
      expect(model.getters.getCurrentContent()).toBe("=   ␣");
    });
  });

  test("type '=', select a cell in another sheet", async () => {
    await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    createSheet(model, { sheetId: "42", name: "Sheet2", activate: true });
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("selecting");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("=Sheet2!C8");
  });

  test("type '=', select a cell in another sheet which contains spaces", async () => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("CREATE_SHEET", { sheetId: "42", name: "Sheet 2", position: 1 });
    setCellContent(model, "C8", "1", "42");
    await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    activateSheet(model, "42");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("='Sheet 2'!C8");
    model.dispatch("STOP_EDITION");
    expect(getCellContent(model, "A1", sheetId)).toBe("1");
  });

  test("Home key sets cursor at the begining", async () => {
    await typeInComposer("Hello");
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
    await nextTick();
    composerEl.dispatchEvent(new KeyboardEvent("keyup", { key: "Home" }));
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({ start: 0, end: 0 });
  });

  test("End key sets cursor at the begining", async () => {
    await typeInComposer("Hello");
    model.dispatch("CHANGE_COMPOSER_SELECTION", { start: 0, end: 0 });
    await nextTick();
    composerEl.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
    await nextTick();
    composerEl.dispatchEvent(new KeyboardEvent("keyup", { key: "End" }));
    await nextTick();
    expect(model.getters.getComposerSelection()).toEqual({ start: 5, end: 5 });
  });

  test("type '=', select a cell in another sheet with space in name", async () => {
    await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    createSheet(model, { sheetId: "42", name: "Sheet 2", activate: true });
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("selecting");
    triggerMouseEvent("canvas", "mousedown", 300, 200);
    window.dispatchEvent(new MouseEvent("mouseup", { clientX: 300, clientY: 200 }));
    await nextTick();
    expect(composerEl.textContent).toBe("='Sheet 2'!C8");
  });

  test("type '=', select a cell in another sheet, select a cell in the active sheet", async () => {
    await typeInComposer("=");
    const sheet = model.getters.getActiveSheetId();
    createSheet(model, { sheetId: "42", name: "Sheet2", activate: true });
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
      await typeInComposer("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.color).toBe("rgb(18, 52, 86)");
    });

    test("with background color", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { fillColor: "#123456" },
      });
      await typeInComposer("Hello");
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
      await typeInComposer("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontSize).toBe("10px");
    });

    test("with font weight", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { bold: true },
      });
      await typeInComposer("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontWeight).toBe("bold");
    });

    test("with font style", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { italic: true },
      });
      await typeInComposer("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontStyle).toBe("italic");
    });

    test("with text decoration", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { strikethrough: true },
      });
      await typeInComposer("Hello");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("line-through");
    });

    test("with text align", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { align: "right" },
      });
      await typeInComposer("Hello");
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
      await typeInComposer("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.color).toBe("rgb(0, 0, 0)");
    });

    test("with background color", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { textColor: "#123456" },
      });
      await typeInComposer("=");
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
      await typeInComposer("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontSize).toBe("13px");
    });

    test("with font weight", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { bold: true },
      });
      await typeInComposer("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontWeight).toBe("500");
    });

    test("with font style", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { italic: true },
      });
      await typeInComposer("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.fontStyle).toBe("normal");
    });

    test("with text decoration", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { strikethrough: true },
      });
      await typeInComposer("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textDecoration).toBe("none");
    });

    test("with text align", async () => {
      model.dispatch("SET_FORMATTING", {
        sheetId: model.getters.getActiveSheetId(),
        target: [toZone("A1")],
        style: { align: "right" },
      });
      await typeInComposer("=");
      const gridComposer = fixture.querySelector(".o-grid-composer")! as HTMLElement;
      expect(gridComposer.style.textAlign).toBe("left");
    });
  });

  test("clicking on the composer while in 'selecting' mode should put the composer in 'edition' mode", async () => {
    await typeInComposer("=");
    expect(model.getters.getEditionMode()).toBe("selecting");
    composerEl.dispatchEvent(new MouseEvent("click"));
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("editing");
  });

  test("The composer should be closed before opening the context menu", async () => {
    await typeInComposer("=");
    triggerMouseEvent("canvas", "contextmenu", 300, 200);
    await nextTick();
    expect(model.getters.getEditionMode()).toBe("inactive");
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

  test("highlight do not duplicate", async () => {
    setCellContent(model, "A1", "=a1+a1");
    await startComposition();
    expect(getHighlights(model).length).toBe(1);
    expect(getHighlights(model)[0].color).toBe(colors[0]);
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

  test.each(["=ZZ1", "=A101"])("Do not highlight invalid ref", async (ref) => {
    setCellContent(model, "A1", ref);
    composerEl = await startComposition();
    expect(getHighlights(model).length).toBe(0);
    expect(composerEl.textContent).toBe(ref);
  });

  test("highlight cross-sheet ranges", async () => {
    createSheet(model, { sheetId: "42", name: "Sheet2" });
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
