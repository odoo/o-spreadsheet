import { DEFAULT_CHART_FONT_SIZE } from "../../constants";
import { ColorGenerator, largeMax, range } from "../../helpers";
import { Color, ExcelWorkbookData, FigureData } from "../../types";
import { ExcelChartDataset, ExcelChartDefinition, TitleDesign } from "../../types/chart/chart";
import { XMLAttributes, XMLString, XlsxHexColor } from "../../types/xlsx";
import { DRAWING_NS_A, DRAWING_NS_C, RELATIONSHIP_NSR } from "../constants";
import { toXlsxHexColor } from "../helpers/colors";
import { convertDotValueToEMU, getRangeSize } from "../helpers/content_helpers";
import { escapeXml, formatAttributes, joinXmlNodes, parseXML } from "../helpers/xml_helpers";

type ElementPosition = "t" | "b" | "l" | "r";

type LineStyle =
  | "dash"
  | "dashDot"
  | "dot"
  | "lgDash"
  | "lgDashDot"
  | "lgDashDotDot"
  | "solid"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot"
  | "sysDot";

interface LineAttributes {
  color: Color;
  width?: number;
  style?: LineStyle;
}

/**
 * Each axis present inside a graph needs to be identified by an unsigned integer
 * The value does not matter, it can be hardcoded.
 */
const catAxId = 17781237;
const secondaryCatAxId = 17781238;
const valAxId = 88853993;
const secondaryValAxId = 88853994;

export function createChart(
  chart: FigureData<ExcelChartDefinition>,
  chartSheetIndex: string,
  data: ExcelWorkbookData
): XMLDocument {
  const namespaces: XMLAttributes = [
    ["xmlns:r", RELATIONSHIP_NSR],
    ["xmlns:a", DRAWING_NS_A],
    ["xmlns:c", DRAWING_NS_C],
  ];

  const chartShapeProperty = shapeProperty({
    backgroundColor: chart.data.backgroundColor,
    line: { color: "000000" },
  });
  // <manualLayout/> to manually position the chart in the figure container
  let title = escapeXml``;
  if (chart.data.title?.text) {
    const color = chart.data.title.color
      ? toXlsxHexColor(chart.data.title.color)
      : chart.data.fontColor;
    title = escapeXml/*xml*/ `
      <c:title>
        ${insertText(chart.data.title.text, color, DEFAULT_CHART_FONT_SIZE, chart.data.title)}
        <c:overlay val="0" />
      </c:title>
    `;
  }

  // switch on chart type
  let plot = escapeXml``;
  switch (chart.data.type) {
    case "bar":
      plot = addBarChart(chart.data);
      break;
    case "combo":
      plot = addComboChart(chart.data);
      break;
    case "line":
      plot = addLineChart(chart.data);
      break;
    case "scatter":
      plot = addScatterChart(chart.data);
      break;
    case "pie":
      plot = addDoughnutChart(chart.data, chartSheetIndex, data, { holeSize: 0 });
      break;
    case "radar":
      plot = addRadarChart(chart.data);
  }
  let position: ElementPosition = "t";
  switch (chart.data.legendPosition) {
    case "bottom":
      position = "b";
      break;
    case "left":
      position = "l";
      break;
    case "right":
      position = "r";
      break;
    case "top":
      position = "t";
      break;
  }
  const fontColor = chart.data.fontColor;
  const xml = escapeXml/*xml*/ `
    <c:chartSpace ${formatAttributes(namespaces)}>
      <c:roundedCorners val="0" />
      <!-- <manualLayout/> to manually position the chart in the figure container -->
      ${chartShapeProperty}
      <c:chart>
        ${title}
        <c:autoTitleDeleted val="0" />
        <c:plotArea>
          <!-- how the chart element is placed on the chart -->
          <c:layout />
          ${plot}
          ${shapeProperty({ backgroundColor: chart.data.backgroundColor })}
        </c:plotArea>
        ${addLegend(position, fontColor)}
      </c:chart>
    </c:chartSpace>
  `;
  return parseXML(xml);
}

