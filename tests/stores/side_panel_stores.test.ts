import { ProviderContainer } from "../../src/stores/providers";
import { sidePanelProvider, sidePanelStateProvider } from "../../src/stores/side_panel_store";

describe("side panel store", () => {
  let providers: ProviderContainer;
  beforeEach(() => {
    providers = new ProviderContainer();
  });

  test("open side panel", () => {
    const sidePanel = providers.get(sidePanelProvider);
    let state = providers.get(sidePanelStateProvider);
    expect(state.isOpen).toBe(false);
    sidePanel.open("ConditionalFormatting", {});
    state = providers.get(sidePanelStateProvider);
    expect(state.isOpen).toBe(true);
  });
});
