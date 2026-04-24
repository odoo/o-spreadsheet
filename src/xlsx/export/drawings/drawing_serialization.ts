import { FIGURE_BORDER_WIDTH } from "../../../constants";
import { ExcelChartDefinition } from "../../../types/chart";
import { Image } from "../../../types/image";
import { HeaderIndex, UID } from "../../../types/misc";
import {
  ExcelSheetData,
  ExcelWorkbookData,
  FigureData,
  HeaderData,
  SheetData,
} from "../../../types/workbook_data";
import { XLSXExportFile, XMLAttributes, XMLString } from "../../../types/xlsx";
import {
  DRAWING_NS_A,
  DRAWING_NS_C,
  NAMESPACE,
  RELATIONSHIP_NSR,
  XLSX_RELATION_TYPE,
} from "../../constants";
import { IMAGE_MIMETYPE_TO_EXTENSION_MAPPING } from "../../conversion/conversion_maps";
import { serializeChart } from "../charts/chart_serialization";
import { XLSXInterned } from "../xlsx_interned";
import { XLSXRelsBuilder } from "../xlsx_rels";
import { convertDotValueToEMU } from "../xlsx_units";
import { createXMLFile, escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../xlsx_xml";

/**
 * Phase-2 serializer for `xl/drawings/drawingN.xml` and the chart/image
 * files anchored on a sheet. Drawings own the placement layer for charts
 * (which live in their own files under `xl/charts/`) and images (binary
 * blobs under `xl/media/`).
 *
 * For each figure on the sheet:
 *  - register a rel pointing to the chart/image (drawing-level rels file),
 *  - emit the chart XML / image blob,
 *  - record its rId in anchor order so the drawing XML can splice them in.
 *
 * If the sheet has any figure, also register a sheet-level rel pointing to
 * the drawing file. Returns the `<drawing r:id="..."/>` snippet to splice
 * into the sheet XML (or empty if no figures).
 */
export function serializeSheetDrawings(
  sheet: ExcelSheetData,
  sheetIndex: number,
  data: ExcelWorkbookData,
  rels: XLSXRelsBuilder,
  chartIds: XLSXInterned<UID>,
  imageIds: XLSXInterned<UID>
): { drawingNode: XMLString; files: XLSXExportFile[] } {
  const files: XLSXExportFile[] = [];
  if (!sheet.charts.length && !sheet.images.length) {
    return { drawingNode: escapeXml``, files };
  }

  const drawingRelsPath = `xl/drawings/_rels/drawing${sheetIndex}.xml.rels`;
  const drawingRelIds: string[] = [];

  for (const chart of sheet.charts) {
    const xlsxChartId = chartIds.intern(chart.id) + 1;
    const chartRelId = rels.add(drawingRelsPath, {
      target: `../charts/chart${xlsxChartId}.xml`,
      type: XLSX_RELATION_TYPE.chart,
    });
    drawingRelIds.push(chartRelId);
    files.push(
      createXMLFile(
        serializeChart(chart, String(sheetIndex), data),
        `xl/charts/chart${xlsxChartId}.xml`,
        "chart"
      )
    );
  }

  for (const image of sheet.images) {
    const mimeType = image.data.mimetype;
    if (mimeType === undefined) {
      continue;
    }
    const extension = IMAGE_MIMETYPE_TO_EXTENSION_MAPPING[mimeType];
    if (extension === undefined) {
      continue;
    }
    const xlsxImageId = imageIds.intern(image.id) + 1;
    const imageFileName = `image${xlsxImageId}.${extension}`;
    const imageRelId = rels.add(drawingRelsPath, {
      target: `../media/${imageFileName}`,
      type: XLSX_RELATION_TYPE.image,
    });
    drawingRelIds.push(imageRelId);
    files.push({ path: `xl/media/${imageFileName}`, imageSrc: image.data.path });
  }

  const figures = [...sheet.charts, ...sheet.images];
  const drawingRelId = rels.add(`xl/worksheets/_rels/sheet${sheetIndex}.xml.rels`, {
    target: `../drawings/drawing${sheetIndex}.xml`,
    type: XLSX_RELATION_TYPE.drawing,
  });
  files.push(
    createXMLFile(
      buildDrawingXml(drawingRelIds, sheet, figures, chartIds, imageIds),
      `xl/drawings/drawing${sheetIndex}.xml`,
      "drawing"
    )
  );
  return {
    drawingNode: escapeXml/*xml*/ `<drawing r:id="${drawingRelId}" />`,
    files,
  };
}

type FigurePosition = {
  to: { row: number; rowOff: number; col: number; colOff: number };
  from: { row: number; rowOff: number; col: number; colOff: number };
};

function buildDrawingXml(
  drawingRelIds: string[],
  sheet: SheetData,
  figures: FigureData<ExcelChartDefinition | Image>[],
  chartIds: XLSXInterned<UID>,
  imageIds: XLSXInterned<UID>
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
          buildChartAnchor(
            figure as FigureData<ExcelChartDefinition>,
            sheet,
            drawingRelIds[figureIndex],
            chartIds
          )
        );
        break;
      case "image":
        figuresNodes.push(
          buildImageAnchor(figure as FigureData<Image>, sheet, drawingRelIds[figureIndex], imageIds)
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
 * Compute top-left (`from`) and bottom-right (`to`) anchor coordinates of a
 * figure in EMU (English Metric Units), Excel's anchor unit.
 */
function computeFigurePosition(
  figure: FigureData<ExcelChartDefinition | Image>,
  sheet: SheetData
): FigurePosition {
  const { col, row, offset, width, height } = figure;
  const { x: offsetCol, y: offsetRow } = offset;

  const rows = Object.values(sheet.rows);
  const { index: rowFrom, offset: offsetRowFrom } = anchorCoordinate(rows, row, offsetRow);
  const { index: rowTo, offset: offsetRowTo } = anchorCoordinate(rows, row, offsetRow + height);

  const cols = Object.values(sheet.cols);
  const { index: colFrom, offset: offsetColFrom } = anchorCoordinate(cols, col, offsetCol);
  const { index: colTo, offset: offsetColTo } = anchorCoordinate(cols, col, offsetCol + width);

  return {
    from: { col: colFrom, colOff: offsetColFrom, row: rowFrom, rowOff: offsetRowFrom },
    to: { col: colTo, colOff: offsetColTo, row: rowTo, rowOff: offsetRowTo },
  };
}

/**
 * Resolve a single anchor dimension (col or row) to its index + EMU offset.
 * See https://docs.microsoft.com/en-us/windows/win32/vml/msdn-online-vml-units#other-units-of-measurement
 */
function anchorCoordinate(
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

function buildChartAnchor(
  figure: FigureData<ExcelChartDefinition>,
  sheet: SheetData,
  chartRelId: string,
  chartIds: XLSXInterned<UID>
): XMLString {
  const { from, to } = computeFigurePosition(figure, sheet);
  const chartId = chartIds.intern(figure.id) + 1;
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

function buildImageAnchor(
  figure: FigureData<Image>,
  sheet: SheetData,
  imageRelId: string,
  imageIds: XLSXInterned<UID>
): XMLString {
  const { from, to } = computeFigurePosition(figure, sheet);
  const imageId = imageIds.intern(figure.id) + 1;
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