function shapeProperty(params: { backgroundColor?: string; line?: LineAttributes }): XMLString {
  return escapeXml/*xml*/ `
    <c:spPr>
      ${params.backgroundColor ? solidFill(params.backgroundColor) : ""}
      ${params.line ? lineAttributes(params.line) : ""}
    </c:spPr>
  `;
}

function solidFill(color: XlsxHexColor): XMLString {
  return escapeXml/*xml*/ `
    <a:solidFill>
      <a:srgbClr val="${color}"/>
    </a:solidFill>
  `;
}

function lineAttributes(params: LineAttributes): XMLString {
  const attrs: XMLAttributes = [["cmpd", "sng"]];
  if (params.width) {
    attrs.push(["w", convertDotValueToEMU(params.width)]);
  }
  const lineStyle = params.style ? escapeXml/*xml*/ `<a:prstDash val="${params.style}"/>` : "";
  return escapeXml/*xml*/ `
    <a:ln ${formatAttributes(attrs)}>
      ${solidFill(params.color)}
      ${lineStyle}
    </a:ln>
  `;
}

function insertText(
  text: string,
  fontColor: XlsxHexColor = "000000",
  fontsize: number = DEFAULT_CHART_FONT_SIZE,
  style: { bold?: boolean; italic?: boolean } = {}
): XMLString {
  return escapeXml/*xml*/ `
    <c:tx>
      <c:rich>
        <a:bodyPr />
        <a:lstStyle />
        <a:p>
          <a:pPr lvl="0">
            <a:defRPr b="${style?.bold ? 1 : 0}" i="${style?.italic ? 1 : 0}">
              ${solidFill(fontColor)}
              <a:latin typeface="+mn-lt"/>
            </a:defRPr>
          </a:pPr>
          <a:r> <!-- Runs -->
            <a:rPr b="${style?.bold ? 1 : 0}" i="${style?.italic ? 1 : 0}" sz="${fontsize * 100}"/>
            <a:t>${text}</a:t>
          </a:r>
        </a:p>
      </c:rich>
    </c:tx>
  `;
}

function insertTextProperties(
  fontsize: number = 12,
  fontColor: XlsxHexColor = "000000",
  bold = false,
  italic = false
): XMLString {
  const defPropertiesAttributes: XMLAttributes = [
    ["b", bold ? "1" : "0"],
    ["i", italic ? "1" : "0"],
    ["sz", fontsize * 100],
  ];
  return escapeXml/*xml*/ `
    <c:txPr>
      <a:bodyPr/>
      <a:lstStyle/>
      <a:p>
        <a:pPr lvl="0">
          <a:defRPr ${formatAttributes(defPropertiesAttributes)}>
            ${solidFill(fontColor)}
            <a:latin typeface="+mn-lt"/>
          </a:defRPr>
        </a:pPr>
      </a:p>
    </c:txPr>
  `;
}

function extractDataSetLabel(label: ExcelChartDataset["label"]): XMLString {
  if (!label) {
    return escapeXml/*xml*/ ``;
  }
  if ("text" in label && label.text) {
    return escapeXml/*xml*/ `
      <c:tx><c:v>${label.text!}</c:v></c:tx>
    `;
  }
  if ("reference" in label && label.reference) {
    return escapeXml/*xml*/ `
      <c:tx>
      ${stringRef(label.reference)}
      </c:tx>
    `;
  }
  return escapeXml/*xml*/ ``;
}

