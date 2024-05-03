import {
  getFullReference,
  isDefined,
  splitReference,
  toUnboundedZone,
  zoneToXc,
} from "../../helpers";
import { ChartDefinition, ExcelChartDefinition, FigureData } from "../../types";
import { ExcelImage } from "../../types/image";
import { XLSXFigure, XLSXWorksheet } from "../../types/xlsx";
import { convertEMUToDotValue, getColPosition, getRowPosition } from "../helpers/content_helpers";
import { XLSXFigureAnchor } from "./../../types/xlsx";
import { convertColor } from "./color_conversion";

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
  let x1: number, y1: number;
  let height: number, width: number;
  if (figure.anchors.length === 1) {
    // one cell anchor
    ({ x: x1, y: y1 } = getPositionFromAnchor(figure.anchors[0], sheetData));
    width = convertEMUToDotValue(figure.figureSize!.cx);
    height = convertEMUToDotValue(figure.figureSize!.cy);
  } else {
    ({ x: x1, y: y1 } = getPositionFromAnchor(figure.anchors[0], sheetData));
    const { x: x2, y: y2 } = getPositionFromAnchor(figure.anchors[1], sheetData);
    width = x2 - x1;
    height = y2 - y1;
  }
  const figureData = { id, x: x1, y: y1 };

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
  return "dataSets" in data;
}

function isImageData(data: ExcelChartDefinition | ExcelImage): data is ExcelImage {
  return "imageSrc" in data;
}

function convertChartData(chartData: ExcelChartDefinition): ChartDefinition | undefined {
  const dataSetsHaveTitle = chartData.dataSets[0].label !== undefined;
  const labelRange = chartData.labelRange
    ? convertExcelRangeToSheetXC(chartData.labelRange, dataSetsHaveTitle)
    : undefined;
  let dataSets = chartData.dataSets.map((data) =>
    convertExcelRangeToSheetXC(data.range, dataSetsHaveTitle)
  );
  // For doughnut charts, in chartJS first dataset = outer dataset, in excel first dataset = inner dataset
  if (chartData.type === "pie") {
    dataSets.reverse();
  }
  return {
    dataSets: dataSets.map((ds) => ({ dataRange: ds })),
    dataSetsHaveTitle,
    labelRange,
    title: {
      text: chartData.title || "",
    },
    type: chartData.type,
    background: convertColor({ rgb: chartData.backgroundColor }) || "#FFFFFF",
    legendPosition: chartData.legendPosition,
    stacked: chartData.stacked || false,
    aggregated: false,
    cumulative: chartData.cumulative || false,
    labelsAsText: false,
  };
}

function convertExcelRangeToSheetXC(range: string, dataSetsHaveTitle: boolean): string {
  let { sheetName, xc } = splitReference(range);
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
