import { Model } from "../../src";
import { CellProtectionPanel } from "../../src/components/side_panel/cell_protection/cell_protection_panel";
import { UID } from "../../src/types";
import {
  activateSheet,
  addCellProtectionRule,
  createSheet,
} from "../test_helpers/commands_helpers";
import { click, setInputValueAndTrigger } from "../test_helpers/dom_helper";
import {
  getCellProtectionRule,
  mountComponentWithPortalTarget,
  nextTick,
} from "../test_helpers/helpers";
jest.mock("../../src/components/composer/content_editable_helper", () =>
  require("../__mocks__/content_editable_helper")
);

export async function mountCellProtectionPanel(model?: Model) {
  return mountComponentWithPortalTarget(CellProtectionPanel, {
    model: model || new Model(),
    props: { onCloseSidePanel: () => {} },
  });
}

let model: Model;
let fixture: HTMLElement;
let sheetId: UID;
let sheet2: UID;
let sheet3: UID;

beforeEach(async () => {
  sheet2 = "Sheet2";
  sheet3 = "Sheet3";
  model = new Model({
    sheets: [
      { id: "Sheet1", name: "Sheet1" },
      { id: sheet2, name: "Sheet2" },
      { id: sheet3, name: "Sheet3" },
    ],
  });
  sheetId = model.getters.getActiveSheetId();
});

describe("Cell protection side panel", () => {
  beforeEach(async () => {
    addCellProtectionRule(model, {
      id: "id1",
      type: "range",
      sheetId,
      ranges: ["A1:C2"],
    });
    addCellProtectionRule(model, {
      id: "id2",
      type: "sheet",
      sheetId: sheet2,
      excludeRanges: [],
    });
    addCellProtectionRule(model, {
      id: "id3",
      type: "sheet",
      sheetId: sheet3,
      excludeRanges: ["B1:C2"],
    });
    ({ fixture } = await mountCellProtectionPanel(model));
  });

  test("Side panel is correctly pre-filled with rules", () => {
    const listedRule = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview");
    expect(listedRule).toHaveLength(1);
    const ruleName = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview-name");
    expect(ruleName).toHaveLength(1);
    expect(ruleName[0].textContent).toBe("Sheet1");
    const ruleDescriptions = fixture.querySelectorAll<HTMLInputElement>(
      ".o-cp-preview-description"
    );
    expect(ruleDescriptions).toHaveLength(1);
    expect(ruleDescriptions[0].textContent).toBe("A1:C2");
  });

  test("Can toggle view all spreadsheet cell protection rules", async () => {
    await click(fixture, ".o-cp-view-mode-selector .o-badge-selection button[data-id='all']");
    let listedRules = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview");
    expect(listedRules).toHaveLength(3);
    const ruleNames = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview-name");
    expect(ruleNames).toHaveLength(3);
    expect(ruleNames[0].textContent).toBe("Sheet1");
    expect(ruleNames[1].textContent).toBe("Sheet2");
    expect(ruleNames[2].textContent).toBe("Sheet3");
    const ruleDescriptions = fixture.querySelectorAll<HTMLInputElement>(
      ".o-cp-preview-description"
    );
    expect(ruleDescriptions).toHaveLength(3);
    expect(ruleDescriptions[0].textContent).toBe("A1:C2");
    expect(ruleDescriptions[1].textContent).toBe("Entire sheet");
    expect(ruleDescriptions[2].textContent).toBe("Entire sheet except Sheet3!B1:C2");
    await click(
      fixture,
      ".o-cp-view-mode-selector .o-badge-selection button[data-id='currentSheet']"
    );
    listedRules = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview");
    expect(listedRules).toHaveLength(1);
    const ruleName = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview-name");
    expect(ruleName).toHaveLength(1);
    expect(ruleName[0].textContent).toBe("Sheet1");
    const ruleDescription = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview-description");
    expect(ruleDescription).toHaveLength(1);
    expect(ruleDescription[0].textContent).toBe("A1:C2");
  });

  /** TODO */
  test("Can add a range cell protection rule from the side panel", async () => {
    const sheet4 = "Sheet4";
    createSheet(model, { sheetId: sheet4 });
    activateSheet(model, sheet4);
    await click(fixture, ".o-cp-add");
    const rangeInput = fixture.querySelectorAll<HTMLInputElement>(".o-cp-range .o-input");
    setInputValueAndTrigger(rangeInput[0], "A1:C2");
    await click(fixture, ".o-cp-save");
    expect(getCellProtectionRule(model, sheet4)).toMatchObject({
      type: "range",
      sheetId: sheet4,
      ranges: [model.getters.getRangeFromSheetXC(sheetId, "A1:C2")],
    });
  });

  test("Can add a sheet cell protection rule from the side panel", async () => {
    await click(fixture, ".o-cp-add");
    const ruleTypeSelector = fixture.querySelector<HTMLInputElement>(".o-cp-rule-type .o-input")!;
    ruleTypeSelector.value = "sheet";
    ruleTypeSelector.dispatchEvent(new Event("change"));
    await nextTick();
    const sheetSelector = fixture.querySelector<HTMLInputElement>(".o-cp-sheet .o-input")!;
    sheetSelector.value = "Sheet3";
    sheetSelector.dispatchEvent(new Event("change"));
    const excludeRangesCheckbox = fixture.querySelector<HTMLInputElement>(
      ".o-cp-exclude-cells .o-checkbox input"
    )!;
    // @ts-ignore
    excludeRangesCheckbox.value = true;
    excludeRangesCheckbox.dispatchEvent(new Event("change"));
    await nextTick();
    activateSheet(model, "Sheet3");
    const rangeInput = fixture.querySelectorAll<HTMLInputElement>(".o-cp-exclude-cells");
    setInputValueAndTrigger(rangeInput[0], "A1");
    await click(fixture, ".o-cp-save");
    expect(getSheetCellProtectionRules(model, "Sheet3")).toHaveLength(1);
    expect(getSheetCellProtectionRules(model, "Sheet3")[0]).toMatchObject({
      type: "sheet",
      sheetId: "Sheet3",
      excludeRanges: ["A1"],
    });
  });

  test("Can delete a cell protection rule from the side panel", async () => {
    const deleteButtons = fixture.querySelectorAll(".o-cp-preview-delete");
    await click(deleteButtons[0]);
    const listedRules = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview");
    expect(listedRules).toHaveLength(1);
  });

  test("Can delete another sheet's cell protection rule from the side panel", async () => {
    await click(fixture, ".o-toggle-show-all-cp-rules");
    const deleteButtons = fixture.querySelectorAll(".o-cp-preview-delete");
    await click(deleteButtons[2]);
    const listedRules = fixture.querySelectorAll<HTMLInputElement>(".o-cp-preview");
    expect(listedRules).toHaveLength(2);
  });
});
