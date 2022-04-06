import { ProviderContainer } from "../../src/stores/providers";
import { sidePanelProvider } from "../../src/stores/side_panel_store";

describe("side panel store", () => {
  let providers: ProviderContainer;
  beforeEach(() => {
    providers = new ProviderContainer();
  });

  test("open and close side panel", () => {
    const sidePanel = providers.get(sidePanelProvider);
    expect(sidePanel.state.isOpen).toBe(false);
    sidePanel.notify.open("ConditionalFormatting", {});
    expect(sidePanel.state.isOpen).toBe(true);
    sidePanel.notify.close();
    expect(sidePanel.state.isOpen).toBe(false);
  });
});
