import { isColorValid, toHex } from "../../helpers/color";
import {
  AxesDesign,
  ExcelChartDataset,
  ExcelChartDefinition,
  ExcelChartTrendConfiguration,
  ExcelTrendlineType,
  TitleDesign,
} from "../../types/chart";
import { XLSX_CHART_TYPES, XLSXChartType } from "../../types/xlsx";
import { CHART_TYPE_CONVERSION_MAP, DRAWING_LEGEND_POSITION_CONVERSION_MAP } from "../conversion";
import { removeTagEscapedNamespaces } from "../helpers/xml_helpers";
import { XlsxBaseExtractor } from "./base_extractor";

export class XlsxChartExtractor extends XlsxBaseExtractor {
  extractChart(): ExcelChartDefinition | undefined {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "c:chartSpace" },
      (rootChartElement): ExcelChartDefinition => {
        const chartType = this.getChartType(rootChartElement);
        if (!CHART_TYPE_CONVERSION_MAP[chartType]) {
          throw new Error(`Unsupported chart type ${chartType}`);
        }
        if (CHART_TYPE_CONVERSION_MAP[chartType] === "combo") {
          return this.extractComboChart(rootChartElement);
        }

        // Title can be separated into multiple xml elements (for styling and such), we only import the text
        const chartTitle = this.mapOnElements(
          { parent: rootChartElement, query: "c:chart > c:title a:t" },
          (textElement): string => {
            return textElement.textContent || "";
          }
        ).join("");
        const chartTitleStyle = this.extractDefRPrStyle(
          rootChartElement,
          "c:chart > c:title a:p a:pPr a:defRPr"
        );
        const barChartGrouping = this.extractChildAttr(rootChartElement, "c:grouping", "val", {
          default: "clustered",
        }).asString();

        const chartDirection = this.extractChildAttr(rootChartElement, "c:barDir", "val", {
          default: "col",
        }).asString();
        const chartHoleSize = this.extractChildAttr(rootChartElement, "c:holeSize", "val", {
          default: "0",
        }).asNum();
        const showValueNodes = this.querySelectorAll(rootChartElement, "c:chart c:showVal");
        const showValues = [...showValueNodes].some(
          (el) => el.attributes.getNamedItem("val")?.value === "1"
        );
        return {
          title: { text: chartTitle, ...chartTitleStyle },
          type: CHART_TYPE_CONVERSION_MAP[chartType]!,
          axesDesign: this.extractAxesDesign(rootChartElement),
          dataSets: this.extractChartDatasets(
            this.querySelectorAll(rootChartElement, `c:${chartType}`)!,
            chartType
          ),
          labelRange: this.extractLabelRange(chartType, rootChartElement),
          backgroundColor: this.extractChildAttr(
            rootChartElement,
            "c:chartSpace > c:spPr a:srgbClr",
            "val",
            {
              default: "ffffff",
            }
          ).asString()!,
          legendPosition:
            DRAWING_LEGEND_POSITION_CONVERSION_MAP[
              this.extractChildAttr(rootChartElement, "c:legendPos", "val", {
                default: "none",
              }).asString()
            ],
          stacked: barChartGrouping === "stacked",
          fontColor: "000000",
          horizontal: chartDirection === "bar",
          isDoughnut: chartHoleSize > 0,
          pieHolePercentage: chartHoleSize,
          showValues,
        };
      }
    )[0];
  }

  private extractLabelRange(chartType: XLSXChartType, rootChartElement: Element) {
    if (chartType === "scatterChart") {
      return (
        this.extractChildTextContent(rootChartElement, `c:ser c:strRef c:f`) ||
        this.extractChildTextContent(rootChartElement, `c:ser c:numRef c:f`)
      );
    }
    return this.extractChildTextContent(rootChartElement, `c:ser c:cat c:f`);
  }

  private extractComboChart(chartElement: Element): ExcelChartDefinition {
    // Title can be separated into multiple xml elements (for styling and such), we only import the text
    const chartTitle = this.mapOnElements(
      { parent: chartElement, query: "c:title a:t" },
      (textElement): string => {
        return textElement.textContent || "";
      }
    ).join("");
    const chartTitleStyle = this.extractDefRPrStyle(
      chartElement,
      "c:chart > c:title a:p a:pPr a:defRPr"
    );
    const barChartGrouping = this.extractChildAttr(chartElement, "c:grouping", "val", {
      default: "clustered",
    }).asString();
    const showValueNodes = this.querySelectorAll(chartElement, "c:chart c:showVal");
    const showValues = [...showValueNodes].some(
      (el) => el.attributes.getNamedItem("val")?.value === "1"
    );
    return {
      title: { text: chartTitle, ...chartTitleStyle },
      type: "combo",
      axesDesign: this.extractAxesDesign(chartElement),
      dataSets: [
        ...this.extractChartDatasets(
          this.querySelectorAll(chartElement, `c:barChart`),
          "comboChart"
        ),
        ...this.extractChartDatasets(
          this.querySelectorAll(chartElement, `c:lineChart`)!,
          "comboChart"
        ),
      ],
      labelRange: this.extractChildTextContent(chartElement, "c:ser c:cat c:f"),
      backgroundColor: this.extractChildAttr(
        chartElement,
        "c:chartSpace > c:spPr a:srgbClr",
        "val",
        {
          default: "ffffff",
        }
      ).asString()!,
      legendPosition:
        DRAWING_LEGEND_POSITION_CONVERSION_MAP[
          this.extractChildAttr(chartElement, "c:legendPos", "val", {
            default: "none",
          }).asString()
        ],
      stacked: barChartGrouping === "stacked",
      fontColor: "000000",
      showValues,
    };
  }

  private extractDefRPrStyle(
    element: Element,
    defRPrQuery: string
  ): Pick<TitleDesign, "bold" | "italic" | "fontSize" | "color"> {
    const defRPr = this.querySelector(element, defRPrQuery);
    if (!defRPr) {
      return {};
    }
    const bAttr = defRPr.getAttribute("b");
    const bold = bAttr === "1" || bAttr === "true" ? true : undefined;
    const iAttr = defRPr.getAttribute("i");
    const italic = iAttr === "1" || iAttr === "true" ? true : undefined;
    const szAttr = defRPr.getAttribute("sz");
    const fontSize = szAttr ? Math.round(parseInt(szAttr) / 100) : undefined;
    const color = this.extractDrawingFillColor(defRPr);
    return { bold, italic, fontSize, color };
  }

  private extractDrawingFillColor(element: Element): string | undefined {
    const srgbClr = this.querySelector(element, "a:solidFill a:srgbClr");
    if (srgbClr) {
      const val = srgbClr.getAttribute("val");
      return val && isColorValid(val) ? toHex(val) : undefined;
    }
    const schemeClr = this.querySelector(element, "a:solidFill a:schemeClr");
    if (schemeClr) {
      const schemeName = schemeClr.getAttribute("val");
      if (schemeName) {
        return this.resolveSchemeColor(schemeName);
      }
    }
    return undefined;
  }

  /**
   * Resolve a DrawingML scheme color name (e.g. "accent1", "dk1") to its hex
   * RGB value by looking it up in the theme's `a:clrScheme` element.
   * Returns `undefined` if the theme is unavailable or the color cannot be found.
   */
  private resolveSchemeColor(schemeName: string): string | undefined {
    const themeFile = this.xlsxFileStructure.theme;
    if (!themeFile) {
      return undefined;
    }
    const schemeEl = this.querySelector(themeFile.file.xml, `a:clrScheme a:${schemeName}`);
    if (!schemeEl) {
      return undefined;
    }
    const srgbClr = this.querySelector(schemeEl, "a:srgbClr");
    if (srgbClr) {
      const val = srgbClr.getAttribute("val");
      return val && isColorValid(val) ? toHex(val) : undefined;
    }

    const sysClr = this.querySelector(schemeEl, "a:sysClr");
    if (sysClr) {
      const lastClr = sysClr.getAttribute("lastClr");
      return lastClr && isColorValid(lastClr) ? toHex(lastClr) : undefined;
    }
    return undefined;
  }

  private extractAxisTitleDesign(axElement: Element | null): TitleDesign | undefined {
    if (axElement === null) {
      return undefined;
    }
    const titleText = this.mapOnElements(
      { parent: axElement, query: "c:title a:t" },
      (el) => el.textContent || ""
    ).join("");
    if (!titleText) {
      return undefined;
    }
    const style = this.extractDefRPrStyle(axElement, "c:title a:p a:pPr a:defRPr");
    return { text: titleText, ...style };
  }

  private extractAxesDesign(chartElement: Element): AxesDesign | undefined {
    const catAx = this.querySelector(chartElement, "c:catAx");
    const valAx = this.querySelector(chartElement, "c:valAx");
    const axPos = catAx ? this.extractChildAttr(catAx, "c:axPos", "val")?.asString() : undefined;
    const isHorizontalChart = axPos === "l" || axPos === "r";
    const xAx = isHorizontalChart ? valAx : catAx;
    const yAx = isHorizontalChart ? catAx : valAx;
    const xTitle = this.extractAxisTitleDesign(xAx);
    const yTitle = this.extractAxisTitleDesign(yAx);
    if (!xTitle && !yTitle) {
      return undefined;
    }
    const axesDesign: AxesDesign = {};
    if (xTitle) {
      axesDesign.x = { title: xTitle };
    }
    if (yTitle) {
      axesDesign.y = { title: yTitle };
    }
    return axesDesign;
  }

  private extractChartDatasets(
    chartElements: NodeListOf<Element>,
    chartType: XLSXChartType
  ): ExcelChartDataset[] {
    return Array.from(chartElements)
      .map((element) => {
        if (chartType === "scatterChart") {
          return this.extractScatterChartDatasets(element);
        }
        return this.mapOnElements(
          { parent: element, query: "c:ser" },
          (chartDataElement): ExcelChartDataset => {
            let label = {};
            const reference = this.extractChildTextContent(chartDataElement, "c:tx c:f");
            if (reference) {
              label = { reference };
            } else {
              const text = this.extractChildTextContent(chartDataElement, "c:tx c:v");
              if (text) {
                label = { text };
              }
            }
            const colorElements = this.querySelectorAll(chartDataElement, "c:spPr a:solidFill");
            const datasetColorElement = colorElements.length
              ? this.querySelector(colorElements[0], "a:srgbClr")
              : undefined;
            const color = datasetColorElement ? datasetColorElement.getAttribute("val") : undefined;
            return {
              label,
              range: this.extractChildTextContent(chartDataElement, "c:val c:f", {
                required: true,
              })!,
              backgroundColor: color && isColorValid(color) ? `${toHex(color)}` : undefined,
              trend: this.extractChartTrendline(chartDataElement),
            };
          }
        );
      })
      .flat();
  }

  private extractChartTrendline(
    chartDataElement: Element
  ): ExcelChartTrendConfiguration | undefined {
    const trendlineElement = this.querySelector(chartDataElement, "c:trendline");
    if (!trendlineElement) {
      return undefined;
    }
    const trendlineType = this.extractChildAttr(trendlineElement, "c:trendlineType", "val");
    const trendlineColor = this.extractChildAttr(trendlineElement, "a:solidFill a:srgbClr", "val");
    return {
      type: trendlineType ? (trendlineType.asString() as ExcelTrendlineType) : undefined,
      order: this.extractChildAttr(trendlineElement, "c:order", "val")?.asNum(),
      window: this.extractChildAttr(trendlineElement, "c:period", "val")?.asNum(),
      color:
        trendlineColor && isColorValid(trendlineColor.asString())
          ? `${toHex(trendlineColor.asString())}`
          : undefined,
    };
  }

  private extractScatterChartDatasets(chartElement: Element): ExcelChartDataset[] {
    return this.mapOnElements(
      { parent: chartElement, query: "c:ser" },
      (chartDataElement): ExcelChartDataset => {
        let label = {};
        const colorElements = this.querySelectorAll(
          chartDataElement,
          "c:spPr a:solidFill a:srgbClr"
        );
        const color = colorElements.length ? colorElements[0].getAttribute("val") : undefined;
        const reference = this.extractChildTextContent(chartDataElement, "c:tx c:f");
        if (reference) {
          label = { reference };
        } else {
          const text = this.extractChildTextContent(chartDataElement, "c:tx c:v");
          if (text) {
            label = { text };
          }
        }
        return {
          label,
          range: this.extractChildTextContent(chartDataElement, "c:yVal c:f", { required: true })!,
          trend: this.extractChartTrendline(chartDataElement),
          backgroundColor: color && isColorValid(color) ? `${toHex(color)}` : undefined,
        };
      }
    );
  }

  /**
   * The chart type in the XML isn't explicitly defined, but there is an XML element that define the
   * chart, and this element tag name tells us which type of chart it is. We just need to find this XML element.
   */
  private getChartType(chartElement: Element): XLSXChartType {
    const plotAreaElement = this.querySelector(chartElement, "c:plotArea");
    if (!plotAreaElement) {
      throw new Error("Missing plot area in the chart definition.");
    }
    let globalTag: XLSXChartType | undefined = undefined;
    for (const child of plotAreaElement.children) {
      const tag = removeTagEscapedNamespaces(child.tagName);
      if (XLSX_CHART_TYPES.some((chartType) => chartType === tag)) {
        if (!globalTag) {
          globalTag = tag as XLSXChartType;
        } else if (globalTag !== tag) {
          globalTag = "comboChart";
        }
      }
    }
    if (globalTag) {
      return globalTag;
    }
    throw new Error("Unknown chart type");
  }
}
