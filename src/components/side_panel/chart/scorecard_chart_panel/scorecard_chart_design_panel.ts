import { Component, useState } from "@odoo/owl";
import { ScorecardChartDefinition } from "../../../../types/chart/scorecard_chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { ColorPicker } from "../../../color_picker/color_picker";

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
  static template = "o-spreadsheet.ScorecardChartDesignPanel";
  static components = { ColorPicker };

  private state: PanelState = useState({
    openedColorPicker: undefined,
  });

  updateTitle(ev) {
    this.props.updateChart({
      title: ev.target.value,
    });
  }

  updateBaselineDescr(ev) {
    this.props.updateChart({ baselineDescr: ev.target.value });
  }

  updateBaselineMode(ev) {
    this.props.updateChart({ baselineMode: ev.target.value });
  }

  openColorPicker(colorPickerId: ColorPickerId) {
    this.state.openedColorPicker = colorPickerId;
  }

  setColor(color: string, colorPickerId: ColorPickerId) {
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
    this.state.openedColorPicker = undefined;
  }
}
