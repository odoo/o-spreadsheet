import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { useSpreadsheetRect } from "../../helpers/position_hook";
import { types } from "../../props_validation";

import { useProps } from "@odoo/owl";
import { useSpreadsheetEnv } from "../../../helpers/owl3_helpers";
import { Component } from "../../../owl3_compatibility_layer";

export class SidePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SidePanel";

  protected props = useProps({
    panelContent: types.SidePanelContent(),
    panelProps: types.SidePanelComponentProps(),
    onCloseSidePanel: types.function(),
    onStartHandleDrag: types.function<(ev: MouseEvent) => void>(),
    onResetPanelSize: types.function(),
    isPinned: types.boolean().optional(),
    onTogglePinPanel: types.function().optional(),
    onToggleCollapsePanel: types.function().optional(),
    isCollapsed: types.boolean().optional(),
  });

  spEnv = useSpreadsheetEnv();
  spreadsheetRect = useSpreadsheetRect();

  getTitle() {
    const panel = this.props.panelContent;
    return typeof panel.title === "function"
      ? panel.title(this.spEnv, this.props.panelProps)
      : panel.title;
  }
}
