import { EditionMode, Model } from "../../src";
import { ComposerFocusStore } from "../../src/components/composer/composer_focus_store";
import { SplitIntoColumnsPanel } from "../../src/components/side_panel/split_to_columns_panel/split_to_columns_panel";
import { SplitToColumnsStore } from "../../src/components/side_panel/split_to_columns_panel/split_to_columns_store";
import { SpreadsheetChildEnv } from "../../src/types/spreadsheet_env";
import { Store } from "../../src/types/store_engine";
import { getCellContent } from "../test_helpers";
import { setCellContent, setSelection } from "../test_helpers/commands_helpers";
import {
  click,
  editSelectComponent,
  setCheckboxValueAndTrigger,
  setInputValueAndTrigger,
  simulateClick,
} from "../test_helpers/dom_helper";
import { mountComponentWithPortalTarget, nextTick, setGrid } from "../test_helpers/helpers";

describe("split to columns sidePanel component", () => {
  let model: Model;
  let fixture: HTMLElement;
  let confirmButton: HTMLButtonElement;
  let checkBox: HTMLInputElement;
  let onCloseSidePanel: jest.Mock;
  let env: SpreadsheetChildEnv;
  let splitToColumnsStore: Store<SplitToColumnsStore>;

  beforeEach(async () => {
    onCloseSidePanel = jest.fn();
    ({ model, fixture, env } = await mountComponentWithPortalTarget(SplitIntoColumnsPanel, {
      props: { onCloseSidePanel: () => onCloseSidePanel() },
    }));
    splitToColumnsStore = env.getStore(SplitToColumnsStore);
    confirmButton = fixture.querySelector(".o-split-to-cols-panel button")!;
    checkBox = fixture.querySelector('.o-split-to-cols-panel input[type="checkbox"]')!;
  });

  test("Separator values", async () => {
    await simulateClick(".o-split-to-cols-panel .o-select");
    const separatorValues = fixture.querySelectorAll<HTMLOptionElement>(
      ".o-select-dropdown .o-select-option"
    );
    const values = Array.from(separatorValues).map((option) => option.dataset.id);
    expect(values).toHaveLength(6);
    expect(values).toContain(" ");
    expect(values).toContain(",");
    expect(values).toContain(";");
    expect(values).toContain("\n");
    expect(values).toContain("custom");
    expect(values).toContain("auto");
  });

  test("Editing the separator select updates the store", async () => {
    await editSelectComponent(".o-split-to-cols-panel .o-select", ",");
    expect(splitToColumnsStore.separatorValue).toBe(",");

    await editSelectComponent(".o-split-to-cols-panel .o-select", ";");
    expect(splitToColumnsStore.separatorValue).toBe(";");
  });

  test("Custom separator", async () => {
    setCellContent(model, "A1", "HELLOcustomSeparatorTHERE");
    let input = fixture.querySelector('.o-split-to-cols-panel input[type="text"]')!;
    expect(input).toBeFalsy();
    await editSelectComponent(".o-split-to-cols-panel .o-select", "custom");

    input = fixture.querySelector('.o-split-to-cols-panel input[type="text"]')!;
    expect(input).toBeTruthy();
    await setInputValueAndTrigger(input, "customSeparator");
    await click(confirmButton);
    expect(getCellContent(model, "A1")).toBe("HELLO");
    expect(getCellContent(model, "B1")).toBe("THERE");
  });

  test("Add new columns checkbox", async () => {
    setCheckboxValueAndTrigger(checkBox, true, "change");
    expect(splitToColumnsStore.addNewColumns).toBe(true);

    setCheckboxValueAndTrigger(checkBox, false, "change");
    expect(splitToColumnsStore.addNewColumns).toBe(false);
  });

  test("Multiple columns selected : confirm button disabled + error message", async () => {
    setSelection(model, ["A1:B3"]);
    await nextTick();

    expect(confirmButton.classList).toContain("o-disabled");
    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(1);
  });

  test("Empty custom separator : confirm button disabled but no error message", async () => {
    await editSelectComponent(".o-split-to-cols-panel .o-select", "custom");

    expect(confirmButton.classList).toContain("o-disabled");
    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(0);
  });

  test("No separator in selection : confirm button disabled + error message", async () => {
    setSelection(model, ["A1"]);
    setCellContent(model, "A1", "hello");
    await editSelectComponent(".o-split-to-cols-panel .o-select", " ");
    setCheckboxValueAndTrigger(checkBox, false, "change");
    await nextTick();

    expect(confirmButton.classList).toContain("o-disabled");
    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(1);
  });

  test("Warning if we will overwrite some content", async () => {
    setSelection(model, ["A1"]);
    setGrid(model, { A1: "hello there", B1: "content" });
    await editSelectComponent(".o-split-to-cols-panel .o-select", " ");
    setCheckboxValueAndTrigger(checkBox, false, "change");
    await nextTick();

    expect(confirmButton.classList).not.toContain("o-disabled");
    expect(fixture.querySelectorAll(".o-validation-warning")).toHaveLength(1);
  });

  test("Warning not displayed if there's an error", async () => {
    setSelection(model, ["A1:B1"]);
    setGrid(model, { A1: "hello there", B1: "content" });
    await editSelectComponent(".o-split-to-cols-panel .o-select", " ");
    setCheckboxValueAndTrigger(checkBox, false, "change");
    await nextTick();

    expect(fixture.querySelectorAll(".o-validation-warning")).toHaveLength(0);
    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(1);
  });

  test("Errors updated on separator selection change", async () => {
    setSelection(model, ["A1"]);
    setCellContent(model, "A1", "hello there");
    await editSelectComponent(".o-split-to-cols-panel .o-select", " ");

    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(0);

    await editSelectComponent(".o-split-to-cols-panel .o-select", ";");

    expect(fixture.querySelectorAll(".o-validation-error")).toHaveLength(1);
  });

  test("Panel is closed if the user starts to edit a cell", async () => {
    expect(onCloseSidePanel).not.toHaveBeenCalled();
    const composerFocusStore = env.getStore(ComposerFocusStore);
    composerFocusStore.focusComposer(
      {
        id: "testComposer",
        get editionMode(): EditionMode {
          return "editing";
        },
        startEdition: () => {},
        stopEdition: () => {},
        setCurrentContent: () => {},
      },
      { focusMode: "contentFocus" }
    );
    await nextTick();
    expect(onCloseSidePanel).toHaveBeenCalled();
  });

  test("Panel is closed after a successful split", async () => {
    setSelection(model, ["A1"]);
    setCellContent(model, "A1", "hello there");
    await click(confirmButton);
    await nextTick();
    expect(onCloseSidePanel).toHaveBeenCalled();
  });
});
