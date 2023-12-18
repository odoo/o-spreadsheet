import { ChartConfiguration } from "chart.js";
import { BACKGROUND_CHART_COLOR } from "../../../constants";
import {
  AddColumnsRowsCommand,
  ApplyRangeChange,
  ChartCreationContext,
  ChartDefinition,
  ChartJSRuntime,
  CommandResult,
  CoreGetters,
  DataSet,
  ExcelChartDefinition,
  Getters,
  LocaleFormat,
  Range,
  RemoveColumnsRowsCommand,
  UID,
} from "../../../types";
import { ChoroplethChartDefinition } from "../../../types/chart/choropleth_chart";
import { Validator } from "../../../types/validator";
import { createRange } from "../../range";
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
import {
  getChartDatasetFormat,
  getChartLabelValues,
  getDefaultChartJsRuntime,
} from "./chart_ui_common";

export class ChoroplethChart extends AbstractChart {
  readonly type = "choropleth";
  readonly dataSets: DataSet[];
  readonly labelRange?: Range | undefined;

  constructor(definition: ChoroplethChartDefinition, sheetId: UID, getters: CoreGetters) {
    super(definition, sheetId, getters);
    this.dataSets = createDataSets(
      this.getters,
      definition.dataSets,
      sheetId,
      definition.dataSetsHaveTitle
    );
    this.labelRange = createRange(this.getters, sheetId, definition.labelRange);
  }

  static validateChartDefinition(
    validator: Validator,
    definition: ChoroplethChartDefinition
  ): CommandResult | CommandResult[] {
    return validator.checkValidations(definition, checkDataset, checkLabelRange);
  }

  static transformDefinition(
    definition: ChoroplethChartDefinition,
    executed: AddColumnsRowsCommand | RemoveColumnsRowsCommand
  ): ChoroplethChartDefinition {
    return transformChartDefinitionWithDataSetsWithZone(definition, executed);
  }

  static getDefinitionFromContextCreation(
    context: ChartCreationContext
  ): ChoroplethChartDefinition {
    return {
      background: context.background,
      dataSets: context.range ? context.range : [],
      dataSetsHaveTitle: false,
      title: context.title || "",
      type: "choropleth",
      labelRange: context.auxiliaryRange || undefined,
      aggregated: false,
    };
  }

  getDefinition(): ChartDefinition {
    return this.getDefinitionWithSpecificDataSets(this.dataSets, this.labelRange);
  }

  private getDefinitionWithSpecificDataSets(
    dataSets: DataSet[],
    labelRange: Range | undefined,
    targetSheetId?: UID
  ): ChoroplethChartDefinition {
    return {
      type: "choropleth",
      dataSetsHaveTitle: dataSets.length ? Boolean(dataSets[0].labelCell) : false,
      dataSets: dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, targetSheetId || this.sheetId)
      ),
      labelRange: labelRange
        ? this.getters.getRangeString(labelRange, targetSheetId || this.sheetId)
        : undefined,
      title: this.title,
    };
  }

  getDefinitionForExcel(): ExcelChartDefinition | undefined {
    throw new Error("Method not implemented.");
  }
  updateRanges(applyChange: ApplyRangeChange): ChoroplethChart {
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
    return new ChoroplethChart(definition, this.sheetId, this.getters);
  }
  copyForSheetId(sheetId: UID): ChoroplethChart {
    const dataSets = copyDataSetsWithNewSheetId(this.sheetId, sheetId, this.dataSets);
    const labelRange = copyLabelRangeWithNewSheetId(this.sheetId, sheetId, this.labelRange);
    const definition = this.getDefinitionWithSpecificDataSets(dataSets, labelRange, sheetId);
    return new ChoroplethChart(definition, sheetId, this.getters);
  }

  copyInSheetId(sheetId: UID): ChoroplethChart {
    const definition = this.getDefinitionWithSpecificDataSets(
      this.dataSets,
      this.labelRange,
      sheetId
    );
    return new ChoroplethChart(definition, sheetId, this.getters);
  }
  getContextCreation(): ChartCreationContext {
    return {
      title: this.title,
      range: this.dataSets.map((ds: DataSet) =>
        this.getters.getRangeString(ds.dataRange, this.sheetId)
      ),
      auxiliaryRange: this.labelRange
        ? this.getters.getRangeString(this.labelRange, this.sheetId)
        : undefined,
    };
  }
}

function getChoroplethConfiguration(
  chart: ChoroplethChart,
  labels: string[],
  localeFormat: LocaleFormat
): Required<ChartConfiguration> {
  const config = getDefaultChartJsRuntime(chart, labels, "black", localeFormat);

  config.options = { plugins: {} };
  Object.assign(config.options.plugins!.legend || {}, { display: false });

  //@ts-ignore
  config.options.showOutline = true;
  //@ts-ignore
  config.options.showGraticule = true;

  config.options.scales = {
    projection: {
      axis: "x",
      //@ts-ignore
      projection: "equalEarth",
    },
    color: {
      axis: "x",
      //@ts-ignore
      interpolate: "oranges",
    },
  };
  return config;
}

export function createChoroplethChartRuntime(
  chart: ChoroplethChart,
  getters: Getters
): ChartJSRuntime {
  const labelValues = getChartLabelValues(getters, chart.dataSets, chart.labelRange);
  const locale = getters.getLocale();
  const dataSetFormat = getChartDatasetFormat(getters, chart.dataSets);
  const localeFormat = { format: dataSetFormat, locale };
  let config = getChoroplethConfiguration(chart, labelValues.formattedValues, localeFormat);
  //@ts-ignore
  const countries = ChartGeo.topojson.feature(
    //@ts-ignore
    window.countries,
    //@ts-ignore
    window.countries.objects.countries
  ).features;
  const data = {
    //@ts-ignore
    labels: countries.map((d) =>
      d.properties.name === "Belgium" ? "Belgique" : d.properties.name
    ),
    datasets: [
      {
        label: "Countries",
        //@ts-ignore
        data: countries.map((d) => ({ feature: d, value: Math.random() })),
      },
    ],
  };
  config.data = data;

  config = {
    //@ts-ignore
    type: "choropleth",
    data: {
      labels: countries.map((d) =>
        d.properties.name === "Belgium" ? "Belgique" : d.properties.name
      ),
      datasets: [
        {
          label: "Countries",
          data: countries.map((d) => ({ feature: d, value: Math.random() })),
        },
      ],
    },
    options: {
      showOutline: true,
      showGraticule: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        projection: {
          axis: "x",
          //@ts-ignore
          projection: "equalEarth",
        },
        color: {
          axis: "x",
          //@ts-ignore
          interpolate: "oranges",
        },
      },
    },
  };

  // debugger;
  // const data: number[] = [];

  // config.data!.datasets!.push({
  //   data,
  //   minValue: Number(chart.sectionRule.rangeMin),
  //   value: needleValue,
  //   backgroundColor,
  // });

  return {
    //@ts-ignore
    chartJsConfig: config,
    background: BACKGROUND_CHART_COLOR,
  };
}
