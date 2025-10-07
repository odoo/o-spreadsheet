import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { Component } from "@odoo/owl";
import { SidePanelContent } from "../../../registries/side_panel_registry";
import { SpreadsheetChildEnv } from "../../../types/spreadsheetChildEnv";
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

  get pinInfoMessage() {
    return _t("Pin this panel to allow to open another side panel beside it.");
  }
}
