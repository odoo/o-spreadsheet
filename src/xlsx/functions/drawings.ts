import { FIGURE_BORDER_WIDTH } from "../../constants";
import { UuidGenerator } from "../../helpers";
import { Figure, HeaderIndex, SheetData } from "../../types";
import { Image } from "../../types/image";
import { XLSXStructure, XMLAttributes, XMLString } from "../../types/xlsx";
import { DRAWING_NS_A, DRAWING_NS_C, NAMESPACE, RELATIONSHIP_NSR } from "../constants";
import { convertChartId, convertDotValueToEMU, convertImageId } from "../helpers/content_helpers";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";
import { ExcelWorkbookData, HeaderData } from "./../../types/workbook_data";

type FigurePosition = {
  to: {
    row: number;
    rowOff: number;
    col: number;
    colOff: number;
  };
  from: {
    row: number;
    rowOff: number;
    col: number;
    colOff: number;
  };
};

export function createDrawing(
  drawingRelIds: string[],
  sheet: SheetData,
  figures: Figure[],
  construct: XLSXStructure
): XMLDocument {
  const namespaces: XMLAttributes = [
    ["xmlns:xdr", NAMESPACE.drawing],
    ["xmlns:r", RELATIONSHIP_NSR],
    ["xmlns:a", DRAWING_NS_A],
    ["xmlns:c", DRAWING_NS_C],
  ];
  const figuresNodes: XMLString[] = [];
  for (const [figureIndex, figure] of Object.entries(figures)) {
    switch (figure?.tag) {
      case "chart":
        const chartId = Object.keys(sheet.charts).find(
          (chartId) => sheet.charts[chartId].figureId === figure.id
        );
        if (!chartId) {
          throw new Error(`Chart with figureId ${figure.id} not found in sheet ${sheet.name}`);
        }
        figuresNodes.push(
          createChartDrawing(
            figure,
            convertChartId(chartId, construct),
            sheet,
            drawingRelIds[figureIndex]
          )
        );
        break;
      case "image":
        const imageId = Object.keys(sheet.images).find(
          (imageId) => sheet.images[imageId].figureId === figure.id
        );
        if (!imageId) {
          throw new Error(`Image with figureId ${figure.id} not found in sheet ${sheet.name}`);
        }
        figuresNodes.push(
          createImageDrawing(
            figure,
            convertImageId(imageId, construct),
            sheet,
            drawingRelIds[figureIndex]
          )
        );
        break;
    }
  }

  const xml = escapeXml/*xml*/ `
    <xdr:wsDr ${formatAttributes(namespaces)}>
      ${joinXmlNodes(figuresNodes)}
    </xdr:wsDr>
  `;
  return parseXML(xml);
}

/**
 *  Returns the coordinates of topLeft (from) and BottomRight (to) of the chart in English Metric Units (EMU)
 */
function convertFigureData(figure: Figure, sheet: SheetData): FigurePosition {
  const { col, row, offset, width, height } = figure;
  const { x: offsetCol, y: offsetRow } = offset;

  const rows = Object.values(sheet.rows);
  const { index: rowFrom, offset: offsetRowFrom } = figureCoordinates(rows, row, offsetRow);
  const { index: rowTo, offset: offsetRowTo } = figureCoordinates(rows, row, offsetRow + height);

  const cols = Object.values(sheet.cols);
  const { index: colFrom, offset: offsetColFrom } = figureCoordinates(cols, col, offsetCol);
  const { index: colTo, offset: offsetColTo } = figureCoordinates(cols, col, offsetCol + width);

  return {
    from: {
      col: colFrom,
      colOff: offsetColFrom,
      row: rowFrom,
      rowOff: offsetRowFrom,
    },
    to: {
      col: colTo,
      colOff: offsetColTo,
      row: rowTo,
      rowOff: offsetRowTo,
    },
  };
}

/** Returns figure coordinates in EMU for a specific header dimension
 *  See https://docs.microsoft.com/en-us/windows/win32/vml/msdn-online-vml-units#other-units-of-measurement
 */
function figureCoordinates(
  headers: HeaderData[],
  anchor: HeaderIndex,
  offset: number
): { index: number; offset: number } {
  let currentPosition = 0;
  for (const [headerIndex, header] of headers.slice(anchor).entries()) {
    if (currentPosition <= offset && offset < currentPosition + header.size!) {
      return {
        index: anchor + headerIndex,
        offset: convertDotValueToEMU(offset - currentPosition + FIGURE_BORDER_WIDTH),
      };
    } else if (headerIndex < headers.length - 1) {
      currentPosition += header.size!;
    }
  }
  return {
    index: headers.length - 1,
    offset: convertDotValueToEMU(offset - currentPosition + FIGURE_BORDER_WIDTH),
  };
}

