import { Model } from "../../src";
import { ErrorToolTip } from "../../src/components/error_tooltip/error_tooltip";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import {
  addDataValidation,
  createChart,
  createSheet,
  merge,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../test_helpers/constants";
import {
  click,
  clickCell,
  gridMouseEvent,
  hoverCell,
  triggerMouseEvent,
  triggerWheelEvent,
} from "../test_helpers/dom_helper";
import {
  makeTestComposerStore,
  mockChart,
  mountComponent,
  mountSpreadsheet,
  nextTick,
  toCellPosition,
} from "../test_helpers/helpers";

mockChart();

describe("Error tooltip component", () => {
  let fixture: HTMLElement;

  async function mountErrorTooltip(model: Model, xc: string) {
    ({ fixture } = await mountComponent(ErrorToolTip, {
      props: {
        cellPosition: toCellPosition(model.getters.getActiveSheetId(), xc),
      },
      model,
    }));
  }

  test("Can display a data validation error message", async () => {
    const model = new Model();
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] });
    setCellContent(model, "A1", "hello");
    await mountErrorTooltip(model, "A1");
    expect(".o-error-tooltip-title").toHaveText("Invalid");
    expect(".o-error-tooltip-message").toHaveText('The value must be a text that contains "hi"');
  });

  test("Can display multiple error messages", async () => {
    const model = new Model();
    addDataValidation(model, "A2", "id", { type: "textContains", values: ["hi"] });
    setCellContent(model, "A1", "=1/0");
    setCellContent(model, "A2", "=A1");
    await mountErrorTooltip(model, "A2");
    const titles = fixture.querySelectorAll(".o-error-tooltip-title");
    const messages = fixture.querySelectorAll(".o-error-tooltip-message");
    expect(titles).toHaveLength(2);
    expect(messages).toHaveLength(2);

    expect(titles[0].textContent).toBe("Error");
    expect(messages[0].textContent).toBe("The divisor must be different from zero. Caused by A1");

    expect(titles[1].textContent).toBe("Invalid");
    expect(messages[1].textContent).toBe('The value must be a text that contains "hi"');
  });

  test("can display error origin position", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=1/0");
    setCellContent(model, "A2", "=A1");
    await mountErrorTooltip(model, "A2");
    expect(".fst-italic").toHaveText(" Caused by A1");
  });

  test("can display error position from another sheet", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "A1", "=1/0", "sheet2");
    setCellContent(model, "A2", "=Sheet2!A1");
    await mountErrorTooltip(model, "A2");
    expect(".fst-italic").toHaveText(" Caused by Sheet2!A1");
  });

  test("clicking on error position selects the position", async () => {
    const model = new Model();
    createSheet(model, { sheetId: "sheet2" });
    setCellContent(model, "J10", "=1/0", "sheet2");
    setCellContent(model, "A2", "=Sheet2!J10");
    await mountErrorTooltip(model, "A2");
    click(fixture, ".o-button-link");
    expect(model.getters.getActivePosition()).toEqual(toCellPosition("sheet2", "J10"));
  });

  test("does not display error origin position if it is the same cell", async () => {
    const model = new Model();
    setCellContent(model, "A1", "=1/0");
    await mountErrorTooltip(model, "A1");
    expect(".fst-italic").toHaveCount(0);
  });
});

describe("Grid integration", () => {
  let model: Model;
  let fixture: HTMLElement;

  beforeEach(async () => {
    jest.useFakeTimers();
    ({ model, fixture } = await mountSpreadsheet());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("can display error on A1", async () => {
    setCellContent(model, "A1", "=1/0");
    await hoverCell(model, "A1", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("can display invalid data validation error", async () => {
    setCellContent(model, "A1", "hello");
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["hi"] });
    await hoverCell(model, "A1", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("can display both cell error and data validation error", async () => {
    setCellContent(model, "A1", "=1/0");
    addDataValidation(model, "A1", "id", { type: "textContains", values: ["1"] });
    await hoverCell(model, "A1", 400);
    expect(document.querySelectorAll(".o-error-tooltip-title")).toHaveLength(2);
  });

  test("don't display error on #N/A", async () => {
    Date.now = jest.fn(() => 0);
    setCellContent(model, "A1", "=NA()");
    await nextTick();
    gridMouseEvent(model, "pointermove", "A1");
    Date.now = jest.fn(() => 500);
    jest.advanceTimersByTime(300);
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("Display error on #N/A 'non-silent' ", async () => {
    Date.now = jest.fn(() => 0);
    setCellContent(model, "A1", "=VLOOKUP(6,A1:A2,B2:B4)");
    await nextTick();
    gridMouseEvent(model, "pointermove", "A1");
    Date.now = jest.fn(() => 500);
    jest.advanceTimersByTime(300);
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("can display error tooltip", async () => {
    setCellContent(model, "C8", "=1/0");
    await hoverCell(model, "C8", 200);
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
    await hoverCell(model, "C8", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
    expect(document.querySelector(".o-error-tooltip")?.parentElement).toMatchSnapshot();
    await hoverCell(model, "C7", 200);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
    await hoverCell(model, "C7", 400);
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("can display error when move on merge", async () => {
    merge(model, "C1:C8");
    setCellContent(model, "C1", "=1/0");
    await hoverCell(model, "C8", 400);
    expect(document.querySelector(".o-error-tooltip")).not.toBeNull();
  });

  test("Hovering over a figure should not open popovers", async () => {
    createChart(model, { ...TEST_CHART_DATA.basicChart }, "figureId");
    model.dispatch("UPDATE_FIGURE", {
      id: "figureId",
      y: 200,
      x: 200,
      width: 200,
      height: 200,
      sheetId: model.getters.getActiveSheetId(),
    });
    await nextTick();
    setCellContent(model, "C3", "[label](url.com)");

    triggerMouseEvent(".o-figure", "pointermove", DEFAULT_CELL_WIDTH * 2, DEFAULT_CELL_HEIGHT * 2);
    jest.advanceTimersByTime(400);
    await nextTick();

    expect(fixture.querySelector(".o-popover")).toBeNull();
  });

  test("composer content is set when clicking on merged cell (not top left)", async () => {
    const composerStore = makeTestComposerStore(model);
    merge(model, "C1:C8");
    setCellContent(model, "C1", "Hello");
    await nextTick();
    await clickCell(model, "C8");
    expect(composerStore.currentContent).toBe("Hello");
  });

  test("Wheel events on error tooltip are scrolling the grid", async () => {
    setCellContent(model, "C1", "=0/0");
    await hoverCell(model, "C1", 400);
    triggerWheelEvent(".o-error-tooltip", { deltaY: 300, deltaX: 300 });
    await nextTick();
    expect(fixture.querySelector(".o-scrollbar.vertical")?.scrollTop).toBe(300);
    expect(fixture.querySelector(".o-scrollbar.horizontal")?.scrollLeft).toBe(300);
  });
});
