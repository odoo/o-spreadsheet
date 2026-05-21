import { Component } from "@odoo/owl";
import { ChartPreview } from "../../../../components/figures/chart/chart_preview/chart_preview";
import { DEFAULT_FIGURE_HEIGHT, DEFAULT_FIGURE_WIDTH } from "../../../../constants";
import { getSuggestedCharts } from "../../../../helpers/figures/charts/chart_suggestion_engine";
import { centerFigurePosition } from "../../../../helpers/figures/figure/figure";
import { UuidGenerator } from "../../../../helpers/uuid";
import { ChartDefinition, SuggestedChart } from "../../../../types/chart/chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Section } from "../../components/section/section";

interface Props {
  onCloseSidePanel?: () => void;
}

export class ChartSuggestionsPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartSuggestionsPanel";
  static props = { onCloseSidePanel: { type: Function, optional: true } };
  static components = { Section, ChartPreview };

  get suggestions(): SuggestedChart[] {
    const zones = this.env.model.getters.getSelectedZones();
    return getSuggestedCharts(zones, this.env.model.getters);
  }

  insertSuggestion(suggestion: SuggestedChart) {
    if (suggestion.carouselDefinitions?.length) {
      this.insertCarousel(suggestion.carouselDefinitions);
    } else {
      this.insertChart(suggestion.definition);
    }
  }

  private insertChart(definition: ChartDefinition) {
    const getters = this.env.model.getters;
    const figureId = UuidGenerator.smallUuid();
    const sheetId = getters.getActiveSheetId();
    const size = { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
    const { col, row, offset } = centerFigurePosition(getters, size);
    const result = this.env.model.dispatch("CREATE_CHART", {
      sheetId,
      figureId,
      chartId: UuidGenerator.smallUuid(),
      col,
      row,
      offset,
      size,
      definition,
    });
    if (result.isSuccessful) {
      this.env.model.dispatch("SELECT_FIGURE", { figureId });
      this.env.openSidePanel("ChartPanel");
    }
  }

  private insertCarousel(definitions: ChartDefinition[]) {
    const getters = this.env.model.getters;
    const carouselFigureId = UuidGenerator.smallUuid();
    const sheetId = getters.getActiveSheetId();
    const size = { width: DEFAULT_FIGURE_WIDTH, height: DEFAULT_FIGURE_HEIGHT };
    const { col, row, offset } = centerFigurePosition(getters, size);

    const result = this.env.model.dispatch("CREATE_CAROUSEL", {
      sheetId,
      figureId: carouselFigureId,
      col,
      row,
      offset,
      size,
      definition: { items: [] },
    });

    if (!result.isSuccessful) {
      return;
    }

    for (const definition of definitions) {
      const chartId = UuidGenerator.smallUuid();
      this.env.model.dispatch("CREATE_CHART", {
        sheetId,
        figureId: carouselFigureId,
        chartId,
        definition,
      });
      const carousel = getters.getCarousel(carouselFigureId);
      this.env.model.dispatch("UPDATE_CAROUSEL", {
        sheetId,
        figureId: carouselFigureId,
        definition: { ...carousel, items: [...carousel.items, { type: "chart", chartId }] },
      });
    }

    this.env.model.dispatch("SELECT_FIGURE", { figureId: carouselFigureId });
    this.env.openSidePanel("CarouselPanel", { figureId: carouselFigureId });
  }
}
