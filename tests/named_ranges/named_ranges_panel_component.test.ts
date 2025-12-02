import { Model } from "@odoo/o-spreadsheet-engine";
import { toZone } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { NamedRangesPanel } from "../../src/components/side_panel/named_ranges_panel/named_ranges_panel";
import {
  createNamedRange,
  setInputValueAndTrigger,
  setSelection,
  simulateClick,
} from "../test_helpers";
import { mountComponent, nextTick } from "../test_helpers/helpers";

let model: Model;
let raiseError: jest.Mock;

beforeEach(() => {
  model = new Model();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

async function mountNamedRangesPanel() {
  raiseError = jest.fn();
  ({ model } = await mountComponent(NamedRangesPanel, {
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
      rangeName: "NamedRange",
      range: { zone: toZone("A1:B2") },
    });
    expect(".o-named-range-preview .os-input").toHaveValue("NamedRange");
    expect(".o-named-range-preview .o-selection-input input").toHaveValue("A1:B2");
  });

  test("Can edit a named range from the side panel", async () => {
    createNamedRange(model, "MyRange", "A1");
    await mountNamedRangesPanel();

    await setInputValueAndTrigger(".o-named-range-preview .os-input", "RenamedRange");
    jest.runAllTimers();
    await setInputValueAndTrigger(".o-named-range-preview .o-selection-input input", "C3:D4");
    await simulateClick(".o-selection-ok");
    jest.runAllTimers();

    expect(model.getters.getNamedRanges()[0]).toMatchObject({
      rangeName: "RenamedRange",
      range: { zone: toZone("C3:D4") },
    });
  });

  test("Cannot edit a named range to an invalid name", async () => {
    createNamedRange(model, "MyRange", "A1");
    await mountNamedRangesPanel();

    await setInputValueAndTrigger(".o-named-range-preview .os-input", "Invalid Name!");
    jest.runAllTimers();
    await nextTick();

    expect(raiseError).toHaveBeenCalledWith(
      "The named range name contains invalid characters. Valid characters are letters, numbers, underscores, and periods."
    );
    expect(model.getters.getNamedRanges()[0].rangeName).toBe("MyRange");
    expect(".o-named-range-preview .os-input").toHaveValue("MyRange");
  });

  test("New named ranges are created with unique names", async () => {
    createNamedRange(model, "NamedRange", "A1");
    await mountNamedRangesPanel();

    await simulateClick(".o-named-range-add");
    await simulateClick(".o-named-range-add");

    expect(model.getters.getNamedRanges()).toMatchObject([
      { rangeName: "NamedRange" },
      { rangeName: "NamedRange1" },
      { rangeName: "NamedRange2" },
    ]);
  });
});
