import { ExcelChartDefinition } from "../../types";
import { XLSXFigure, XLSXFigureAnchor } from "../../types/xlsx";
import { removeNamespaces } from "../helpers/xml_helpers";
import { ElementSchema, extract } from "../xml";
import { XlsxBaseExtractor } from "./base_extractor";
import { XlsxChartExtractor } from "./chart_extractor";

const schema: ElementSchema = {
  name: "wsDr",
  namespace: {
    uri: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    prefix: "xdr",
  },
  children: [
    {
      name: "twoCellAnchor", // Only twoCellAnchor are supported for xlsx drawings.
      quantifier: "many",
      children: [
        markerAnchor("from"),
        markerAnchor("to"),
        {
          name: "graphicFrame",
          children: [
            {
              name: "nvGraphicFramePr",
              children: [
                {
                  name: "cNvPr",
                  attributes: [{ name: "id" }, { name: "name" }, { name: "title" }],
                },
                { name: "cNvGraphicFramePr" },
              ],
            },
            {
              name: "xfrm",
              children: [
                {
                  name: "off",
                  namespace: {
                    uri: "http://schemas.openxmlformats.org/drawingml/2006/main",
                    prefix: "a",
                  },
                },
                {
                  name: "ext",
                  namespace: {
                    uri: "http://schemas.openxmlformats.org/drawingml/2006/main",
                    prefix: "a",
                  },
                },
              ],
            },
            {
              name: "graphic",
              namespace: {
                uri: "http://schemas.openxmlformats.org/drawingml/2006/main",
                prefix: "a",
              },
              children: [
                {
                  name: "graphicData",
                  attributes: [{ name: "uri" }],
                  children: [
                    {
                      name: "chart",
                      namespace: {
                        uri: "http://schemas.openxmlformats.org/drawingml/2006/chart",
                        prefix: "c",
                      },
                      attributes: [
                        {
                          name: "id",
                          namespace: {
                            uri: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
                            prefix: "r",
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function markerAnchor(name: string) {
  return {
    name,
    namespace: {
      uri: "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
      prefix: "xdr",
    },
    children: [{ name: "col" }, { name: "colOff" }, { name: "row" }, { name: "rowOff" }],
  };
}

export class XlsxFigureExtractor extends XlsxBaseExtractor {
  extractFigures(): XLSXFigure[] {
    schema;
    // extract
    try {
      console.log(extract(schema, this.rootFile.file.xml.firstElementChild!));
    } catch (error) {
      console.log(error);
    }
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "xdr:wsDr", children: true },
      (figureElement): XLSXFigure => {
        const anchorType = removeNamespaces(figureElement.tagName);
        if (anchorType !== "twoCellAnchor") {
          throw new Error("");
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
