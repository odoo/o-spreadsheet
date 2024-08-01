import type { ExcelChartDefinition } from "../../types";
import type { ExcelImage } from "../../types/image";
import type { XLSXFigure, XLSXFigureAnchor } from "../../types/xlsx";
import { IMAGE_EXTENSION_TO_MIMETYPE_MAPPING } from "../conversion";
import { removeTagEscapedNamespaces } from "../helpers/xml_helpers";
import { XlsxBaseExtractor } from "./base_extractor";
import { XlsxChartExtractor } from "./chart_extractor";

export class XlsxFigureExtractor extends XlsxBaseExtractor {
  extractFigures(): XLSXFigure[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "xdr:wsDr", children: true },
      (figureElement): XLSXFigure => {
        const anchorType = removeTagEscapedNamespaces(figureElement.tagName);
        if (anchorType !== "twoCellAnchor") {
          throw new Error("Only twoCellAnchor are supported for xlsx drawings.");
        }

        const chartElement = this.querySelector(figureElement, "c:chart");
        const imageElement = this.querySelector(figureElement, "a:blip");
        if (!chartElement && !imageElement) {
          throw new Error("Only chart and image figures are currently supported.");
        }

        return {
          anchors: [
            this.extractFigureAnchor("xdr:from", figureElement),
            this.extractFigureAnchor("xdr:to", figureElement),
          ],
          data: chartElement ? this.extractChart(chartElement) : this.extractImage(figureElement),
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

  private extractImage(figureElement: Element): ExcelImage {
    const imageElement = this.querySelector(figureElement, "a:blip");
    const imageId = this.extractAttr(imageElement!, "r:embed", { required: true }).asString();
    const image = this.getTargetImageFile(this.relationships[imageId])!;
    if (!image) {
      throw new Error("Unable to extract image");
    }

    const shapePropertyElement = this.querySelector(figureElement, "a:xfrm")!;
    const extension = image.fileName.split(".").at(-1);

    return {
      imageSrc: image.imageSrc,
      mimetype: extension ? IMAGE_EXTENSION_TO_MIMETYPE_MAPPING[extension] : undefined,
      size: {
        cx: this.extractChildAttr(shapePropertyElement, "a:ext", "cx", { required: true })!.asNum(),
        cy: this.extractChildAttr(shapePropertyElement, "a:ext", "cy", { required: true })!.asNum(),
      },
    };
  }
}
