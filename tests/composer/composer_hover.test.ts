import { CellComposerStore } from "../../src/components/composer/composer/cell_composer_store";
import { Model } from "../../src/model";
import { Store } from "../../src/store_engine";
import { setCellContent, updateLocale } from "../test_helpers/commands_helpers";
import { FR_LOCALE } from "../test_helpers/constants";
import { getElStyle, triggerMouseEvent } from "../test_helpers/dom_helper";
import { getEvaluatedCell } from "../test_helpers/getters_helpers";
import {
  ComposerWrapper,
  mountComposerWrapper,
  nextTick,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let model: Model;
let fixture: HTMLElement;
let parent: ComposerWrapper;
let composerStore: Store<CellComposerStore>;

async function typeInComposer(text: string, fromScratch: boolean = true) {
  if (fromScratch) {
    parent.startComposition();
  }
  const composerEl = await typeInComposerHelper("div.o-composer", text, false);
  return composerEl;
}

async function hoverComposerContent(content: string) {
  const spans = fixture.querySelectorAll(".o-composer span");
  const hoveredSpan = Array.from(spans).find((s) => s.textContent === content);
  if (!hoveredSpan) {
    throw new Error(`Span with text ${content} not found`);
  }
  triggerMouseEvent(hoveredSpan, "mouseenter");
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

beforeEach(async () => {
  ({ model, parent, fixture } = await mountComposerWrapper());
  composerStore = parent.env.getStore(CellComposerStore);
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Composer hover", () => {
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
    expect(getHighlightedContent()).toEqual("SUM(A1+2) * 8");
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

    await hoverComposerContent(" ");
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
    expect(getHighlightedContent()).toEqual("SUM(5 * 5 + 6) - 12 / SUM(6)");
    expect(".o-speech-bubble").toHaveText("29");

    await hoverComposerContent("/");
    expect(getHighlightedContent()).toEqual("12 / SUM(6)");
    expect(".o-speech-bubble").toHaveText("2");
  });

  test("Speech bubble numbers are default formatted (remove too many decimals)", async () => {
    setCellContent(model, "B1", "1.1000000001");
    expect(getEvaluatedCell(model, "B1").formattedValue).toEqual("1.1");

    await typeInComposer("=B1");
    await hoverComposerContent("=");
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

  test("Hovering an unfinished formula add the missing parenthesis before evaluating", async () => {
    await typeInComposer("=MINUS(8,7)+SUM(5");
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveText("6");

    await hoverComposerContent("MINUS");
    expect(".o-speech-bubble").toHaveText("1");
  });

  test("Hovering elements do nothing if the selection start and end are different", async () => {
    await typeInComposer("=12");
    composerStore.changeComposerCursorSelection(0, 2);
    await nextTick();
    await hoverComposerContent("=");
    expect(".o-speech-bubble").toHaveCount(0);
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
    expect(getElStyle(".o-speech-bubble", "left")).toEqual(10 + 20 / 2 - 100 / 2 + "px");
    // top above the hovered token + BUBBLE_ARROW_SIZE (7px)
    expect(getElStyle(".o-speech-bubble", "top")).toEqual(10 - 50 - 7 + "px");
  });
});
