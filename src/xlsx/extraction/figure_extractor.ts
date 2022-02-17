import { ExcelChartDefinition } from "../../types";
import { XLSXFigure, XLSXFigureAnchor } from "../../types/xlsx";
import { removeNamespaces } from "../helpers/xml_helpers";
import { XlsxBaseExtractor } from "./base_extractor";
import { XlsxChartExtractor } from "./chart_extractor";

export class XlsxFigureExtractor extends XlsxBaseExtractor {
  extractFigures(): XLSXFigure[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "xdr:wsDr", children: true },
      (figureElement): XLSXFigure => {
        const anchorType = removeNamespaces(figureElement.tagName);
        if (anchorType !== "twoCellAnchor") {
          throw new Error("Only twoCellAnchor are supported for xlsx drawings.");
        }

        const chartElement = this.querySelector(figureElement, "c:chart");
        if (!chartElement) {
          throw new Error("Only chart figures are currently supported.");
        }

        return {
          anchors: [
            this.extractFigureAnchor("xdr:from", figureElement),
            this.extractFigureAnchor("xdr:to", figureElement),
          ],
          data: this.extractChart(chartElement),
        };
      }
    );
  }

  private extractFigureAnchor(anchorTag: string, figureElement: Element): XLSXFigureAnchor {
    const anchor = this.querySelector(figureElement, anchorTag);
    if (!anchor) {
      throw new Error(`Missing anchor element ${anchorTag}`);
    }

    return {
      col: Number(this.extractChildTextContent(anchor, "xdr:col", { required: true })!),
      colOffset: Number(this.extractChildTextContent(anchor, "xdr:colOff", { required: true })!),
      row: Number(this.extractChildTextContent(anchor, "xdr:row", { required: true })!),
      rowOffset: Number(this.extractChildTextContent(anchor, "xdr:rowOff", { required: true })!),
    };
  }

  private extractChart(chartElement: Element): ExcelChartDefinition {
    const chartId = this.extractAttr(chartElement, "r:id", { required: true }).asString();
    const chartFile = this.getTargetXmlFile(this.relationships[chartId])!;

    const chartDefinition = new XlsxChartExtractor(
      chartFile,
      this.xlsxFileStructure,
      this.warningManager
    ).extractChart();

    if (!chartDefinition) {
      throw new Error("Unable to extract chart definition");
    }
    return chartDefinition;
  }
}
