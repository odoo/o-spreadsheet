import { range, toHex6, toZone, zoneToDimension } from "../../helpers";
import { ChartColors } from "../../helpers/chart";
import { ExcelChartDefinition, FigureData } from "../../types";
import { XMLAttributes, XMLString } from "../../types/xlsx";
import { DRAWING_NS_A, DRAWING_NS_C, RELATIONSHIP_NSR } from "../constants";
import { convertDotValueToEMU } from "../helpers/content_helpers";
import { formatAttributes, parseXML, xmlEscape } from "../helpers/xml_helpers";

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
  color: string;
  width?: number;
  style?: LineStyle;
}

/**
 * Each axis present inside a graph needs to be identified by an unsigned integer
 * The value does not matter, it can be hardcoded.
 */
const catAxId = 17781237;
const valAxId = 88853993;

export function createChart(chart: FigureData<ExcelChartDefinition>): XMLDocument {
  const namespaces: XMLAttributes = [
    ["xmlns:r", RELATIONSHIP_NSR],
    ["xmlns:a", DRAWING_NS_A],
    ["xmlns:c", DRAWING_NS_C],
  ];

  const chartShapeProperty = shapeProperty({
    backgroundColor: "FFFFFF",
    line: { color: "000000" },
  });
  // <manualLayout/> to manually position the chart in the figure container
  let title = "";
  if (chart.data.title) {
    title = /*xml*/ `
      <c:title>
        ${insertText(chart.data.title)}
        <c:overlay val="0" />
      </c:title>
    `;
  }

  // switch on chart type
  let plot: XMLString = "";
  switch (chart.data.type) {
    case "bar":
      plot = addBarChart(chart.data);
      break;
    case "line":
      plot = addLineChart(chart.data);
      break;
    case "pie":
      plot = addDoughnutChart(chart.data, { holeSize: 0 });
      break;
  }
  const xml = /*xml*/ `
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
        </c:plotArea>
        ${addLegend("t")}
      </c:chart>
    </c:chartSpace>
  `;
  return parseXML(xml);
}

function shapeProperty(params: { backgroundColor?: string; line?: LineAttributes }): XMLString {
  return /*xml*/ `
    <c:spPr>
      ${params.backgroundColor ? solidFill(params.backgroundColor) : ""}
      ${params.line ? lineAttributes(params.line) : ""}
    </c:spPr>
  `;
}

function solidFill(color: string): XMLString {
  return /*xml*/ `
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
  const lineStyle = params.style ? /*xml*/ `<a:prstDash val="${params.style}"/>` : "";
  return /*xml*/ `
    <a:ln ${formatAttributes(attrs)}>
      ${solidFill(params.color)}
      ${lineStyle}
    </a:ln>
  `;
}

function insertText(text: string, fontsize: number = 22): XMLString {
  return /*xml*/ `
    <c:tx>
      <c:rich>
        <a:bodyPr />
        <a:lstStyle />
        <a:p>
          <a:pPr lvl="0">
            <a:defRPr b="0">
              ${solidFill("000000")}
              <a:latin typeface="+mn-lt"/>
            </a:defRPr>
          </a:pPr>
          <a:r> <!-- Runs -->
            <a:rPr sz="${fontsize * 100}"/>
            <a:t>${xmlEscape(text)}</a:t>
          </a:r>
        </a:p>
      </c:rich>
    </c:tx>
  `;
}

function insertTextProperties(fontsize: number = 12, bold = false, italic = false): XMLString {
  const defPropertiesAttributes: XMLAttributes = [
    ["b", bold ? "1" : "0"],
    ["i", italic ? "1" : "0"],
    ["sz", fontsize * 100],
  ];
  return /*xml*/ `
    <c:txPr>
      <a:bodyPr/>
      <a:lstStyle/>
      <a:p>
        <a:pPr lvl="0">
          <a:defRPr ${formatAttributes(defPropertiesAttributes)}>
            ${solidFill("000000")}
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
  const colors = new ChartColors();
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const color = toHex6(colors.next());
    const dataShapeProperty = shapeProperty({
      backgroundColor: color,
      line: { color },
    });

    dataSetsNodes.push(/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        ${dataset.label ? /*xml*/ `<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataShapeProperty}
        ${
          chart.labelRange ? /*xml*/ `<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `);
  }

  return /*xml*/ `
    <c:barChart>
      <c:barDir val="col"/>
      <c:grouping val="clustered"/>
      <c:overlap val="-20"/>
      <c:gapWidth val="70"/>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${dataSetsNodes.join("\n")}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:barChart>
    ${addAx("b", "c:catAx", catAxId, valAxId)}
    ${addAx("l", "c:valAx", valAxId, catAxId)}
  `;
}

function addLineChart(chart: ExcelChartDefinition): XMLString {
  const colors = new ChartColors();
  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets)) {
    const dataShapeProperty = shapeProperty({
      line: {
        width: 2.5,
        style: "solid",
        color: toHex6(colors.next()),
      },
    });

    dataSetsNodes.push(/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        <c:smooth val="0"/>
        <c:marker>
          <c:symbol val="circle" />
          <c:size val="5"/>
        </c:marker>
        ${dataset.label ? `<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataShapeProperty}
        ${
          chart.labelRange ? `<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""
        } <!-- x-coordinate values -->
        <c:val> <!-- x-coordinate values -->
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `);
  }

  return /*xml*/ `
    <c:lineChart>
      <!-- each data marker in the series does not have a different color -->
      <c:varyColors val="0"/>
      ${dataSetsNodes.join("\n")}
      <c:axId val="${catAxId}" />
      <c:axId val="${valAxId}" />
    </c:lineChart>
    ${addAx("b", "c:catAx", catAxId, valAxId)}
    ${addAx("l", "c:valAx", valAxId, catAxId)}
  `;
}

