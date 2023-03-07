import { Component, useExternalListener, useState } from "@odoo/owl";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { Color, DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { ColorPickerWidget } from "../../../color_picker/color_picker_widget";

type ColorPickerId = undefined | "backgroundColor" | "baselineColorUp" | "baselineColorDown";

interface Props {
  figureId: UID;
  definition: ScorecardChartDefinition;
  updateChart: (definition: Partial<ScorecardChartDefinition>) => DispatchResult;
}

interface PanelState {
  openedColorPicker: ColorPickerId;
}

export class ScorecardChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ScorecardChartDesignPanel";
  static components = { ColorPickerWidget };

  private state: PanelState = useState({
    openedColorPicker: undefined,
  });

  setup() {
    useExternalListener(window, "click", this.closeMenus);
  }

  updateTitle(ev) {
    this.props.updateChart({
      title: ev.target.value,
    });
  }

  updateBaselineDescr(ev) {
    this.props.updateChart({ baselineDescr: ev.target.value });
  }

  toggleColorPicker(colorPickerId: ColorPickerId) {
    if (this.state.openedColorPicker === colorPickerId) {
      this.state.openedColorPicker = undefined;
    } else {
      this.state.openedColorPicker = colorPickerId;
    }
  }

  setColor(color: Color, colorPickerId: ColorPickerId) {
    switch (colorPickerId) {
      case "backgroundColor":
        this.props.updateChart({ background: color });
        break;
      case "baselineColorDown":
        this.props.updateChart({ baselineColorDown: color });
        break;
      case "baselineColorUp":
        this.props.updateChart({ baselineColorUp: color });
        break;
    }
    this.closeMenus();
  }

  private closeMenus() {
    this.state.openedColorPicker = undefined;
  }
}

ScorecardChartDesignPanel.props = {
  figureId: String,
  definition: Object,
  updateChart: Function,
};
