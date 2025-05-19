import { Model } from "../../src";
import {
  mountSpreadsheet,
  nextTick,
  setMobileMode,
  typeInComposerGrid,
} from "../test_helpers/helpers";

let fixture: HTMLElement;
// let parent: Spreadsheet;
// let model: Model;

beforeEach(async () => {
  ({ fixture } = await mountSpreadsheet({ model: new Model() }, { isSmall: true }));
});

describe("Small Bottom Bar", () => {
  test("Clicking the validate button confirms the edition", async () => {});

  test("Navigate through ribbon menu", async () => {});

  test("the bottombar composer is auto focused on edition", async () => {
    await typeInComposerGrid(`=SUM(`);
    expect(fixture.querySelector(".o-spreadsheet-small-bottom-bar .o-composer")).toBe(
      document.activeElement
    );
  });
});

describe("Small Bottom Bar - Mobile Mode", () => {
  test("Sheet drag and drop is disabled in mobile mode", async () => {
    setMobileMode();
    await nextTick();
  });
});
