import { useSpreadsheetRect } from "../../helpers/position_hook";
import { types } from "../../props_validation";

import { useProps } from "@odoo/owl";
import { SpreadsheetComponent } from "../../spreadsheet/spreadsheet_component";

export class SidePanel extends SpreadsheetComponent {
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
  spreadsheetRect = useSpreadsheetRect();

  getTitle() {
    const panel = this.props.panelContent;
    return typeof panel.title === "function"
      ? panel.title(this.env, this.props.panelProps)
      : panel.title;
  }
}
