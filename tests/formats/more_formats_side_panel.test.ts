import { Model } from "../../src";
import { MoreFormatsPanel } from "../../src/components/side_panel/more_formats/more_formats";
import { SpreadsheetChildEnv } from "../../src/types";
import { setFormat } from "../test_helpers/commands_helpers";
import { simulateClick } from "../test_helpers/dom_helper";
import { getCell } from "../test_helpers/getters_helpers";
import { mountComponent } from "../test_helpers/helpers";

describe("more formats side panel component", () => {
  let model: Model;
  let fixture: HTMLElement;

  async function mountFormatPanel(modelArg?: Model, env?: SpreadsheetChildEnv) {
    model = modelArg ?? Model.BuildSync();
    ({ fixture } = await mountComponent(MoreFormatsPanel, {
      model,
      props: { onCloseSidePanel: () => {} },
      env,
    }));
  }

  test("can set format", async () => {
    await mountFormatPanel();
    const button = fixture.querySelector('div[data-name="Full week day and month"]');
    expect(fixture.querySelectorAll(".check-icon svg")).toHaveLength(0);
    await simulateClick(button);
    expect(getCell(model, "A1")?.format).toEqual("dddd d mmmm yyyy");
    expect(fixture.querySelectorAll(".check-icon svg")).toHaveLength(1);
    expect(button?.querySelector(".check-icon svg")).toBeTruthy();
  });

  test("format is active when mounting panel", async () => {
    const model = Model.BuildSync();
    setFormat(model, "A1", "dddd d mmmm yyyy");
    await mountFormatPanel(model);
    const button = fixture.querySelector('div[data-name="Full week day and month"]');
    expect(fixture.querySelectorAll(".check-icon svg")).toHaveLength(1);
    expect(button?.querySelector(".check-icon svg")).toBeTruthy();
  });
});