function addBarChart(chart: ExcelChartDefinition): XMLString {
  // gapWitdh and overlap that define the space between clusters (in %) and the overlap between datasets (from -100: completely scattered to 100, completely overlapped)
  // see gapWidth : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_gapWidth_topic_ID0EFVEQB.html#topic_ID0EFVEQB
  // see overlap : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_overlap_topic_ID0ELYQQB.html#topic_ID0ELYQQB
  //
  // overlap and gapWitdh seems to be by default at -20 and 20 in chart.js.
  // See https://www.chartjs.org/docs/latest/charts/bar.html and https://www.chartjs.org/docs/latest/charts/bar.html#barpercentage-vs-categorypercentage
  const dataSetsColors = chart.dataSets.map((ds) => ds.backgroundColor ?? "");
  const colors = new ColorGenerator(chart.dataSets.length, dataSetsColors);
  const leftDataSetsNodes: XMLString[] = [];
  const rightDataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toXlsxHexColor(colors.next());
    const dataShapeProperty = shapeProperty({
      backgroundColor: color,
      line: { color },
    });

    const dataSetNode = escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        ${extractDataSetLabel(dataset.label)}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml/*xml*/ `<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `;
    if (dataset.rightYAxis) {
      rightDataSetsNodes.push(dataSetNode);
    } else {
      leftDataSetsNodes.push(dataSetNode);
    }
  }

  const grouping = chart.stacked ? "stacked" : "clustered";
  const overlap = chart.stacked ? 100 : -20;
  return escapeXml/*xml*/ `
  ${
    leftDataSetsNodes.length
      ? escapeXml/*xml*/ `
        <c:barChart>
          <c:barDir val="col"/>
          <c:grouping val="${grouping}"/>
          <c:overlap val="${overlap}"/>
          <c:gapWidth val="70"/>
          <!-- each data marker in the series does not have a different color -->
          <c:varyColors val="0"/>
          ${joinXmlNodes(leftDataSetsNodes)}
          <c:axId val="${catAxId}" />
          <c:axId val="${valAxId}" />
        </c:barChart>
        ${addAx("b", "c:catAx", catAxId, valAxId, chart.axesDesign?.x?.title, chart.fontColor)}
        ${addAx("l", "c:valAx", valAxId, catAxId, chart.axesDesign?.y?.title, chart.fontColor)}
      `
      : ""
  }
  ${
    rightDataSetsNodes.length
      ? escapeXml/*xml*/ `
        <c:barChart>
          <c:barDir val="col"/>
          <c:grouping val="${grouping}"/>
          <c:overlap val="${overlap}"/>
          <c:gapWidth val="70"/>
          <!-- each data marker in the series does not have a different color -->
          <c:varyColors val="0"/>
          ${joinXmlNodes(rightDataSetsNodes)}
          <c:axId val="${catAxId + 1}" />
          <c:axId val="${valAxId + 1}" />
        </c:barChart>
        ${addAx(
          "b",
          "c:catAx",
          catAxId + 1,
          valAxId + 1,
          chart.axesDesign?.x?.title,
          chart.fontColor,
          leftDataSetsNodes.length ? 1 : 0
        )}
        ${addAx(
          "r",
          "c:valAx",
          valAxId + 1,
          catAxId + 1,
          chart.axesDesign?.y1?.title,
          chart.fontColor
        )}
      `
      : ""
  }`;
}

