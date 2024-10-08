import { ChartConfiguration } from "chart.js";
import { topojson } from "chartjs-chart-geo";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  Color,
  CommandResult,
  CoreGetters,
  Getters,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import {
  ChartCreationContext,
  CustomizedDataSet,
  DataSet,
  DatasetDesign,
  ExcelChartDefinition,
} from "../../../types/chart/chart";
import { LegendPosition } from "../../../types/chart/common_chart";
import { GeoChartDefinition, GeoChartRuntime } from "../../../types/chart/geo_chart";
import { Validator } from "../../../types/validator";
import { createValidRange } from "../../range";
import { AbstractChart } from "./abstract_chart";
import {
  checkDataset,
  checkLabelRange,
  copyDataSetsWithNewSheetId,
  copyLabelRangeWithNewSheetId,
  createDataSets,
  transformChartDefinitionWithDataSetsWithZone,
  updateChartRangesWithDataSets,
} from "./chart_common";
import { WORLD_TOPOJSON } from "./geo_chart_topojson";

export class GeoChart extends AbstractChart {
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;
  readonly background?: Color;
  readonly legendPosition: LegendPosition;
  readonly type = "geo";
  readonly dataSetsHaveTitle: boolean;
  readonly dataSetDesign?: DatasetDesign[];

  constructor(definition: GeoChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createValidRange(getters, sheetId, definition.labelRange);
    this.background = definition.background;
    this.legendPosition = definition.legendPosition;
    this.dataSetsHaveTitle = definition.dataSetsHaveTitle;
    this.dataSetDesign = definition.dataSets;
  }

  static transformDefinition(
    definition: GeoChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): GeoChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: GeoChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static getDefinitionFromContextCreation(context: ChartCreationContext): GeoChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ?? [],
      dataSetsHaveTitle: context.dataSetsHaveTitle ?? false,
      legendPosition: context.legendPosition ?? "top",
      title: context.title || { text: "" },
      type: "geo",
      labelRange: context.auxiliaryRange || undefined,
    };
  }

  getContextCreation(): ChartCreationContext {
    const range: CustomizedDataSet[] = [];
    for (const [i, dataSet] of this.dataSets.entries()) {
      range.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, this.sheetId),
      });
    }
    return {
      ...this,
      range,
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }

  copyForSheetId(sheetId: UID): GeoChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new GeoChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): GeoChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new GeoChart(definition, sheetId, this.getters);
  }

  getDefinition(): GeoChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): GeoChartDefinition {
    const ranges: CustomizedDataSet[] = [];
    for (const [i, dataSet] of dataSets.entries()) {
      ranges.push({
        ...this.dataSetDesign?.[i],
        dataRange: this.getters.getRangeString(dataSet.dataRange, targetSheetId || this.sheetId),
      });
    }
    return {
      type: "geo",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      background: this.background,
      dataSets: ranges,
      legendPosition: this.legendPosition,
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    return undefined;
  }

  updateRanges(applyChange: ApplyRangeChange): GeoChart {
    const { dataSets, labelRange, isStale } = updateChartRangesWithDataSets(
      this.getters,
      applyChange,
      this.dataSets,
      this.labelRange
    );
    if (!isStale) {
      return this;
    }
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange);
    return new GeoChart(definition, this.sheetId, this.getters);
  }
}

export function createGeoChartRuntime(chart: GeoChart, getters: Getters): GeoChartRuntime {
  const us = WORLD_TOPOJSON as any;

  // const nation = (topojson.feature(us, us.objects.nation) as any).features[0];
  const states = (topojson.feature(us, us.objects.countries) as any).features;

  const f1 = states.find((d) => d.properties.name === "United Kingdom");
  const f2 = states.find((d) => d.properties.name === "Brazil");
  console.log(f1, f2);

  const config: ChartConfiguration<"choropleth"> = {
    type: "choropleth" as const,
    data: {
      labels: ["France", "Belgium"],
      datasets: [
        {
          outline: states, // ... outline to compute bounds
          showOutline: true,
          data: [
            {
              value: 0.4,
              feature: f1, // ... the feature to render
            },
            {
              value: 0.3,
              feature: f2,
            },
          ],
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        projection: {
          projection: "equalEarth" as const, // ... projection method
          axis: "x" as const, // ADRM TODO crashes otherwise ???
        },
        color: {
          axis: "x",
          legend: {
            position: "bottom-left",
          },
          // interpolate: (value: number) => {
          //   return "#ff0000"; ADRM TODO: value is between 0 & 1, check how to color scale this
          // },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  };

  console.log(config);

  // @ts-ignore ADRM TODO
  return { chartJsConfig: config, background: chart.background || BACKGROUND_CHART_COLOR };
}
