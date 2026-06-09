import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { types } from "../../props_validation";

import { props } from "@odoo/owl";
import { Component } from "../../../owl3_compatibility_layer";

export class SidePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";

  protected props = props({
    panelContent: types.SidePanelContent(),
    panelProps: types.SidePanelComponentProps(),
    onCloseSidePanel: types.function(),
    onStartHandleDrag: types.function<(ev: MouseEvent) => void>(),
    onResetPanelSize: types.function(),
    "isPinned?": types.boolean(),
    "onTogglePinPanel?": types.function(),
    "onToggleCollapsePanel?": types.function(),
    "isCollapsed?": types.boolean(),
  });
  spreadsheetRect = useSpreadsheetRect();

  getTitle() {
    const panel = this.props.panelContent;
    return typeof panel.title === "function"
      ? panel.title(this.env, this.props.panelProps)
      : panel.title;
  }
}