function addComboChart(chart: ExcelChartDefinition): XMLString {
  // gapWitdh and overlap that define the space between clusters (in %) and the overlap between datasets (from -100: completely scattered to 100, completely overlapped)
  // see gapWidth : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_gapWidth_topic_ID0EFVEQB.html#topic_ID0EFVEQB
  // see overlap : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_overlap_topic_ID0ELYQQB.html#topic_ID0ELYQQB
  //
  // overlap and gapWitdh seems to be by default at -20 and 20 in chart.js.
  // See https://www.chartjs.org/docs/latest/charts/bar.html and https://www.chartjs.org/docs/latest/charts/bar.html#barpercentage-vs-categorypercentage
  const dataSets = chart.dataSets;
  const dataSetsColors = dataSets.map((ds) => ds.backgroundColor ?? "");
  const colors = new ColorGenerator(dataSets.length, dataSetsColors);
  let dataSet = dataSets[0];
  const firstColor = toXlsxHexColor(colors.next());
  const useRightAxisForBarSerie = dataSet.rightYAxis ?? false;
  const barDataSetNode: XMLString = escapeXml/*xml*/ `
    <c:ser>
      <c:idx val="0"/>
      <c:order val="0"/>
      ${extractDataSetLabel(dataSet.label)}
      ${shapeProperty({
        backgroundColor: firstColor,
        line: { color: firstColor },
      })}
      ${chart.labelRange ? escapeXml/*xml*/ `<c:cat>${stringRef(chart.labelRange)}</c:cat>` : ""}
      <!-- x-coordinate values -->
      <c:val>
        ${numberRef(dataSet.range)}
      </c:val>
    </c:ser>
  `;
  const leftDataSetsNodes: XMLString[] = [];
  const rightDataSetsNodes: XMLString[] = [];
  for (let dsIndex = 1; dsIndex < dataSets.length; dsIndex++) {
    dataSet = dataSets[dsIndex];
    const color = toXlsxHexColor(colors.next());
    const dataShapeProperty = shapeProperty({
      backgroundColor: color,
      line: { color },
    });

    const dataSetNode = escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
          ${dataShapeProperty}
        </c:marker>
        ${extractDataSetLabel(dataSet.label)}
        ${dataShapeProperty}
        ${chart.labelRange ? escapeXml`<c:cat>${stringRef(chart.labelRange)}</c:cat>` : ""}
        <!-- x-coordinate values -->
        <c:val>
          ${numberRef(dataSet.range)}
        </c:val>
      </c:ser>
    `;
    if (dataSet.rightYAxis) {
      rightDataSetsNodes.push(dataSetNode);
    } else {
      leftDataSetsNodes.push(dataSetNode);
    }
  }

  const overlap = chart.stacked ? 100 : -20;
  return escapeXml/*xml*/ `
    <c:barChart>
      <c:barDir val="col"/>
      <c:grouping val="clustered"/>
      <c:overlap val="${overlap}"/>
      <c:gapWidth val="70"/>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${barDataSetNode}
      <c:axId val="${useRightAxisForBarSerie ? secondaryCatAxId : catAxId}" />
      <c:axId val="${useRightAxisForBarSerie ? secondaryValAxId : valAxId}" />
    </c:barChart>
    ${
      leftDataSetsNodes.length
        ? escapeXml/*xml*/ `
        <c:lineChart>
          <c:grouping val="standard"/>
          <!-- each data marker in the series does not have a different color -->
          <c:varyColors val="0"/>
          ${joinXmlNodes(leftDataSetsNodes)}
          <c:axId val="${catAxId}" />
          <c:axId val="${valAxId}" />
        </c:lineChart>
      `
        : ""
    }
    ${
      rightDataSetsNodes.length
        ? escapeXml/*xml*/ `
        <c:lineChart>
          <c:grouping val="standard"/>
          <!-- each data marker in the series does not have a different color -->
          <c:varyColors val="0"/>
          ${joinXmlNodes(rightDataSetsNodes)}
          <c:axId val="${secondaryCatAxId}" />
          <c:axId val="${secondaryValAxId}" />
        </c:lineChart>
      `
        : ""
    }
    ${
      !useRightAxisForBarSerie || leftDataSetsNodes.length
        ? escapeXml/*xml*/ `
        ${addAx(
          "b",
          "c:catAx",
          catAxId,
          valAxId,
          chart.axesDesign?.x?.title,
          chart.fontColor,
          leftDataSetsNodes.length ? 1 : 0
        )}
        ${addAx("l", "c:valAx", valAxId, catAxId, chart.axesDesign?.y?.title, chart.fontColor)}
      `
        : ""
    }
    ${
      useRightAxisForBarSerie || rightDataSetsNodes.length
        ? escapeXml/*xml*/ `
        ${addAx(
          "b",
          "c:catAx",
          secondaryCatAxId,
          secondaryValAxId,
          chart.axesDesign?.x?.title,
          chart.fontColor,
          leftDataSetsNodes.length || !useRightAxisForBarSerie ? 1 : 0
        )}
        ${addAx(
          "r",
          "c:valAx",
          secondaryValAxId,
          secondaryCatAxId,
          chart.axesDesign?.y1?.title,
          chart.fontColor
        )}
      `
        : ""
    }
  `;
}

function addLineChart(chart: ExcelChartDefinition): XMLString {
  const dataSetsColors = chart.dataSets.map((ds) => ds.backgroundColor ?? "");
  const colors = new ColorGenerator(chart.dataSets.length, dataSetsColors);
  const leftDataSetsNodes: XMLString[] = [];
  const rightDataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toXlsxHexColor(colors.next());
    const dataShapeProperty = shapeProperty({
      line: {
        width: 2.5,
        style: "solid",
        color,
      },
    });

    const dataSetNode = escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
          ${shapeProperty({ backgroundColor: color, line: { color } })}
        </c:marker>
        ${extractDataSetLabel(dataset.label)}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml`<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `;
    if (dataset.rightYAxis) {
      rightDataSetsNodes.push(dataSetNode);
    } else {
      leftDataSetsNodes.push(dataSetNode);
    }
  }

  const grouping = chart.stacked ? "stacked" : "standard";

  return escapeXml/*xml*/ `
    ${
      leftDataSetsNodes.length
        ? escapeXml/*xml*/ `
        <c:lineChart>
          <c:grouping val="${grouping}"/>
          <!-- each data marker in the series does not have a different color -->
          <c:varyColors val="0"/>
          ${joinXmlNodes(leftDataSetsNodes)}
          <c:axId val="${catAxId}" />
          <c:axId val="${valAxId}" />
        </c:lineChart>
        ${addAx("b", "c:catAx", catAxId, valAxId, chart.axesDesign?.x?.title, chart.fontColor)}
        ${addAx("l", "c:valAx", valAxId, catAxId, chart.axesDesign?.y?.title, chart.fontColor)}
      `
        : ""
    }
    ${
      rightDataSetsNodes.length
        ? escapeXml/*xml*/ `
        <c:lineChart>
          <c:grouping val="${grouping}"/>
          <!-- each data marker in the series does not have a different color -->
          <c:varyColors val="0"/>
          ${joinXmlNodes(rightDataSetsNodes)}
          <c:axId val="${catAxId + 1}" />
          <c:axId val="${valAxId + 1}" />
        </c:lineChart>
        ${addAx(
          "b",
          "c:catAx",
          catAxId + 1,
          valAxId + 1,
          chart.axesDesign?.x?.title,
          chart.fontColor,
          leftDataSetsNodes.length ? 1 : 0
        )}
        ${addAx(
          "r",
          "c:valAx",
          valAxId + 1,
          catAxId + 1,
          chart.axesDesign?.y1?.title,
          chart.fontColor
        )}
      `
        : ""
    }
  `;
}

function addScatterChart(chart: ExcelChartDefinition): XMLString {
  const dataSetsColors = chart.dataSets.map((ds) => ds.backgroundColor ?? "");
  const colors = new ColorGenerator(chart.dataSets.length, dataSetsColors);
  const leftDataSetsNodes: XMLString[] = [];
  const rightDataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toXlsxHexColor(colors.next());
    const dataSetNode = escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:spPr>
          <a:ln w="19050" cap="rnd">
            <a:noFill/>
            <a:round/>
          </a:ln>
          <a:effectLst/>
        </c:spPr>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
          ${shapeProperty({ backgroundColor: color, line: { color } })}
        </c:marker>
        ${extractDataSetLabel(dataset.label)}
        ${
          chart.labelRange
            ? escapeXml/*xml*/ `<c:xVal> <!-- x-coordinate values -->
              ${numberRef(chart.labelRange)}
            </c:xVal>`
            : ""
        }
        <c:yVal> <!-- y-coordinate values -->
          ${numberRef(dataset.range)}
        </c:yVal>
      </c:ser>
    `;
    if (dataset.rightYAxis) {
      rightDataSetsNodes.push(dataSetNode);
    } else {
      leftDataSetsNodes.push(dataSetNode);
    }
  }
  return escapeXml/*xml*/ `
  ${
    leftDataSetsNodes.length
      ? escapeXml/*xml*/ `
      <c:scatterChart>
        <!-- each data marker in the series does not have a different color -->
        <c:varyColors val="0"/>
        <c:scatterStyle val="lineMarker"/>
        ${joinXmlNodes(leftDataSetsNodes)}
        <c:axId val="${catAxId}" />
        <c:axId val="${valAxId}" />
      </c:scatterChart>
      ${addAx("b", "c:valAx", catAxId, valAxId, chart.axesDesign?.x?.title, chart.fontColor)}
      ${addAx("l", "c:valAx", valAxId, catAxId, chart.axesDesign?.y?.title, chart.fontColor)}
    `
      : ""
  }
  ${
    rightDataSetsNodes.length
      ? escapeXml/*xml*/ `
      <c:scatterChart>
        <!-- each data marker in the series does not have a different color -->
        <c:varyColors val="0"/>
        <c:scatterStyle val="lineMarker"/>
        ${joinXmlNodes(rightDataSetsNodes)}
        <c:axId val="${catAxId + 1}" />
        <c:axId val="${valAxId + 1}" />
      </c:scatterChart>
      ${addAx(
        "b",
        "c:valAx",
        catAxId + 1,
        valAxId + 1,
        chart.axesDesign?.x?.title,
        chart.fontColor,
        leftDataSetsNodes.length ? 1 : 0
      )}
      ${addAx(
        "r",
        "c:valAx",
        valAxId + 1,
        catAxId + 1,
        chart.axesDesign?.y1?.title,
        chart.fontColor
      )}
    `
      : ""
  }`;
}

