import { ProviderContainer } from "../../src/stores/providers";
import { sidePanelComponentProvider, sidePanelProvider } from "../../src/stores/side_panel_store";

describe("side panel store", () => {
  let providers: ProviderContainer;
  beforeEach(() => {
    providers = new ProviderContainer();
  });

  test("open side panel", () => {
    const sidePanel = providers.get(sidePanelProvider);
    let state = providers.get(sidePanelComponentProvider);
    expect(state.isOpen).toBe(false);
    sidePanel.open("ConditionalFormatting", {});
    state = providers.get(sidePanelComponentProvider);
    expect(state.isOpen).toBe(true);
  });
});
