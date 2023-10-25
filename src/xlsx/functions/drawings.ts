import { FIGURE_BORDER_WIDTH } from "../../constants";
import { HeaderData, SheetData } from "../../types";
import { ExcelChartDefinition } from "../../types/chart/chart";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { DRAWING_NS_A, DRAWING_NS_C, NAMESPACE, RELATIONSHIP_NSR } from "../constants";
import { convertChartId, convertDotValueToEMU, convertImageId } from "../helpers/content_helpers";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";
import { Image } from "./../../types/image";
import { FigureData } from "./../../types/workbook_data";

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
  figures: FigureData<ExcelChartDefinition | Image>[]
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
        figuresNodes.push(
          createChartDrawing(
            figure as FigureData<ExcelChartDefinition>,
            sheet,
            drawingRelIds[figureIndex]
          )
        );
        break;
      case "image":
        figuresNodes.push(
          createImageDrawing(figure as FigureData<Image>, sheet, drawingRelIds[figureIndex])
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
function convertFigureData(
  figure: FigureData<ExcelChartDefinition | Image>,
  sheet: SheetData
): FigurePosition {
  const { x, y, height, width } = figure;

  const cols = Object.values(sheet.cols);
  const rows = Object.values(sheet.rows);
  const { index: colFrom, offset: offsetColFrom } = figureCoordinates(cols, x);
  const { index: colTo, offset: offsetColTo } = figureCoordinates(cols, x + width);
  const { index: rowFrom, offset: offsetRowFrom } = figureCoordinates(rows, y);
  const { index: rowTo, offset: offsetRowTo } = figureCoordinates(rows, y + height);

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
  position: number
): { index: number; offset: number } {
  let currentPosition = 0;
  for (const [headerIndex, header] of headers.entries()) {
    if (currentPosition <= position && position < currentPosition + header.size!) {
      return {
        index: headerIndex,
        offset: convertDotValueToEMU(position - currentPosition + FIGURE_BORDER_WIDTH),
      };
    } else if (headerIndex < headers.length - 1) {
      currentPosition += header.size!;
    }
  }
  return {
    index: headers.length - 1,
    offset: convertDotValueToEMU(position - currentPosition + FIGURE_BORDER_WIDTH),
  };
}

function createChartDrawing(
  figure: FigureData<ExcelChartDefinition>,
  sheet: SheetData,
  chartRelId: string
): XMLString {
  // position
  const { from, to } = convertFigureData(figure, sheet);
  const chartId = convertChartId(figure.id);
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
  figure: FigureData<Image>,
  sheet: SheetData,
  imageRelId: string
): XMLString {
  // position
  const { from, to } = convertFigureData(figure, sheet);
  const imageId = convertImageId(figure.id);
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
