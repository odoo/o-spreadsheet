import { Component, useState } from "@odoo/owl";
import { getColorsPalette, getNthColor, toHex } from "../../../../../helpers";
import { _t } from "../../../../../translation";
import {
  ChartWithDataSetDefinition,
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
  definition: ChartWithDataSetDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: Partial<ChartWithDataSetDefinition>
  ) => DispatchResult;
  canEditAllSeries?: boolean;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class SeriesDesignEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SeriesDesignEditor";
  static components = {
    SidePanelCollapsible,
    Section,
    RoundColorPicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    slots: { type: Object, optional: true },
    canEditAllSeries: { type: Boolean, optional: true },
  };

  protected state: { index: "all" | number } = useState({
    index: this.props.canEditAllSeries ? "all" : 0,
  });

  getDataSeries() {
    const dataSeries = this.props.definition.dataSets.map(
      (d, i) => d.label ?? `${ChartTerms.Series} ${i + 1}`
    );
    if (!this.props.canEditAllSeries) {
      return dataSeries;
    }
    return [_t("All series"), ...dataSeries];
  }

  updateSerieEditor(ev) {
    const selectedIndex = ev.target.selectedIndex;
    if (this.props.canEditAllSeries) {
      this.state.index = selectedIndex === 0 ? "all" : selectedIndex - 1;
      return;
    }
    this.state.index = selectedIndex;
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
    if (this.state.index === "all") {
      return "";
    }
    const dataSets = this.props.definition.dataSets;
    if (!dataSets?.[this.state.index]) return "";
    const color = dataSets[this.state.index].backgroundColor;
    return color
      ? toHex(color)
      : getNthColor(this.state.index, getColorsPalette(this.props.definition.dataSets.length));
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
    const dataSets = this.props.definition.dataSets;
    return dataSets[this.state.index]?.label || this.getDataSeries()[this.state.index];
  }
}
