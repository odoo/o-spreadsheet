import { Model } from "../../src";
import { HeaderResizeEditor } from "../../src/components/header_resize_editor/header_resize_editor";
import { DEFAULT_CELL_WIDTH, MAX_HEADER_SIZE, MIN_COL_WIDTH } from "../../src/constants";
import { UID } from "../../src/types/misc";
import { PropsOf } from "../../src/types/props_of";
import {
  resizeColumns,
  resizeRows,
  selectColumn,
  selectRow,
} from "../test_helpers/commands_helpers";
import {
  focusAndKeyDown,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, spyModelDispatch } from "../test_helpers/helpers";

const SELECTORS = {
  applyButton: ".o-popover .o-button.primary",
  error: ".o-validation-error",
  hint: ".o-popover .text-muted",
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

  test("sets a custom width for selected columns", async () => {
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

  test("sets a custom height for selected rows", async () => {
    resizeRows(model, [1], 33);
    selectRow(model, 1, "overrideSelection");
    await mountHeaderResizeEditor({ dimension: "ROW", anchorIndex: 1 });

    const input = fixture.querySelector<HTMLInputElement>(SELECTORS.sizeInput)!;
    expect(input.value).toBe("33");

    await setInputValueAndTrigger(input, "");
    expect(SELECTORS.hint).toHaveText("Empty value fits height to content");
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

  test("applying an empty input restores the default width", async () => {
    resizeColumns(model, ["B"], 147);
    selectColumn(model, 1, "overrideSelection");
    await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 1 });

    await setInputValueAndTrigger(SELECTORS.sizeInput, "");
    expect(SELECTORS.hint).toHaveText(`Empty value resets width to ${DEFAULT_CELL_WIDTH} px`);
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

  test("invalid number input does not reset the size", async () => {
    resizeColumns(model, ["B"], 147);
    selectColumn(model, 1, "overrideSelection");
    await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 1 });
    const input = fixture.querySelector<HTMLInputElement>(SELECTORS.sizeInput)!;
    Object.defineProperty(input.validity, "badInput", { value: true });

    await setInputValueAndTrigger(input, "");
    expect(SELECTORS.hint).toHaveCount(0);
    await simulateClick(SELECTORS.applyButton);

    expect(SELECTORS.error).toHaveText("Size must be an integer");
    expect(model.getters.getColSize(sheetId, 1)).toBe(147);
  });

  test.each([MIN_COL_WIDTH - 1, MAX_HEADER_SIZE + 1])(
    "size %s outside the allowed range is not applied",
    async (size) => {
      await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 1 });
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
    await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 1 });

    await setInputValueAndTrigger(SELECTORS.sizeInput, "10.5");
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Enter" });
    expect(SELECTORS.error).toHaveText("Size must be an integer");
    expect(dispatch).not.toHaveBeenCalled();

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
    await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 1 });
    await focusAndKeyDown(SELECTORS.sizeInput, { key: "Escape" });
    expect(dispatch).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test("clicking outside closes the editor", async () => {
    await mountHeaderResizeEditor({ dimension: "COL", anchorIndex: 1 });
    await simulateClick(".o-spreadsheet");
    expect(onClose).toHaveBeenCalled();
  });
});
