import { ExcelChartDataset, ExcelChartDefinition } from "../../types";
import { XLSXChartType, XLSX_CHART_TYPES } from "../../types/xlsx";
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
          { parent: rootChartElement, query: "c:title a:t" },
          (textElement): string => {
            return textElement.textContent || "";
          }
        ).join("");
        const barChartGrouping = this.extractChildAttr(rootChartElement, "c:grouping", "val", {
          default: "clustered",
        }).asString();

        return {
          title: chartTitle,
          type: CHART_TYPE_CONVERSION_MAP[chartType]!,
          dataSets: this.extractChartDatasets(
            this.querySelector(rootChartElement, `c:${chartType}`)!,
            chartType
          ),
          labelRange: this.extractChildTextContent(
            rootChartElement,
            `c:ser ${chartType === "scatterChart" ? "c:numRef" : "c:cat"} c:f`
          ),
          backgroundColor: this.extractChildAttr(
            rootChartElement,
            "c:chartSpace > c:spPr a:srgbClr",
            "val",
            {
              default: "ffffff",
            }
          ).asString()!,
          verticalAxisPosition:
            this.extractChildAttr(rootChartElement, "c:valAx > c:axPos", "val", {
              default: "l",
            }).asString() === "r"
              ? "right"
              : "left",
          legendPosition:
            DRAWING_LEGEND_POSITION_CONVERSION_MAP[
              this.extractChildAttr(rootChartElement, "c:legendPos", "val", {
                default: "b",
              }).asString()
            ],
          stacked: barChartGrouping === "stacked",
          fontColor: "000000",
        };
      }
    )[0];
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

    return {
      title: chartTitle,
      type: "combo",
      dataSets: [
        ...this.extractChartDatasets(this.querySelector(chartElement, `c:barChart`)!, "comboChart"),
        ...this.extractChartDatasets(
          this.querySelector(chartElement, `c:lineChart`)!,
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
      verticalAxisPosition:
        this.extractChildAttr(chartElement, "c:valAx > c:axPos", "val", {
          default: "l",
        }).asString() === "r"
          ? "right"
          : "left",
      legendPosition:
        DRAWING_LEGEND_POSITION_CONVERSION_MAP[
          this.extractChildAttr(chartElement, "c:legendPos", "val", {
            default: "b",
          }).asString()
        ],
      stacked: barChartGrouping === "stacked",
      fontColor: "000000",
    };
  }

  private extractChartDatasets(
    chartElement: Element,
    chartType: XLSXChartType
  ): ExcelChartDataset[] {
    if (chartType === "scatterChart") {
      return this.extractScatterChartDatasets(chartElement);
    }
    return this.mapOnElements(
      { parent: chartElement, query: "c:ser" },
      (chartDataElement): ExcelChartDataset => {
        return {
          label: this.extractChildTextContent(chartDataElement, "c:tx c:f"),
          range: this.extractChildTextContent(chartDataElement, "c:val c:f", { required: true })!,
        };
      }
    );
  }

  private extractScatterChartDatasets(chartElement: Element): ExcelChartDataset[] {
    return this.mapOnElements(
      { parent: chartElement, query: "c:ser" },
      (chartDataElement): ExcelChartDataset => {
        return {
          label: this.extractChildTextContent(chartDataElement, "c:xVal c:f", { required: false }),
          range: this.extractChildTextContent(chartDataElement, "c:yVal c:f", { required: true })!,
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
    for (let child of plotAreaElement.children) {
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
