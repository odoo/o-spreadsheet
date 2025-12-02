import { DEFAULT_WINDOW_SIZE, FIGURE_BORDER_WIDTH } from "../../constants";
import { getFullReference, splitReference } from "../../helpers";
import { isDefined } from "../../helpers/misc";
import { toUnboundedZone, zoneToXc } from "../../helpers/zones";
import { chartRegistry } from "../../registries/chart_registry";
import {
  ChartCreationContext,
  ChartDefinition,
  DataSetStyling,
  ExcelChartDefinition,
  ExcelChartTrendConfiguration,
  TrendConfiguration,
} from "../../types/chart";
import { AnchorOffset } from "../../types/figure";
import { ExcelImage } from "../../types/image";
import { HeaderIndex, PixelPosition } from "../../types/misc";
import { FigureData } from "../../types/workbook_data";
import { XLSXFigure, XLSXFigureAnchor, XLSXWorksheet } from "../../types/xlsx";
import { convertEMUToDotValue, getColPosition, getRowPosition } from "../helpers/content_helpers";
import { convertColor } from "./color_conversion";
import { EXCEL_TO_SPREADSHEET_TRENDLINE_TYPE_MAPPING } from "./conversion_maps";

export function convertFigures(sheetData: XLSXWorksheet): FigureData<any>[] {
  let id = 1;
  return sheetData.figures
    .map((figure) => convertFigure(figure, (id++).toString(), sheetData))
    .filter(isDefined);
}

function convertFigure(
  figure: XLSXFigure,
  id: string,
  sheetData: XLSXWorksheet
): FigureData<any> | undefined {
  let col: HeaderIndex;
  let row: HeaderIndex;
  let offset: PixelPosition;
  let height: number, width: number;
  if (figure.anchors.length === 1) {
    // one cell anchor
    ({ col, row, offset } = convertAnchor(figure.anchors[0]));
    width = convertEMUToDotValue(figure.figureSize!.cx);
    height = convertEMUToDotValue(figure.figureSize!.cy);
  } else {
    ({ col, row, offset } = convertAnchor(figure.anchors[0]));
    const { x: x1, y: y1 } = getPositionFromAnchor(figure.anchors[0], sheetData);
    const { x: x2, y: y2 } = getPositionFromAnchor(figure.anchors[1], sheetData);
    width = x2 - x1;
    height = y2 - y1;
  }
  const figureData = { id, col, row, offset };

  if (isChartData(figure.data)) {
    return {
      ...figureData,
      width,
      height,
      tag: "chart",
      data: convertChartData(figure.data),
    };
  } else if (isImageData(figure.data)) {
    return {
      ...figureData,
      width: convertEMUToDotValue(figure.data.size.cx),
      height: convertEMUToDotValue(figure.data.size.cy),
      tag: "image",
      data: {
        path: figure.data.imageSrc,
        mimetype: figure.data.mimetype,
      },
    };
  }
  return undefined;
}

function isChartData(data: ExcelChartDefinition | ExcelImage): data is ExcelChartDefinition {
  return "dataSets" in data && data.dataSets.length > 0;
}

function isImageData(data: ExcelChartDefinition | ExcelImage): data is ExcelImage {
  return "imageSrc" in data;
}

function convertChartData(chartData: ExcelChartDefinition): ChartDefinition | undefined {
  const dataSetsHaveTitle = chartData.dataSets.some((ds) => "reference" in (ds.label ?? {}));
  const dataSetsStyling: DataSetStyling = {};
  const labelRange = chartData.labelRange
    ? convertExcelRangeToSheetXC(chartData.labelRange, dataSetsHaveTitle)
    : undefined;
  const dataSets = chartData.dataSets.map((data, i) => {
    let label: string | undefined = undefined;
    if (data.label && "text" in data.label) {
      label = data.label.text;
    }
    const dataSetId = i.toString();
    dataSetsStyling[dataSetId] = {
      label,
      backgroundColor: data.backgroundColor,
      trend: convertExcelTrendline(data.trend),
    };
    return {
      id: dataSetId,
      dataRange: convertExcelRangeToSheetXC(data.range, dataSetsHaveTitle),
    };
  });
  // For doughnut charts, in chartJS first dataset = outer dataset, in excel first dataset = inner dataset
  if (chartData.type === "pie") {
    dataSets.reverse();
  }
  const creationContext: ChartCreationContext = {
    dataSource: { dataSets },
    dataSets: dataSetsStyling,
    dataSetsHaveTitle,
    auxiliaryRange: labelRange,
    title: chartData.title ?? { text: "" },
    background: convertColor({ rgb: chartData.backgroundColor }) || "#FFFFFF",
    legendPosition: chartData.legendPosition,
    stacked: chartData.stacked || false,
    aggregated: false,
    cumulative: chartData.cumulative || false,
    labelsAsText: false,
    horizontal: chartData.horizontal,
    isDoughnut: chartData.isDoughnut,
    pieHolePercentage: chartData.pieHolePercentage,
  };
  try {
    const ChartClass = chartRegistry.get(chartData.type);
    return ChartClass.getChartDefinitionFromContextCreation(creationContext);
  } catch (e) {
    return undefined;
  }
}

function convertExcelRangeToSheetXC(range: string, dataSetsHaveTitle: boolean): string {
  const { sheetName, xc } = splitReference(range);
  let zone = toUnboundedZone(xc);
  if (dataSetsHaveTitle && zone.bottom !== undefined && zone.right !== undefined) {
    const height = zone.bottom - zone.top + 1;
    const width = zone.right - zone.left + 1;
    if (height === 1) {
      zone = { ...zone, left: zone.left - 1 };
    } else if (width === 1) {
      zone = { ...zone, top: zone.top - 1 };
    }
  }
  const dataXC = zoneToXc(zone);
  return getFullReference(sheetName, dataXC);
}

function convertExcelTrendline(
  trend: ExcelChartTrendConfiguration | undefined
): TrendConfiguration | undefined {
  if (!trend || !trend.type) {
    return undefined;
  }
  return {
    type:
      trend.type === "linear"
        ? "polynomial"
        : EXCEL_TO_SPREADSHEET_TRENDLINE_TYPE_MAPPING[trend.type],
    order: trend.type === "linear" ? 1 : trend.order,
    color: trend.color,
    window: trend.window || DEFAULT_WINDOW_SIZE,
    display: true,
  };
}

function convertAnchor(XLSXanchor: XLSXFigureAnchor): AnchorOffset {
  const offset = {
    x: convertEMUToDotValue(XLSXanchor.colOffset) - FIGURE_BORDER_WIDTH,
    y: convertEMUToDotValue(XLSXanchor.rowOffset) - FIGURE_BORDER_WIDTH,
  };
  return { col: XLSXanchor.col, row: XLSXanchor.row, offset };
}

function getPositionFromAnchor(
  anchor: XLSXFigureAnchor,
  sheetData: XLSXWorksheet
): {
  x: number;
  y: number;
} {
  return {
    x: getColPosition(anchor.col, sheetData) + convertEMUToDotValue(anchor.colOffset),
    y: getRowPosition(anchor.row, sheetData) + convertEMUToDotValue(anchor.rowOffset),
  };
}
