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
  canChooseAxis?: boolean;
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
    canChooseAxis: { type: Boolean, optional: true },
  };

  get seriesOffset() {
    return this.props.canChooseAxis ? 1 : 0;
  }

  protected state = useState({ index: -this.seriesOffset });

  getDataSeries() {
    const dataSeries = this.props.definition.dataSets.map(
      (d, i) => d.label ?? `${ChartTerms.Series} ${i + 1}`
    );
    if (this.seriesOffset === 0) {
      return dataSeries;
    }
    return [_t("All series"), ...dataSeries];
  }

  updateSerieEditor(ev) {
    this.state.index = ev.target.selectedIndex - this.seriesOffset;
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
