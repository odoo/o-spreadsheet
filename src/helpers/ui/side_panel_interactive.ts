import {
  SidePanelComponentProps,
  SidePanelStore,
} from "../../components/side_panel/side_panel/side_panel_store";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";

export function togglePinnedSidePanel(
  env: SpreadsheetChildEnv,
  componentTag: string,
  panelProps: SidePanelComponentProps = {}
) {
  const store = env.getStore(SidePanelStore);
  if (store.mainPanel?.componentTag === componentTag && store.isMainPanelOpen) {
    store.closeMainPanel();
    return;
  }
  store.open(componentTag, panelProps);
  if (!store.mainPanel?.isPinned) {
    store.togglePinPanel();
  }
}
