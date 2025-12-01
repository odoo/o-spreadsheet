import { Model } from "@odoo/o-spreadsheet-engine/model";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { Store } from "../../src/store_engine";
import { setCellContent, setFormat, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { getElStyle, keyDown, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import {
  ComposerWrapper,
  mountComposerWrapper,
  mountSpreadsheet,
  nextTick,
  typeInComposerGrid,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let composerStore: Store<CellComposerStore>;
let env: SpreadsheetChildEnv;

export async function hoverComposerContent(content: string) {
  const spans = fixture.querySelectorAll(".o-composer span");
  const matchingSpans = Array.from(spans).filter((s) => s.textContent === content);
  const hoveredSpan = matchingSpans[0];
  if (!hoveredSpan) {
    throw new Error(`Span with text ${content} not found`);
  }
  triggerMouseEvent(hoveredSpan, "mousemove");
  jest.runAllTimers();
  await nextTick();
}

async function stopHoverComposerContent(content: string) {
  const composerEl = fixture.querySelector(".o-composer")!;
  const spans = composerEl.querySelectorAll("span");
  const hoveredSpan = Array.from(spans).find((s) => s.textContent === content);
  if (!hoveredSpan) {
    throw new Error(`Span with text ${content} not found`);
  }
  triggerMouseEvent(hoveredSpan, "mouseleave");
  jest.runAllTimers();
  await nextTick();
}

function getHighlightedContent() {
  const composerEl = fixture.querySelector(".o-composer")!;
  const spans = composerEl.querySelectorAll("span");
  return Array.from(spans)
    .filter((s) => s.classList.contains("highlight-flag"))
    .map((s) => s.textContent)
    .join("");
}

describe("Composer hover", () => {
  let parent: ComposerWrapper;

  beforeEach(async () => {
    ({ model, parent, fixture, env } = await mountComposerWrapper());
    jest.useFakeTimers();
    composerStore = parent.env.getStore(CellComposerStore);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function typeInComposer(text: string, fromScratch: boolean = true) {
    if (fromScratch) {
      parent.startComposition();
    }
    const composerEl = await typeInComposerHelper("div.o-composer", text, false);
    return composerEl;
  }

  test("Hovering a composer token will spawn a speech bubble with the evaluation result", async () => {
    setCellContent(model, "B1", "56");
    await typeInComposer("=B1");
    await hoverComposerContent("=");
    expect(composerStore.hoveredContentEvaluation).toEqual("56");
    expect(".o-speech-bubble").toHaveText("56");
  });

  test("Speech bubble disappear when stopping the hover", async () => {
    await typeInComposer("=12");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("12");

    await stopHoverComposerContent("=");
    expect(".o-speech-bubble").toHaveCount(0);
  });

  test("Hovered content is highlighted", async () => {
    await typeInComposer("=SUM(A1+2) * 8");
    await hoverComposerContent("SUM");
    expect(getHighlightedContent()).toEqual("SUM(A1+2)");

    await stopHoverComposerContent("SUM");
    expect(getHighlightedContent()).toEqual("");

    await hoverComposerContent("*");
    expect(getHighlightedContent()).toEqual("=SUM(A1+2) * 8");
  });

  test("Hovering a space or a argument separator does nothing", async () => {
    await typeInComposer("=SUM(8, 2)");
    await hoverComposerContent(" ");
    expect(".o-speech-bubble").toHaveCount(0);

    await hoverComposerContent(",");
    expect(".o-speech-bubble").toHaveCount(0);
  });

  test("Can hover primitive types", async () => {
    await typeInComposer('=CONCAT(1, "hello", TRue)');

    await hoverComposerContent("1");
    expect(".o-speech-bubble").toHaveText("1");

    await hoverComposerContent('"hello"');
    expect(".o-speech-bubble").toHaveText('"hello"');

    await hoverComposerContent("TRue");
    expect(".o-speech-bubble").toHaveText("TRUE");
  });

  test("Can hover an error", async () => {
    setCellContent(model, "B1", "=SUM(");
    await typeInComposer("=B1 + DIVIDE(1, 0)");

    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("#BAD_EXPR");

    await hoverComposerContent("B1");
    expect(".o-speech-bubble").toHaveText("#BAD_EXPR");

    await hoverComposerContent("DIVIDE");
    expect(".o-speech-bubble").toHaveText("#DIV/0!");
  });

  test("Can hover a reference", async () => {
    setCellContent(model, "B1", "128");
    await typeInComposer("=B1");
    await hoverComposerContent("B1");

    expect(".o-speech-bubble").toHaveText("128");
  });

  test("Can hover a range", async () => {
    setCellContent(model, "B1", "128");
    setCellContent(model, "C2", "256");

    await typeInComposer("=SUM(B1:C2)");
    await hoverComposerContent("B1:C2");

    expect(".o-speech-bubble").toHaveText("{128,0;0,256}");
  });

  test("Can hover any token to get an evaluation result", async () => {
    setCellContent(model, "B1", "10");
    await typeInComposer("=SUM(B1 + B1)");

    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("20");

    await hoverComposerContent("SUM");
    expect(".o-speech-bubble").toHaveText("20");

    await hoverComposerContent("(");
    expect(".o-speech-bubble").toHaveText("20");

    await hoverComposerContent("B1");
    expect(".o-speech-bubble").toHaveText("10");

    await hoverComposerContent("+");
    expect(".o-speech-bubble").toHaveText("20");

    await hoverComposerContent(")");
    expect(".o-speech-bubble").toHaveText("20");
  });

  test("Hovered tokens take operation priority into account", async () => {
    await typeInComposer("=SUM(5 * 5 + 6) - 12 / SUM(6)");

    await hoverComposerContent("*");
    expect(getHighlightedContent()).toEqual("5 * 5");
    expect(".o-speech-bubble").toHaveText("25");

    await hoverComposerContent("+");
    expect(getHighlightedContent()).toEqual("5 * 5 + 6");
    expect(".o-speech-bubble").toHaveText("31");

    await hoverComposerContent("-");
    expect(getHighlightedContent()).toEqual("=SUM(5 * 5 + 6) - 12 / SUM(6)");
    expect(".o-speech-bubble").toHaveText("29");

    await hoverComposerContent("/");
    expect(getHighlightedContent()).toEqual("12 / SUM(6)");
    expect(".o-speech-bubble").toHaveText("2");
  });

  test("Speech bubble content is formatted", async () => {
    setCellContent(model, "B1", "5");
    setFormat(model, "B1", "0.0$");

    setCellContent(model, "C1", "1.1000000001");
    expect(getEvaluatedCell(model, "C1").formattedValue).toEqual("1.1"); // default format

    await typeInComposer("=B1+DATE(2025,1,1)+C1");
    await hoverComposerContent("B1");
    expect(".o-speech-bubble").toHaveText("5.0$");

    await hoverComposerContent("DATE");
    expect(".o-speech-bubble").toHaveText("1/1/2025");

    await hoverComposerContent("C1");
    expect(".o-speech-bubble").toHaveText("1.1");
  });

  test("Can hover localized content", async () => {
    setCellContent(model, "B1", "1.5");
    updateLocale(model, FR_LOCALE);
    await typeInComposer("=B1 + SUM(1,5;12)");

    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("15");

    await hoverComposerContent("B1");
    expect(".o-speech-bubble").toHaveText("1,5");

    await hoverComposerContent("SUM");
    expect(".o-speech-bubble").toHaveText("13,5");

    await hoverComposerContent("1,5");
    expect(".o-speech-bubble").toHaveText("1,5");
  });

  test("Can hover formula starting with +", async () => {
    await typeInComposer("+9 - SUM(1,3)");
    await hoverComposerContent("+");
    expect(".o-speech-bubble").toHaveText("5");
  });

  test("Hovering an unfinished formula add the missing parenthesis before evaluating", async () => {
    await typeInComposer("=MINUS(8,7)+SUM(5");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("6");

    await hoverComposerContent("MINUS");
    expect(".o-speech-bubble").toHaveText("1");
  });

  test("Hovering an unfinished formula add the missing braces before evaluating", async () => {
    await typeInComposer("={1,2,3");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("{1,2,3}");
  });

  test("Hovering an unfinished formula add the missing parenthesis then braces before evaluating", async () => {
    await typeInComposer("={1,2,SUM(3,4");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("{1,2,7}");
    await hoverComposerContent("SUM");
    expect(".o-speech-bubble").toHaveText("7");
  });

  test("Hovering an unfinished formula add the missing braces then parenthesis before evaluating", async () => {
    await typeInComposer("=SUM(1,2,{3,4");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("10");
    await hoverComposerContent("{");
    expect(".o-speech-bubble").toHaveText("{3,4}");
  });

  test("Hovering elements do nothing if the selection start and end are different", async () => {
    await typeInComposer("=12");
    composerStore.changeComposerCursorSelection(0, 2);
    await nextTick();
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveCount(0);
  });

  test("Hovering a composer token does not scroll composer to cursor", async () => {
    const mockScrollIntoView = jest.fn();
    await typeInComposer("=SUM(1,\n2,\n3,\n4,\n5,\n6,\n7,\n8,\n9,\n10)");
    HTMLElement.prototype.scrollIntoView = mockScrollIntoView;

    await hoverComposerContent("SUM");
    expect(mockScrollIntoView).not.toHaveBeenCalled();
  });

  test("Bubble disappear when selecting a text with the mouse", async () => {
    await typeInComposer("=12");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("12");

    const spans = fixture.querySelectorAll(".o-composer span");
    triggerMouseEvent(spans[0], "pointerdown");
    const selection = document.getSelection()!;
    const range = document.createRange();
    range.setStart(spans[0].childNodes[0], 0);
    range.setEnd(spans[1].childNodes[0], 1);
    selection.addRange(range);
    triggerMouseEvent(spans[1], "pointerup");
    await nextTick();

    expect(".o-speech-bubble").toHaveCount(0);
  });

  test("Speech bubble is positioned in the middle of the hovered token", async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains("o-spreadsheet")) {
          return { left: 66, top: 66, width: 555, height: 555 } as DOMRect;
        }
        if (this.classList.contains("o-speech-bubble")) {
          return { x: 0, y: 0, width: 100, height: 50 } as DOMRect;
        } else if (this.textContent === "=") {
          return { x: 10, y: 10, width: 20, height: 20 } as DOMRect;
        }
        return originalGetBoundingClientRect.call(this);
      });

    await typeInComposer("=50");
    await hoverComposerContent("=");

    // center of bubble at the center of the hovered token
    expect(getElStyle(".o-speech-bubble", "left")).toEqual(10 + 20 / 2 - 100 / 2 - 66 + "px");
    // top above the hovered token + BUBBLE_ARROW_SIZE (7px)
    expect(getElStyle(".o-speech-bubble", "top")).toEqual(10 - 50 - 7 - 66 + "px");
    jest.restoreAllMocks();
  });

  test("Speech bubble do not move if hovering another token within the same evaluation context", async () => {
    const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
    jest
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains("o-spreadsheet")) {
          return { left: 0, top: 0, width: 555, height: 555 } as DOMRect;
        } else if (this.classList.contains("o-speech-bubble")) {
          return { x: 0, y: 0, width: 100, height: 50 } as DOMRect;
        } else if (this.textContent === "SUM") {
          return { x: 10, y: 10, width: 20, height: 20 } as DOMRect;
        } else if (this.textContent === "(") {
          return { x: 20, y: 10, width: 20, height: 20 } as DOMRect;
        }
        return originalGetBoundingClientRect.call(this);
      });

    await typeInComposer("=SUM(A1)");

    await hoverComposerContent("SUM");
    expect(getElStyle(".o-speech-bubble", "left")).toEqual("-30px");

    await hoverComposerContent("(");
    expect(getElStyle(".o-speech-bubble", "left")).toEqual("-30px");
    jest.restoreAllMocks();
  });
});

describe("Composer hover integration test", () => {
  beforeEach(async () => {
    ({ model, fixture, env } = await mountSpreadsheet());
    composerStore = env.getStore(CellComposerStore);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Speech bubble disappear when opening another grid composer", async () => {
    await typeInComposerGrid("=12");
    await hoverComposerContent("=");
    expect(".o-grid-composer .o-composer.active").toHaveCount(1);
    expect(".o-speech-bubble").toHaveText("12");

    await keyDown({ key: "Enter" });
    expect(".o-grid-composer .o-composer.active").toHaveCount(0);
    expect(".o-speech-bubble").toHaveCount(0);

    await keyDown({ key: "Enter" });
    expect(".o-grid-composer .o-composer.active").toHaveCount(1);
    expect(".o-speech-bubble").toHaveCount(0);
  });
});
