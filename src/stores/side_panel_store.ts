import { sidePanelRegistry } from "../registries";
import { Providers, StateNotifier } from "./providers";

class SidePanelState {
  panelProps = {};
  // undefined values are annoying here
  sidePanelKey?: string;

  get isOpen() {
    return this.sidePanelKey !== undefined;
  }
}

class SidePanel extends StateNotifier<SidePanelState> {
  constructor() {
    super(new SidePanelState());
  }

  open(sidePanelKey: string, props: any) {
    // private state ?
    this.state.panelProps = props;
    this.state.sidePanelKey = sidePanelKey;
  }

  toggle(sidePanelKey: string, props: any) {
    if (sidePanelKey === this.state.sidePanelKey) {
      this.close();
    } else {
      this.open(sidePanelKey, props);
    }
  }

  close() {
    this.state.sidePanelKey = undefined;
    this.state.panelProps = {};
  }
}

export const sidePanelProvider = () => new SidePanel();

export const sidePanelContentProvider = (providers: Providers) => {
  const sidePanel = providers.watch(sidePanelProvider);
  if (!sidePanel.state.isOpen) {
    throw new Error("The side panel is closed! There's no content to show");
  }
  const content = sidePanelRegistry.get(sidePanel.state.sidePanelKey!);
  return {
    Body: content.Body,
    Footer: content.Footer,
    title: content.title,
    panelProps: sidePanel.state.panelProps,
  };
};
