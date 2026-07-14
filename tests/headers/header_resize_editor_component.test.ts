import { Model } from "../../src";
import { HeaderResizeEditor } from "../../src/components/header_resize_editor/header_resize_editor";
import {
  DEFAULT_CELL_WIDTH,
  HEADER_HEIGHT,
  HEADER_WIDTH,
  MAX_HEADER_SIZE,
  MIN_COL_WIDTH,
} from "../../src/constants";
import { UID } from "../../src/types/misc";
import { PropsOf } from "../../src/types/props_of";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
import {
  resizeColumns,
  resizeRows,
  selectColumn,
  selectRow,
} from "../test_helpers/commands_helpers";
import {
  focusAndKeyDown,
  rightClickCell,
  setInputValueAndTrigger,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers/dom_helper";
import {
  mountComponentWithPortalTarget,
  mountSpreadsheet,
  nextTick,
  spyModelDispatch,
} from "../test_helpers/helpers";

const SELECTORS = {
  applyButton: ".o-popover .o-button.primary",
  error: ".o-validation-error",
  sizeInput: ".o-popover input[type='number']",
};

describe("Header resize editor", () => {
  let model: Model;
  let fixture: HTMLElement;
  let sheetId: UID;
  let dispatch: jest.SpyInstance;
  let onClose: jest.Mock;

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
    onClose = jest.fn();
  });

  async function mountHeaderResizeEditor(
    props: Partial<PropsOf<HeaderResizeEditor>> = {}
  ): Promise<void> {
    ({ fixture } = await mountComponentWithPortalTarget(HeaderResizeEditor, {
      model,
      props: {
        dimension: props.dimension ?? "COL",
        anchorIndex: props.anchorIndex ?? 0,
        anchorRect: props.anchorRect ?? { x: 0, y: 0, width: 0, height: 0 },
        onClose: props.onClose ?? onClose,
      },
    }));
    dispatch = spyModelDispatch(model);
  }

  test("Set a custom width for a selected column", async () => {
    resizeColumns(model, ["A"], 123);
    selectColumn(model, 0, "overrideSelection");
    await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 0 });

    const input = fixture.querySelector<HTMLInputElement>(SELECTORS.sizeInput)!;
    expect(input.value).toBe("123");

    await setInputValueAndTrigger(input, "147");
    await simulateClick(SELECTORS.applyButton);

    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: [0],
      size: 147,
    });
    expect(onClose).toHaveBeenCalled();
  });

  test("Set a custom height for a selected row", async () => {
    resizeRows(model, [1], 33);
    selectRow(model, 1, "overrideSelection");
    await mountHeaderResizeEditor({ dimension: "ROW", anchorIndex: 1 });

    const input = fixture.querySelector<HTMLInputElement>(SELECTORS.sizeInput)!;
    expect(input.value).toBe("33");

    await setInputValueAndTrigger(input, "42");
    await simulateClick(SELECTORS.applyButton);

    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "ROW",
      elements: [1],
      size: 42,
    });
    expect(onClose).toHaveBeenCalled();
  });

  test("Applying an empty input restores the default size", async () => {
    resizeColumns(model, ["B"], 147);
    selectColumn(model, 1, "overrideSelection");
    await mountHeaderResizeEditor();

    await setInputValueAndTrigger(SELECTORS.sizeInput, "");
    await simulateClick(SELECTORS.applyButton);

    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: [1],
      size: null,
    });
    expect(model.getters.getColSize(sheetId, 1)).toBe(DEFAULT_CELL_WIDTH);
    expect(onClose).toHaveBeenCalled();
  });

  test("Invalid number input does not reset the size", async () => {
    resizeColumns(model, ["B"], 147);
    selectColumn(model, 1, "overrideSelection");
    await mountHeaderResizeEditor();
    const input = fixture.querySelector<HTMLInputElement>(SELECTORS.sizeInput)!;
    await setInputValueAndTrigger(input, "");
    Object.defineProperty(input.validity, "badInput", { value: true });
    await simulateClick(SELECTORS.applyButton);
    expect(SELECTORS.error).toHaveText("Size must be an integer");
    expect(model.getters.getColSize(sheetId, 1)).toBe(147);
  });

  test.each([MIN_COL_WIDTH - 1, MAX_HEADER_SIZE + 1])(
    "Size %s outside the allowed range is not applied",
    async (size) => {
      selectColumn(model, 1, "overrideSelection");
      await mountHeaderResizeEditor();
      await setInputValueAndTrigger(SELECTORS.sizeInput, size.toString());
      await simulateClick(SELECTORS.applyButton);
      expect(SELECTORS.error).toHaveText(
        `Size must be between ${MIN_COL_WIDTH} and ${MAX_HEADER_SIZE} pixels`
      );
      expect(dispatch).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  test("Enter validates and applies the size", async () => {
    selectColumn(model, 1, "overrideSelection");
    await mountHeaderResizeEditor();

    await setInputValueAndTrigger(SELECTORS.sizeInput, "10.5");
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Enter" });
    expect(SELECTORS.error).toHaveText("Size must be an integer");
    expect(dispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await setInputValueAndTrigger(SELECTORS.sizeInput, "147");
    expect(SELECTORS.error).toHaveCount(0);
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Enter" });

    expect(dispatch).toHaveBeenCalledWith("RESIZE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: [1],
      size: 147,
    });
    expect(onClose).toHaveBeenCalled();
  });

  test("Escape closes the editor without resizing", async () => {
    selectColumn(model, 1, "overrideSelection");
    await mountHeaderResizeEditor();
    await setInputValueAndTrigger(SELECTORS.sizeInput, "147");
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Escape" });
    expect(dispatch).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("Clicking outside closes the editor", async () => {
    await mountHeaderResizeEditor();
    await simulateClick(".o-spreadsheet");
    expect(onClose).toHaveBeenCalled();
  });
});

describe("Header resize editor integration", () => {
  let fixture: HTMLElement;
  let model: Model;
  let env: SpreadsheetChildEnv;
  let sheetId: UID;

  function getMenuItem(name: string): HTMLElement {
    return [...fixture.querySelectorAll<HTMLElement>(".o-menu-item")].find(
      (element) => element.querySelector(".o-menu-item-name")?.textContent === name
    )!;
  }

  async function openCustomSizeEditor(parentMenuName: string) {
    await simulateClick(getMenuItem(parentMenuName));
    await simulateClick(getMenuItem("Custom size"));
  }

  beforeEach(() => {
    model = new Model();
    sheetId = model.getters.getActiveSheetId();
  });

  test("Custom size editor opens at the clicked column and resizes selected columns", async () => {
    selectColumn(model, 1, "overrideSelection");
    selectColumn(model, 2, "updateAnchor");
    ({ fixture, env } = await mountSpreadsheet({ model }));

    await rightClickCell(env, "C5");
    await openCustomSizeEditor("Resize column");

    expect(".o-popover").toHaveStyle({
      left: `${HEADER_WIDTH + 2 * DEFAULT_CELL_WIDTH}px`,
      top: `${HEADER_HEIGHT}px`,
    });

    await setInputValueAndTrigger(SELECTORS.sizeInput, "147");
    await simulateClick(SELECTORS.applyButton);

    expect(model.getters.getColSize(sheetId, 1)).toBe(147);
    expect(model.getters.getColSize(sheetId, 2)).toBe(147);
    expect(SELECTORS.sizeInput).toHaveCount(0);
  });

  test("Custom size editor opens at the first row and resizes selected rows", async () => {
    selectRow(model, 0, "overrideSelection");
    selectRow(model, 1, "updateAnchor");
    ({ fixture, env } = await mountSpreadsheet({ model }));

    triggerMouseEvent(".o-row-resizer", "contextmenu", 10, 10);
    await nextTick();
    await openCustomSizeEditor("Resize row");

    expect(".o-popover").toHaveStyle({
      left: `${HEADER_WIDTH}px`,
      top: `${HEADER_HEIGHT}px`,
    });

    await setInputValueAndTrigger(SELECTORS.sizeInput, "42");
    await simulateClick(SELECTORS.applyButton);

    expect(model.getters.getRowSize(sheetId, 0)).toBe(42);
    expect(model.getters.getRowSize(sheetId, 1)).toBe(42);
    expect(SELECTORS.sizeInput).toHaveCount(0);
  });
});
