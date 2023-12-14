import { Model } from "../../src";
import {
  ErrorToolTip,
  ErrorToolTipMessage,
} from "../../src/components/error_tooltip/error_tooltip";
import { DEFAULT_CELL_HEIGHT, DEFAULT_CELL_WIDTH } from "../../src/constants";
import {
  addDataValidation,
  createChart,
  merge,
  setCellContent,
} from "../test_helpers/commands_helpers";
import { TEST_CHART_DATA } from "../test_helpers/constants";
import {
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
} from "../test_helpers/helpers";

mockChart();

describe("Error tooltip component", () => {
  let fixture: HTMLElement;

  async function mountErrorTooltip(errors: ErrorToolTipMessage[]) {
    ({ fixture } = await mountComponent(ErrorToolTip, { props: { errors } }));
  }

  test("Can display an error message", async () => {
    await mountErrorTooltip([{ message: "This is an error", title: "Error" }]);
    expect(fixture.querySelector(".o-error-tooltip-title")?.textContent).toBe("Error");
    expect(fixture.querySelector(".o-error-tooltip-message")?.textContent).toBe("This is an error");
  });

  test("Can display multiple error messages", async () => {
    await mountErrorTooltip([
      { message: "This is an error", title: "Error" },
      { message: "Invalid data", title: "Invalid" },
    ]);
    const titles = fixture.querySelectorAll(".o-error-tooltip-title");
    const messages = fixture.querySelectorAll(".o-error-tooltip-message");
    expect(titles).toHaveLength(2);
    expect(messages).toHaveLength(2);

    expect(titles[0].textContent).toBe("Error");
    expect(messages[0].textContent).toBe("This is an error");

    expect(titles[1].textContent).toBe("Invalid");
    expect(messages[1].textContent).toBe("Invalid data");
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
    gridMouseEvent(model, "mousemove", "A1");
    Date.now = jest.fn(() => 500);
    jest.advanceTimersByTime(300);
    await nextTick();
    expect(document.querySelector(".o-error-tooltip")).toBeNull();
  });

  test("Display error on #N/A 'non-silent' ", async () => {
    Date.now = jest.fn(() => 0);
    setCellContent(model, "A1", "=VLOOKUP(6,A1:A2,B2:B4)");
    await nextTick();
    gridMouseEvent(model, "mousemove", "A1");
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

    triggerMouseEvent(".o-figure", "mousemove", DEFAULT_CELL_WIDTH * 2, DEFAULT_CELL_HEIGHT * 2);
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
