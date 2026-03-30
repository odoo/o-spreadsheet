import { isColorValid, toHex } from "../../helpers/color";
import {
  ExcelChartDataset,
  ExcelChartDefinition,
  ExcelChartTrendConfiguration,
  ExcelTrendlineType,
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
          title: { text: chartTitle },
          type: CHART_TYPE_CONVERSION_MAP[chartType]!,
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
    const barChartGrouping = this.extractChildAttr(chartElement, "c:grouping", "val", {
      default: "clustered",
    }).asString();
    const showValueNodes = this.querySelectorAll(chartElement, "c:chart c:showVal");
    const showValues = [...showValueNodes].some(
      (el) => el.attributes.getNamedItem("val")?.value === "1"
    );
    return {
      title: { text: chartTitle },
      type: "combo",
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