function addRadarChart(chart: ExcelChartDefinition): XMLString {
  const dataSetsColors = chart.dataSets.map((ds) => ds.backgroundColor ?? "");
  const colors = new ColorGenerator(chart.dataSets.length, dataSetsColors);
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toXlsxHexColor(colors.next());
    const dataShapeProperty = shapeProperty({
      line: {
        width: 2.5,
        style: "solid",
        color,
      },
    });

    const dataSetNode = escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
          ${shapeProperty({ backgroundColor: color, line: { color } })}
        </c:marker>
        ${extractDataSetLabel(dataset.label)}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml`<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `;
    dataSetsNodes.push(dataSetNode);
  }

  return escapeXml/*xml*/ `
    ${escapeXml/*xml*/ `
        <c:radarChart>
        <c:radarStyle val="marker"/>
          <c:varyColors val="0"/>
          ${joinXmlNodes(dataSetsNodes)}
          <c:axId val="${catAxId}" />
          <c:axId val="${valAxId}" />
        </c:radarChart>
        ${addAx("b", "c:catAx", catAxId, valAxId, chart.axesDesign?.x?.title, chart.fontColor)}
        ${addAx("l", "c:valAx", valAxId, catAxId, chart.axesDesign?.y?.title, chart.fontColor)}
      `}
  `;
}