function createChartDrawing(
  figure: Figure,
  chartId: number,
  sheet: SheetData,
  chartRelId: string
): XMLString {
  // position
  const { from, to } = convertFigureData(figure, sheet);
  const cNvPrAttrs: XMLAttributes = [
    ["id", chartId],
    ["name", `Chart ${chartId}`],
    ["title", "Chart"],
  ];
  return escapeXml/*xml*/ `
    <xdr:twoCellAnchor>
      <xdr:from>
        <xdr:col>${from.col}</xdr:col>
        <xdr:colOff>${from.colOff}</xdr:colOff>
        <xdr:row>${from.row}</xdr:row>
        <xdr:rowOff>${from.rowOff}</xdr:rowOff>
      </xdr:from>
      <xdr:to>
        <xdr:col>${to.col}</xdr:col>
        <xdr:colOff>${to.colOff}</xdr:colOff>
        <xdr:row>${to.row}</xdr:row>
        <xdr:rowOff>${to.rowOff}</xdr:rowOff>
      </xdr:to>
      <xdr:graphicFrame>
        <xdr:nvGraphicFramePr>
          <xdr:cNvPr ${formatAttributes(cNvPrAttrs)} />
          <xdr:cNvGraphicFramePr />
        </xdr:nvGraphicFramePr>
        <xdr:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
        </xdr:xfrm>
        <a:graphic>
          <a:graphicData uri="${DRAWING_NS_C}">
            <c:chart r:id="${chartRelId}" />
          </a:graphicData>
        </a:graphic>
      </xdr:graphicFrame>
      <xdr:clientData fLocksWithSheet="0"/>
    </xdr:twoCellAnchor>
  `;
}

function createImageDrawing(
  figure: Figure,
  imageId: number,
  sheet: SheetData,
  imageRelId: string
): XMLString {
  // position
  const { from, to } = convertFigureData(figure, sheet);
  const cNvPrAttrs: XMLAttributes = [
    ["id", imageId],
    ["name", `Image ${imageId}`],
    ["title", "Image"],
  ];
  const cx = convertDotValueToEMU(figure.width);
  const cy = convertDotValueToEMU(figure.height);

  return escapeXml/*xml*/ `
    <xdr:twoCellAnchor editAs="oneCell">
      <xdr:from>
        <xdr:col>${from.col}</xdr:col>
        <xdr:colOff>${from.colOff}</xdr:colOff>
        <xdr:row>${from.row}</xdr:row>
        <xdr:rowOff>${from.rowOff}</xdr:rowOff>
      </xdr:from>
      <xdr:to>
        <xdr:col>${to.col}</xdr:col>
        <xdr:colOff>${to.colOff}</xdr:colOff>
        <xdr:row>${to.row}</xdr:row>
        <xdr:rowOff>${to.rowOff}</xdr:rowOff>
      </xdr:to>
      <xdr:pic>
        <xdr:nvPicPr>
          <xdr:cNvPr ${formatAttributes(cNvPrAttrs)}/>
          <xdr:cNvPicPr preferRelativeResize="0"/>
        </xdr:nvPicPr>
        <xdr:blipFill>
          <a:blip cstate="print" r:embed="${imageRelId}"/>
          <a:stretch>
            <a:fillRect/>
          </a:stretch>
        </xdr:blipFill>
        <xdr:spPr>
          <a:xfrm>
            <a:ext cx="${cx}" cy="${cy}" />
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:noFill/>
        </xdr:spPr>
      </xdr:pic>
      <xdr:clientData fLocksWithSheet="0"/>
    </xdr:twoCellAnchor>
  `;
}

/** Take all of the carousels of the data, and split them into multiple figures (one for each chart) */
export function convertCarouselsToSeparateFigures(data: ExcelWorkbookData) {
  const uuidGenerator = new UuidGenerator();

  for (const sheet of data.sheets) {
    for (const carouselId in sheet.carousels) {
      const carouselFigure = sheet.figures.find((fig) => fig.id === carouselId);
      const carousel = sheet.carousels[carouselId].carousel;
      if (!carouselFigure || !carousel) {
        continue;
      }
      sheet.figures = sheet.figures.filter((fig) => fig.id !== carouselId);

      let offset = 0;
      for (const item of carousel.items) {
        if (item.type === "chart") {
          const chartData = sheet.charts[item.chartId];
          const newFigure = {
            ...carouselFigure,
            id: uuidGenerator.smallUuid(),
            tag: "chart",
            offset: { x: carouselFigure.offset.x + offset, y: carouselFigure.offset.y + offset },
          };
          offset += 10;
          chartData.figureId = newFigure.id;
          sheet.figures.push(newFigure);
        }
      }
    }
  }
}

/**
 * Some charts cannot be exported to excel and have been covnerted into images byt the chart UI plugin.
 * This helper transform those charts into image figures.
 */
export function convertImageChartsToImageFigures(data: ExcelWorkbookData) {
  for (const sheet of data.sheets) {
    for (const chartId of Object.keys(sheet.charts || {})) {
      const { chart, figureId } = sheet.charts[chartId];
      if (chart?.type === "image") {
        const figure = sheet.figures.find((f) => f.id === figureId);
        if (!figure) {
          throw new Error(`Figure with id ${figureId} not found in sheet ${sheet.name}`);
        }
        const image: Image = {
          mimetype: "image/png",
          path: chart.imgSrc,
          size: { width: figure.width, height: figure.height },
        };
        sheet.images[figureId] = { figureId, image };
        figure.tag = "image";
        delete sheet.charts[chartId];
      }
    }
  }
}
