import { Model } from "@odoo/o-spreadsheet-engine";
import { toZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { NamedRangesPanel } from "../../src/components/side_panel/named_ranges_panel/named_ranges_panel";
import {
  createNamedRange,
  setInputValueAndTrigger,
  setSelection,
  simulateClick,
  triggerMouseEvent,
} from "../test_helpers";
import { getHighlightsFromStore, mountComponent, nextTick } from "../test_helpers/helpers";

let model: Model;
let raiseError: jest.Mock;
let env: SpreadsheetChildEnv;

beforeEach(() => {
  model = new Model();
});

async function mountNamedRangesPanel() {
  raiseError = jest.fn();
  ({ model, env } = await mountComponent(NamedRangesPanel, {
    props: { onCloseSidePanel: () => {} },
    model,
    env: { raiseError },
  }));
}

describe("Named ranges side panel", () => {
  test("Can create a named range from the side panel", async () => {
    await mountNamedRangesPanel();
    setSelection(model, ["A1:B2"]);

    expect(".o-named-range-preview").toHaveCount(0);
    expect(model.getters.getNamedRanges()).toHaveLength(0);
    await simulateClick(".o-named-range-add");

    expect(".o-named-range-preview").toHaveCount(1);
    expect(model.getters.getNamedRanges()).toHaveLength(1);

    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "Named_Range",
      range: { zone: toZone("A1:B2") },
    });
    expect(".o-named-range-preview .os-input").toHaveValue("Named_Range");
    expect(".o-named-range-preview .o-selection-input input").toHaveValue("A1:B2");
  });

  test("Can edit a named range from the side panel", async () => {
    createNamedRange(model, "MyRange", "A1");
    await mountNamedRangesPanel();

    await setInputValueAndTrigger(".o-named-range-preview .os-input", "RenamedRange");
    await setInputValueAndTrigger(".o-named-range-preview .o-selection-input input", "C3:D4");
    await simulateClick(".o-selection-ok");

    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "RenamedRange",
      range: { zone: toZone("C3:D4") },
    });
  });

  test("Cannot edit a named range to an invalid name", async () => {
    createNamedRange(model, "MyRange", "A1");
    await mountNamedRangesPanel();

    await setInputValueAndTrigger(".o-named-range-preview .os-input", "Invalid Name!");
    await nextTick();

    expect(raiseError).toHaveBeenCalledTimes(1);
    expect(raiseError).toHaveBeenCalledWith(
      "The named range name contains invalid characters. Valid characters are letters, numbers, underscores, and periods."
    );
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("MyRange");
    expect(".o-named-range-preview .os-input").toHaveValue("MyRange");
  });

  test("Entering spaces will replace them by underscores", async () => {
    createNamedRange(model, "MyRange", "A1");
    await mountNamedRangesPanel();

    await setInputValueAndTrigger(".o-named-range-preview .os-input", "Renamed Range");

    expect(".o-named-range-preview .os-input").toHaveValue("Renamed_Range");
    expect(model.getters.getNamedRanges()[0]).toMatchObject({ rangeName: "Renamed_Range" });
  });

  test("New named ranges are created with unique names", async () => {
    createNamedRange(model, "Named_Range", "A1");
    await mountNamedRangesPanel();

    await simulateClick(".o-named-range-add");
    await simulateClick(".o-named-range-add");

    expect(model.getters.getNamedRanges()).toMatchObject([
      { rangeName: "Named_Range" },
      { rangeName: "Named_Range1" },
      { rangeName: "Named_Range2" },
    ]);
  });

  test("Hovering a named range highlights it", async () => {
    createNamedRange(model, "NamedRange", "A1");
    await mountNamedRangesPanel();

    triggerMouseEvent(".o-named-range-preview", "mouseenter");
    await nextTick();
    expect(getHighlightsFromStore(env)).toMatchObject([{ range: { zone: toZone("A1") } }]);
  });

  test("Named range highlight is disabled when using the selection input", async () => {
    createNamedRange(model, "NamedRange", "A1");
    await mountNamedRangesPanel();

    triggerMouseEvent(".o-named-range-preview", "mouseenter");
    await nextTick();
    expect(".o-named-range-preview").not.toHaveClass("o-focused");
    expect(getHighlightsFromStore(env)).toMatchObject([{ range: { zone: toZone("A1") } }]);

    await simulateClick(".o-named-range-preview .o-selection-input input");
    await setInputValueAndTrigger(".o-named-range-preview .o-selection-input input", "C3:D4");
    expect(".o-named-range-preview").toHaveClass("o-focused");
    expect(getHighlightsFromStore(env)).toHaveLength(1);
    expect(getHighlightsFromStore(env)).toMatchObject([{ range: { zone: toZone("C3:D4") } }]);
  });
});
