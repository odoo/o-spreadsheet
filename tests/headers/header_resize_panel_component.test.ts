import { Model } from "../../src";
import { HeaderResizePanel } from "../../src/components/side_panel/header_resize_panel/header_resize_panel";
import { SidePanels } from "../../src/components/side_panel/side_panels/side_panels";
import { DEFAULT_CELL_WIDTH, MIN_COL_WIDTH } from "../../src/constants";
import { UID } from "../../src/types/misc";
import { PropsOf } from "../../src/types/props_of";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
import {
  click,
  focusAndKeyDown,
  selectCell,
  selectColumn,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers";
import {
  mountComponentWithPortalTarget,
  nextTick,
  spyModelDispatch,
} from "../test_helpers/helpers";

const SELECTORS = {
  panel: ".o-header-resize-panel",
  applyButton: ".o-header-resize-panel .o-sidePanelButtons .o-button.primary",
  sizeInput: ".o-header-resize-panel input[type='number']",
  exactSizeRadio: ".o-header-resize-panel input[value='exactSize']",
  fitToDataRadio: ".o-header-resize-panel input[value='fitToData']",
};

describe("header resize side panel component", () => {
  let model: Model;
  let fixture: HTMLElement;
  let sheetId: UID;
  let dispatch: jest.SpyInstance;
  let onCloseSidePanel: jest.Mock;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    onCloseSidePanel = jest.fn();
  });

  async function mountHeaderResizePanel(props: Partial<PropsOf<HeaderResizePanel>> = {}) {
    ({ fixture } = await mountComponentWithPortalTarget(HeaderResizePanel, {
      model,
      props: {
        sheetId,
        dimension: "COL",
        elements: [1],
        onCloseSidePanel,
        ...props,
      },
    }));
    dispatch = spyModelDispatch(model);
  }

  test("Apply exact size resizes selected columns", async () => {
    await mountHeaderResizePanel({ dimension: "COL", elements: [1, 2] });
    await setInputValueAndTrigger(SELECTORS.sizeInput, "147");
    await click(fixture, SELECTORS.applyButton);
    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: [1, 2],
      size: 147,
    });
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Apply exact size resizes selected rows", async () => {
    await mountHeaderResizePanel({ dimension: "ROW", elements: [2, 3] });
    await setInputValueAndTrigger(SELECTORS.sizeInput, "42");
    await click(fixture, SELECTORS.applyButton);
    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "ROW",
      elements: [2, 3],
      size: 42,
    });
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Apply fit to data autoresizes selected columns", async () => {
    await mountHeaderResizePanel({ dimension: "COL", elements: [1, 2] });
    await simulateClick(SELECTORS.fitToDataRadio);
    await click(fixture, SELECTORS.applyButton);
    expect(dispatch).toHaveBeenCalledWith("AUTORESIZE_COLUMNS", {
      sheetId,
      cols: [1, 2],
    });
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Apply fit to data autoresizes selected rows", async () => {
    await mountHeaderResizePanel({ dimension: "ROW", elements: [2, 3] });
    await simulateClick(SELECTORS.fitToDataRadio);
    await click(fixture, SELECTORS.applyButton);
    expect(dispatch).toHaveBeenCalledWith("AUTORESIZE_ROWS", {
      sheetId,
      rows: [2, 3],
    });
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Leaving empty size input displays the default size", async () => {
    await mountHeaderResizePanel({ dimension: "COL", elements: [1, 2] });
    await simulateClick(SELECTORS.sizeInput);
    await setInputValueAndTrigger(SELECTORS.sizeInput, "");
    await simulateClick(SELECTORS.fitToDataRadio);

    expect(SELECTORS.sizeInput).toHaveValue(DEFAULT_CELL_WIDTH.toString());
    expect(".o-validation-error").toHaveCount(0);
    expect(dispatch).not.toHaveBeenCalled();
    expect(onCloseSidePanel).not.toHaveBeenCalled();
  });

  test.each([
    ["", "Size is required."],
    ["10.5", "Size must be an integer."],
    [(MIN_COL_WIDTH - 1).toString(), `Size must be at least ${MIN_COL_WIDTH} pixels.`],
  ])("Invalid exact size %s does not resize", async (value, message) => {
    await mountHeaderResizePanel({ dimension: "COL", elements: [1] });
    await simulateClick(SELECTORS.sizeInput);
    await setInputValueAndTrigger(SELECTORS.sizeInput, value);
    await simulateClick(SELECTORS.applyButton);

    expect(".o-validation-error").toHaveCount(1);
    expect(".o-validation-error").toHaveText(message);
    expect(SELECTORS.applyButton).toHaveClass("o-disabled");
    expect(dispatch).not.toHaveBeenCalled();
    expect(onCloseSidePanel).not.toHaveBeenCalled();
  });

  test("Pressing Enter validates exact size", async () => {
    await mountHeaderResizePanel({ dimension: "COL", elements: [1, 2] });
    await setInputValueAndTrigger(SELECTORS.sizeInput, "10.5");
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Enter" });

    expect(".o-validation-error").toHaveCount(1);
    expect(".o-validation-error").toHaveText("Size must be an integer.");
    expect(SELECTORS.applyButton).toHaveClass("o-disabled");
    expect(dispatch).not.toHaveBeenCalled();
    expect(onCloseSidePanel).not.toHaveBeenCalled();

    await setInputValueAndTrigger(SELECTORS.sizeInput, "147");
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Enter" });

    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: [1, 2],
      size: 147,
    });
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Focusing the size input selects exact size mode", async () => {
    await mountHeaderResizePanel();
    await simulateClick(SELECTORS.fitToDataRadio);
    expect(SELECTORS.fitToDataRadio).toHaveValue(true);
    await simulateClick(SELECTORS.sizeInput);
    expect(SELECTORS.exactSizeRadio).toHaveValue(true);
  });
});

describe("header resize side panel integration", () => {
  let model: Model;
  let env: SpreadsheetChildEnv;

  beforeEach(() => {
    model = new Model();
  });

  async function mountSidePanels() {
    ({ env } = await mountComponentWithPortalTarget(SidePanels, { model }));
  }

  test("Panel title and resize target follow the selected columns", async () => {
    await mountSidePanels();
    selectColumn(model, 1, "overrideSelection");
    selectColumn(model, 2, "updateAnchor");

    env.openSidePanel("HeaderResizePanel", { dimension: "COL" });
    await nextTick();
    expect(".o-sidePanelTitle").toHaveText("Resize columns B - C");

    selectColumn(model, 3, "overrideSelection");
    await nextTick();
    expect(".o-sidePanelTitle").toHaveText("Resize column D");
  });

  test("Panel closes when the selection has no headers for its dimension", async () => {
    await mountSidePanels();
    selectColumn(model, 1, "overrideSelection");

    env.openSidePanel("HeaderResizePanel", { dimension: "COL" });
    await nextTick();
    expect(".o-sidePanel").toHaveCount(1);

    selectCell(model, "A1");
    await nextTick();
    expect(".o-sidePanel").toHaveCount(0);
  });
});
