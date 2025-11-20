import { _t } from "@odoo/o-spreadsheet-engine";
import { CHART_AXIS_CHOICES } from "@odoo/o-spreadsheet-engine/helpers/figures/charts/chart_common";
import { VerticalAxisPosition } from "@odoo/o-spreadsheet-engine/types/chart";
import {
  BubbleChartDefinition,
  BubbleColorMode,
} from "@odoo/o-spreadsheet-engine/types/chart/bubble_chart";
import { DispatchResult, GenericDefinition, UID } from "../../../../types/index";
import { RadioSelection } from "../../components/radio_selection/radio_selection";
import { Section } from "../../components/section/section";
import { GenericZoomableChartDesignPanel } from "../zoomable_chart/design_panel";

interface Props {
  chartId: UID;
  definition: BubbleChartDefinition;
  canUpdateChart: (
    chartId: UID,
    definition: GenericDefinition<BubbleChartDefinition>
  ) => DispatchResult;
  updateChart: (
    chartId: UID,
    definition: GenericDefinition<BubbleChartDefinition>
  ) => DispatchResult;
}

export class BubbleChartDesignPanel extends GenericZoomableChartDesignPanel<Props> {
  static template = "o-spreadsheet-BubbleChartDesignPanel";
  static components = {
    ...GenericZoomableChartDesignPanel.components,
    RadioSelection,
    Section,
  };

  colorModeChoices = [
    { value: "single", label: _t("Single color") },
    { value: "multiple", label: _t("Multiple colors") },
  ];

  axisChoices = CHART_AXIS_CHOICES;

  get colorMode(): BubbleColorMode {
    const definition = this.props.definition as BubbleChartDefinition;
    return (definition.colorMode as BubbleColorMode) || "single";
  }

  onColorModeChange(mode: string) {
    this.props.updateChart(this.props.chartId, {
      colorMode: mode as BubbleColorMode,
    });
  }

  get verticalAxisPosition(): VerticalAxisPosition {
    const definition = this.props.definition as BubbleChartDefinition;
    return definition.verticalAxisPosition || "left";
  }

  updateVerticalAxisPosition(value: VerticalAxisPosition) {
    this.props.updateChart(this.props.chartId, {
      verticalAxisPosition: value,
    });
  }
}
