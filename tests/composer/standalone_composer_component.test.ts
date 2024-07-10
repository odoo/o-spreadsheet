import { Component, xml } from "@odoo/owl";
import { Model, SpreadsheetChildEnv } from "../../src";
import { ComposerFocusStore } from "../../src/components/composer/composer_focus_store";
import { StandaloneComposer } from "../../src/components/composer/standalone_composer/standalone_composer";
import { zoneToXc } from "../../src/helpers";
import { sidePanelRegistry } from "../../src/registries/side_panel_registry";
import { Store } from "../../src/store_engine";
import { click, keyDown, simulateClick } from "../test_helpers/dom_helper";
import { editStandaloneComposer, mountSpreadsheet, nextTick } from "../test_helpers/helpers";

jest.mock("../../src/components/composer/content_editable_helper.ts", () =>
  require("../__mocks__/content_editable_helper")
);

let env: SpreadsheetChildEnv;
let onConfirm = jest.fn();
let fixture: HTMLElement;
let composerEl: HTMLElement;
let composerFocusStore: Store<ComposerFocusStore>;
let model: Model;

class SidePanelWithComposer extends Component<any, any> {
  static template = xml`
      <div>
        <StandaloneComposer onConfirm="props.onConfirm" composerContent="props.composerContent" />
      </div>`;
  static props = { "*": Object };
  static components = { StandaloneComposer };
}
sidePanelRegistry.add("SidePanelWithComposer", {
  title: "SidePanelWithComposer",
  Body: SidePanelWithComposer,
});

async function openSidePanelWithComposer(composerContent = "") {
  env.openSidePanel("SidePanelWithComposer", { onConfirm, composerContent });
  await nextTick();
  composerEl = fixture.querySelector<HTMLElement>(".o-sidePanel .o-composer")!;
}

const composerSelector = ".o-sidePanel .o-composer";

describe("Spreadsheet integrations tests", () => {
  beforeEach(async () => {
    ({ env, fixture, model } = await mountSpreadsheet());
    composerFocusStore = env.getStore(ComposerFocusStore);
  });

  test("Can edit a standalone composer", async () => {
    await openSidePanelWithComposer("Hello world");
    expect(composerEl.textContent).toBe("Hello world");

    await editStandaloneComposer(composerSelector, " new text !", { fromScratch: false });
    expect(composerEl.textContent).toBe("Hello world new text !");
    await keyDown({ key: "Enter" });
    expect(onConfirm).toHaveBeenCalledWith("Hello world new text !");
  });

  test("Can use formula assistant using standalone composer", async () => {
    await openSidePanelWithComposer();
    await editStandaloneComposer(composerSelector, "=SU", { confirm: false });
    await nextTick();
    await click(fixture.querySelector(".o-autocomplete-value")!);
    expect(composerEl.textContent).toBe("=SUM(");
  });

  test("Can select a range with the keyboard using standalone composer", async () => {
    await openSidePanelWithComposer();
    await editStandaloneComposer(composerSelector, "=", { confirm: false });

    await keyDown({ key: "ArrowRight" });
    expect(composerEl.textContent).toBe("=B1");

    await editStandaloneComposer(composerSelector, "+", { confirm: false, fromScratch: false });
    await keyDown({ key: "ArrowDown" });
    expect(composerEl.textContent).toBe("=B1+A2");
  });

  test("Can select a range with the mouse using standalone composer", async () => {
    await openSidePanelWithComposer();
    await editStandaloneComposer(composerSelector, "=SUM(", { confirm: false });
    await simulateClick(".o-grid-overlay", 300, 200);
    expect(composerEl.textContent).toBe("=SUM(D9");
  });

  test("Parenthesis are closed when composer is confirmed", async () => {
    await openSidePanelWithComposer();
    await editStandaloneComposer(composerSelector, "=SUM(A1");
    await keyDown({ key: "Enter" });
    expect(onConfirm).toHaveBeenCalledWith("=SUM(A1)");
  });

  test("Standalone composer lose focus and is confirmed when clicking on another composer", async () => {
    await openSidePanelWithComposer();
    await editStandaloneComposer(composerSelector, "Hi !", { confirm: false });
    expect(composerFocusStore.activeComposer.id).toBe("standaloneComposer");

    await simulateClick(".o-spreadsheet-topbar .o-composer");
    expect(composerFocusStore.activeComposer.id).toBe("topbarComposer");
    expect(onConfirm).toHaveBeenCalledWith("Hi !");
  });

  test("Confirming standalone composer do not move the selection", async () => {
    await openSidePanelWithComposer();
    await editStandaloneComposer(composerSelector, "=A1", { confirm: false });
    await keyDown({ key: "Enter" });
    expect(zoneToXc(model.getters.getSelectedZone())).toBe("A1");
  });
});
