import { Model } from "../../src";
import { click } from "../test_helpers/dom_helper";
import { getCellText } from "../test_helpers/getters_helpers";
import {
  mountSpreadsheet,
  nextTick,
  typeInComposerGrid,
  typeInComposerHelper,
} from "../test_helpers/helpers";

let fixture: HTMLElement;
let model: Model;

beforeEach(async () => {
  ({ fixture, model } = await mountSpreadsheet({ model: new Model() }, { isSmall: true }));
});

describe("Small Bottom Bar", () => {
  // composer
  test("Clicking the validate button confirms the edition in the bottom bar composer", async () => {
    await typeInComposerGrid(`lop`);
    await click(fixture, ".o-spreadsheet-small-bottom-bar .o-composer");
    await nextTick();
    expect(fixture.querySelector(".o-selection-button")).not.toBeNull();

    await typeInComposerHelper(".o-spreadsheet-small-bottom-bar .o-composer", "c", false);
    await click(fixture, ".o-selection-button");
    expect(getCellText(model, "A1")).toBe("clop");
  });
});