function addDoughnutChart(
  chart: ExcelChartDefinition,
  chartSheetIndex: string,
  data: ExcelWorkbookData,
  { holeSize } = { holeSize: 50 }
) {
  const maxLength = largeMax(
    chart.dataSets.map((ds) => getRangeSize(ds.range, chartSheetIndex, data))
  );
  const colors = new ColorGenerator(maxLength);
  const doughnutColors: string[] = range(0, maxLength).map(() => toXlsxHexColor(colors.next()));

  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets).reverse()) {
    //dataset slice labels
    const dsSize = getRangeSize(dataset.range, chartSheetIndex, data);
    const dataPoints: XMLString[] = [];
    for (const index of range(0, dsSize)) {
      const pointShapeProperty = shapeProperty({
        backgroundColor: doughnutColors[index],
        line: { color: "FFFFFF", width: 1.5 },
      });
      dataPoints.push(escapeXml/*xml*/ `
        <c:dPt>
          <c:idx val="${index}"/>
          ${pointShapeProperty}
        </c:dPt>
      `);
    }

    dataSetsNodes.push(escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        ${extractDataSetLabel(dataset.label)}
        ${joinXmlNodes(dataPoints)}
        ${insertDataLabels({ showLeaderLines: true })}
        ${chart.labelRange ? escapeXml`<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""}
        <c:val>
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `);
  }
  return escapeXml/*xml*/ `
    <c:doughnutChart>
      <c:varyColors val="1" />
      <c:holeSize val="${holeSize}" />
      ${insertDataLabels()}
      ${joinXmlNodes(dataSetsNodes)}
    </c:doughnutChart>
  `;
}