function addDoughnutChart(chart: ExcelChartDefinition, { holeSize } = { holeSize: 50 }) {
  const colors = new ChartColors();

  const maxLength = Math.max(
    ...chart.dataSets.map((ds) => {
      const zone = toZone(ds.range);
      const { height, width } = zoneToDimension(zone);
      return height * width;
    })
  );
  const doughnutColors: string[] = range(0, maxLength).map(() => toHex6(colors.next()));

  const dataSetsNodes: XMLString[] = [];
  for (const [dsIndex, dataset] of Object.entries(chart.dataSets).reverse()) {
    //dataset slice labels
    const zone = toZone(dataset.range);
    const { height, width } = zoneToDimension(zone);
    const dataPoints: XMLString[] = [];
    for (const index of range(0, height * width)) {
      const pointShapeProperty = shapeProperty({
        backgroundColor: doughnutColors[index],
        line: { color: "FFFFFF", width: 1.5 },
      });
      dataPoints.push(/*xml*/ `
        <c:dPt>
          <c:idx val="${index}"/>
          ${pointShapeProperty}
        </c:dPt>
      `);
    }

    dataSetsNodes.push(/*xml*/ `
      <c:ser>
        <c:idx val="${dsIndex}"/>
        <c:order val="${dsIndex}"/>
        ${dataset.label ? `<c:tx>${stringRef(dataset.label!)}</c:tx>` : ""}
        ${dataPoints.join("\n")}
        ${insertDataLabels({ showLeaderLines: true })}
        ${chart.labelRange ? `<c:cat>${stringRef(chart.labelRange!)}</c:cat>` : ""}
        <c:val>
          ${numberRef(dataset.range)}
        </c:val>
      </c:ser>
    `);
  }
  return /*xml*/ `
    <c:doughnutChart>
      <c:varyColors val="1" />
      <c:holeSize val="${holeSize}" />
      ${insertDataLabels()}
      ${dataSetsNodes.join("\n")}
    </c:doughnutChart>
  `;
}

function insertDataLabels({ showLeaderLines } = { showLeaderLines: false }): XMLString {
  return /*xml*/ `
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
  crossAxId: number
): XMLString {
  // Each Axis present inside a graph needs to be identified by an unsigned integer in order to be referenced by its crossAxis.
  // I.e. x-axis, will reference y-axis and vice-versa.
  return /*xml*/ `
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
      ${insertTextProperties(10)}
    </${axisName}>
    <!-- <tickLblPos/> omitted -->
  `;
}

function addLegend(position: ElementPosition): XMLString {
  return /*xml*/ `
    <c:legend>
      <c:legendPos val="${position}"/>
      <c:overlay val="0"/>
      ${insertTextProperties(10)}
    </c:legend>
  `;
}

function insertMajorGridLines(color: string = "B7B7B7"): XMLString {
  return /*xml*/ `
    <c:majorGridlines>
      ${shapeProperty({ line: { color } })}
    </c:majorGridlines>
  `;
}

function stringRef(reference: string): XMLString {
  return /*xml*/ `
    <c:strRef>
      <c:f>${xmlEscape(reference)}</c:f>
    </c:strRef>
  `;
}

function numberRef(reference: string): XMLString {
  return /*xml*/ `
    <c:numRef>
      <c:f>${xmlEscape(reference)}</c:f>
      <c:numCache />
    </c:numRef>
  `;
}
