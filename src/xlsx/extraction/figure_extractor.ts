import { ExcelChartDefinition } from "../../types";
import { XLSXFigure } from "../../types/xlsx";
import { FIGURE_SCHEMA } from "../schema/figures_schema";
import { extract } from "../xml";
import { XlsxBaseExtractor } from "./base_extractor";
import { XlsxChartExtractor } from "./chart_extractor";

export class XlsxFigureExtractor extends XlsxBaseExtractor {
  extractFigures(): XLSXFigure[] {
    const data = extract(FIGURE_SCHEMA, this.rootFile.file.xml.firstElementChild!);
    data.wsDr;
    return data.wsDr.twoCellAnchor.map((figureAnchor) => {
      return {
        anchors: [figureAnchor.from, figureAnchor.to],
        data: this.extractChart(figureAnchor.graphicFrame.graphic.graphicData.chart.id),
      };
    });
  }

  private extractChart(chartId: string): ExcelChartDefinition {
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
