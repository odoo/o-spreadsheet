import { ColorGenerator, largeMax, range } from "../../helpers";
import { Color, ExcelWorkbookData, FigureData } from "../../types";
import { ExcelChartDefinition } from "../../types/chart/chart";
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
const valAxId = 88853993;

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
  if (chart.data.title) {
    title = escapeXml/*xml*/ `
      <c:title>
        ${insertText(chart.data.title, chart.data.fontColor)}
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
  fontsize: number = 22
): XMLString {
  return escapeXml/*xml*/ `
    <c:tx>
      <c:rich>
        <a:bodyPr />
        <a:lstStyle />
        <a:p>
          <a:pPr lvl="0">
            <a:defRPr b="0">
              ${solidFill(fontColor)}
              <a:latin typeface="+mn-lt"/>
            </a:defRPr>
          </a:pPr>
          <a:r> <!-- Runs -->
            <a:rPr sz="${fontsize * 100}"/>
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

function addBarChart(chart: ExcelChartDefinition): XMLString {
  // gapWitdh and overlap that define the space between clusters (in %) and the overlap between datasets (from -100: completely scattered to 100, completely overlapped)
  // see gapWidth : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_gapWidth_topic_ID0EFVEQB.html#topic_ID0EFVEQB
  // see overlap : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_overlap_topic_ID0ELYQQB.html#topic_ID0ELYQQB
  //
  // overlap and gapWitdh seems to be by default at -20 and 20 in chart.js.
  // See https://www.chartjs.org/docs/latest/charts/bar.html and https://www.chartjs.org/docs/latest/charts/bar.html#barpercentage-vs-categorypercentage
  const colors = new ColorGenerator();
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toXlsxHexColor(colors.next());
    const dataShapeProperty = shapeProperty({
      backgroundColor: color,
      line: { color },
    });

    dataSetsNodes.push(escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        ${dataset.label ? escapeXml/*xml*/ `<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml/*xml*/ `<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `);
  }

  // Excel does not support this feature
  const axisPos = chart.verticalAxisPosition === "left" ? "l" : "r";

  const grouping = chart.stacked ? "stacked" : "clustered";
  const overlap = chart.stacked ? 100 : -20;
  return escapeXml/*xml*/ `
    <c:barChart>
      <c:barDir val="col"/>
      <c:grouping val="${grouping}"/>
      <c:overlap val="${overlap}"/>
      <c:gapWidth val="70"/>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${joinXmlNodes(dataSetsNodes)}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:barChart>
    ${addAx("b", "c:catAx", catAxId, valAxId, { fontColor: chart.fontColor })}
    ${addAx(axisPos, "c:valAx", valAxId, catAxId, { fontColor: chart.fontColor })}
  `;
}

function addComboChart(chart: ExcelChartDefinition): XMLString {
  // gapWitdh and overlap that define the space between clusters (in %) and the overlap between datasets (from -100: completely scattered to 100, completely overlapped)
  // see gapWidth : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_gapWidth_topic_ID0EFVEQB.html#topic_ID0EFVEQB
  // see overlap : https://c-rex.net/projects/samples/ooxml/e1/Part4/OOXML_P4_DOCX_overlap_topic_ID0ELYQQB.html#topic_ID0ELYQQB
  //
  // overlap and gapWitdh seems to be by default at -20 and 20 in chart.js.
  // See https://www.chartjs.org/docs/latest/charts/bar.html and https://www.chartjs.org/docs/latest/charts/bar.html#barpercentage-vs-categorypercentage
  const colors = new ColorGenerator();
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toXlsxHexColor(colors.next());
    const dataShapeProperty = shapeProperty({
      backgroundColor: color,
      line: { color },
    });

    dataSetsNodes.push(
      dsIndex === "0"
        ? escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        ${dataset.label ? escapeXml/*xml*/ `<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml/*xml*/ `<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
      `
        : escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
        </c:marker>
        ${dataset.label ? escapeXml`<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml`<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
      `
    );
  }

  // Excel does not support this feature
  const axisPos = chart.verticalAxisPosition === "left" ? "l" : "r";

  const overlap = chart.stacked ? 100 : -20;
  return escapeXml/*xml*/ `
    <c:barChart>
      <c:barDir val="col"/>
      <c:grouping val="clustered"/>
      <c:overlap val="${overlap}"/>
      <c:gapWidth val="70"/>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${dataSetsNodes[0]}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:barChart>
    <c:lineChart>
      <c:grouping val="standard"/>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${joinXmlNodes(dataSetsNodes.slice(1))}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:lineChart>
    ${addAx("b", "c:catAx", catAxId, valAxId, { fontColor: chart.fontColor })}
    ${addAx(axisPos, "c:valAx", valAxId, catAxId, { fontColor: chart.fontColor })}
  `;
}

function addLineChart(chart: ExcelChartDefinition): XMLString {
  const colors = new ColorGenerator();
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const dataShapeProperty = shapeProperty({
      line: {
        width: 2.5,
        style: "solid",
        color: toXlsxHexColor(colors.next()),
      },
    });

    dataSetsNodes.push(escapeXml/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
        </c:marker>
        ${dataset.label ? escapeXml`<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataShapeProperty}
        ${
          chart.labelRange ? escapeXml`<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `);
  }

  // Excel does not support this feature
  const axisPos = chart.verticalAxisPosition === "left" ? "l" : "r";
  const grouping = chart.stacked ? "stacked" : "standard";

  return escapeXml/*xml*/ `
    <c:lineChart>
      <c:grouping val="${grouping}"/>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${joinXmlNodes(dataSetsNodes)}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:lineChart>
    ${addAx("b", "c:catAx", catAxId, valAxId, { fontColor: chart.fontColor })}
    ${addAx(axisPos, "c:valAx", valAxId, catAxId, { fontColor: chart.fontColor })}
  `;
}

function addScatterChart(chart: ExcelChartDefinition): XMLString {
  const colors = new ColorGenerator();
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    dataSetsNodes.push(escapeXml/*xml*/ `
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
          ${shapeProperty({ backgroundColor: toXlsxHexColor(colors.next()) })}
        </c:marker>
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
    `);
  }

  const axisPos = chart.verticalAxisPosition === "left" ? "l" : "r";
  return escapeXml/*xml*/ `
    <c:scatterChart>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      <c:scatterStyle val="lineMarker"/>
      ${joinXmlNodes(dataSetsNodes)}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:scatterChart>
    ${addAx("b", "c:valAx", catAxId, valAxId, { fontColor: chart.fontColor })}
    ${addAx(axisPos, "c:valAx", valAxId, catAxId, { fontColor: chart.fontColor })}
  `;
}

function addDoughnutChart(
  chart: ExcelChartDefinition,
  chartSheetIndex: string,
  data: ExcelWorkbookData,
  { holeSize } = { holeSize: 50 }
) {
  const colors = new ColorGenerator();

  const maxLength = largeMax(
    chart.dataSets.map((ds) => getRangeSize(ds.range, chartSheetIndex, data))
  );
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
        ${dataset.label ? escapeXml`<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
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
  { fontColor }: { fontColor: XlsxHexColor }
): XMLString {
  // Each Axis present inside a graph needs to be identified by an unsigned integer in order to be referenced by its crossAxis.
  // I.e. x-axis, will reference y-axis and vice-versa.
  return escapeXml/*xml*/ `
    <${axisName}>
      <c:axId val="${axId}"/>
      <c:crossAx val="${crossAxId}"/> <!-- reference to the other axe of the chart -->
      <c:delete val="0"/> <!-- by default, axis are not displayed -->
      <c:scaling>
        <c:orientation  val="minMax" />
      </c:scaling>
      <c:axPos val="${position}" />
      ${insertMajorGridLines()}
      <c:majorTickMark val="out" />
      <c:minorTickMark val="none" />
      <c:numFmt formatCode="General" sourceLinked="1" />
      <c:title>
        ${insertText("")}
      </c:title>
      ${insertTextProperties(10, fontColor)}
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