function insertDataLabels({ showLeaderLines } = { showLeaderLines: false }): XMLString {
  return escapeXml/*xml*/ `
    <dLbls>
      <c:showLegendKey val="0"/>
      <c:showVal val="0"/>
      <c:showCatName val="0"/>
      <c:showSerName val="0"/>
      <c:showPercent val="0"/>
      <c:showBubbleSize val="0"/>
      <c:showLeaderLines val="${showLeaderLines ? "1" : "0"}"/>
    </dLbls>
  `;
}

function addAx(
  position: ElementPosition,
  axisName: "c:catAx" | "c:valAx",
  axId: number,
  crossAxId: number,
  title: TitleDesign | undefined,
  defaultFontColor: XlsxHexColor,
  deleteAxis: number = 0
): XMLString {
  // Each Axis present inside a graph needs to be identified by an unsigned integer in order to be referenced by its crossAxis.
  // I.e. x-axis, will reference y-axis and vice-versa.
  const color = title?.color ? toXlsxHexColor(title.color) : defaultFontColor;
  return escapeXml/*xml*/ `
    <${axisName}>
      <c:axId val="${axId}"/>
      <c:crossAx val="${crossAxId}"/> <!-- reference to the other axe of the chart -->
      <c:crosses val="${position === "b" || position === "l" ? "min" : "max"}"/>
      <c:delete val="${deleteAxis}"/> <!-- by default, axis are not displayed -->
      <c:scaling>
        <c:orientation  val="minMax" />
      </c:scaling>
      <c:axPos val="${position}" />
      ${insertMajorGridLines()}
      <c:majorTickMark val="out" />
      <c:minorTickMark val="none" />
      <c:numFmt formatCode="General" sourceLinked="1" />
      <c:title>
        ${insertText(title?.text ?? "", color, 10, title)}
      </c:title>
      ${insertTextProperties(10, defaultFontColor)}
    </${axisName}>
    <!-- <tickLblPos/> omitted -->
  `;
}

function addLegend(position: ElementPosition, fontColor: XlsxHexColor): XMLString {
  return escapeXml/*xml*/ `
    <c:legend>
      <c:legendPos val="${position}"/>
      <c:overlay val="0"/>
      ${insertTextProperties(10, fontColor)}
    </c:legend>
  `;
}

function insertMajorGridLines(color: string = "B7B7B7"): XMLString {
  return escapeXml/*xml*/ `
    <c:majorGridlines>
      ${shapeProperty({ line: { color } })}
    </c:majorGridlines>
  `;
}

function stringRef(reference: string): XMLString {
  return escapeXml/*xml*/ `
    <c:strRef>
      <c:f>${reference}</c:f>
    </c:strRef>
  `;
}

function numberRef(reference: string): XMLString {
  return escapeXml/*xml*/ `
    <c:numRef>
      <c:f>${reference}</c:f>
      <c:numCache />
    </c:numRef>
  `;
}
