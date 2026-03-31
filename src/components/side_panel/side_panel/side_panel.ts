import { Component } from "@odoo/owl";
import { SidePanelContent } from "../../../registries/side_panel_registry";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
import { _t } from "../../../translation";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { SidePanelComponentProps } from "./side_panel_store";

export interface SidePanelProps {
  panelContent: SidePanelContent;
  panelProps: SidePanelComponentProps;
  onCloseSidePanel: () => void;
  onStartHandleDrag: (ev: MouseEvent) => void;
  onResetPanelSize: () => void;
  isPinned?: boolean;
  onTogglePinPanel?: () => void;
  onToggleCollapsePanel?: () => void;
  isCollapsed?: boolean;
}

export class SidePanel extends Component<SidePanelProps, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";
  static props = {
    panelContent: Object,
    panelProps: Object,
    onCloseSidePanel: Function,
    onStartHandleDrag: Function,
    onResetPanelSize: Function,
    isPinned: { type: Boolean, optional: true },
    onTogglePinPanel: { type: Function, optional: true },
    onToggleCollapsePanel: { type: Function, optional: true },
    isCollapsed: { type: Boolean, optional: true },
  };
  spreadsheetRect = useSpreadsheetRect();

  getTitle() {
    const panel = this.props.panelContent;
    return typeof panel.title === "function"
      ? panel.title(this.env, this.props.panelProps)
      : panel.title;
  }
}
