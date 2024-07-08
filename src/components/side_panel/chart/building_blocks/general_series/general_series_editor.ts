import { Component, useState } from "@odoo/owl";
import { getNthColor, toHex } from "../../../../../helpers";
import { getDefinedAxis } from "../../../../../helpers/figures/charts";
import { _t } from "../../../../../translation";
import {
  ChartWithAxisDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../../types";
import { ChartTerms } from "../../../../translations_terms";
import { SidePanelCollapsible } from "../../../components/collapsible/side_panel_collapsible";
import { RoundColorPicker } from "../../../components/round_color_picker/round_color_picker";
import { Section } from "../../../components/section/section";

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  canChangeVerticalAxis?: boolean;
}

export class GeneralSeriesEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-GeneralSeriesEditor";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canChangeVerticalAxis: { type: Boolean, optional: true },
  };

  private state = useState({ index: -1 });

  getDataSeries() {
    return [
      _t("All series"),
      ...this.props.definition.dataSets.map((d, i) => d.label ?? `${ChartTerms.Series} ${i + 1}`),
    ];
  }

  updateSerieEditor(ev) {
    this.state.index = ev.target.selectedIndex - 1;
  }

  updateDataSeriesColor(color: string) {
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      backgroundColor: color,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieColor() {
    if (this.state.index === -1) {
      return "";
    }
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return "";
    const color = dataSets[this.state.index].backgroundColor;
    return color ? toHex(color) : getNthColor(this.state.index);
  }

  updateDataSeriesAxis(ev) {
    const yAxisId = ev.target.value === "left" ? "y" : "y1";
    let dataSets = this.props.definition.dataSets;
    const currentIndex = this.state.index;
    if (currentIndex === -1) {
      for (let i = 0; i < dataSets.length; i++) {
        dataSets[i] = {
          ...dataSets[i],
          yAxisId,
        };
      }
    } else {
      dataSets[currentIndex] = {
        ...dataSets[currentIndex],
        yAxisId,
      };
    }
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieAxis() {
    const dataSets = this.props.definition.dataSets;
    if (this.state.index === -1) {
      const { useLeftAxis, useRightAxis } = getDefinedAxis(this.props.definition);
      if (useLeftAxis && useRightAxis) {
        return "";
      } else if (useLeftAxis) {
        return "left";
      }
      return "right";
    }
    return dataSets[this.state.index]?.yAxisId === "y1" ? "right" : "left";
  }

  updateDataSeriesLabel(ev) {
    const label = ev.target.value;
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return;
    dataSets[this.state.index] = {
      ...dataSets[this.state.index],
      label,
    };
    this.props.updateChart(this.props.figureId, { dataSets });
  }

  getDataSerieLabel() {
    if (this.state.index === -1) {
      return "";
    }
    const dataSets = this.props.definition.dataSets;
    return dataSets[this.state.index + 1]?.label || this.getDataSeries()[this.state.index + 1];
  }

  get canHaveTwoVerticalAxis() {
    return "horizontal" in this.props.definition ? !this.props.definition.horizontal : true;
  }
}
