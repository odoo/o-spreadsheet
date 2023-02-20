import { ExcelChartDefinition, ExcelFigureSize } from "../../types";
import { ExcelImage } from "../../types/image";
import { XLSXFigure, XLSXFigureAnchor } from "../../types/xlsx";
import { IMAGE_EXTENSION_TO_MIMETYPE_MAPPING } from "../conversion";
import { removeTagEscapedNamespaces } from "../helpers/xml_helpers";
import { XlsxBaseExtractor } from "./base_extractor";
import { XlsxChartExtractor } from "./chart_extractor";

const ONE_CELL_ANCHOR = "oneCellAnchor";
const TWO_CELL_ANCHOR = "twoCellAnchor";

export class XlsxFigureExtractor extends XlsxBaseExtractor {
  extractFigures(): XLSXFigure[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "xdr:wsDr", children: true },
      (figureElement): XLSXFigure => {
        const anchorType = removeTagEscapedNamespaces(figureElement.tagName);
        const anchors = this.extractFigureAnchorsByType(figureElement, anchorType);

        const chartElement = this.querySelector(figureElement, "c:chart");
        const imageElement = this.querySelector(figureElement, "a:blip");
        if (!chartElement && !imageElement) {
          throw new Error("Only chart and image figures are currently supported.");
        }

        return {
          anchors,
          data: chartElement ? this.extractChart(chartElement) : this.extractImage(figureElement),
          figureSize:
            anchorType === ONE_CELL_ANCHOR
              ? this.extractFigureSizeFromSizeTag(figureElement, "xdr:ext")
              : undefined,
        };
      }
    );
  }

  private extractFigureAnchorsByType(
    figureElement: Element,
    anchorType: string
  ): XLSXFigureAnchor[] {
    switch (anchorType) {
      case ONE_CELL_ANCHOR:
        return [this.extractFigureAnchor("xdr:from", figureElement)];
      case TWO_CELL_ANCHOR:
        return [
          this.extractFigureAnchor("xdr:from", figureElement),
          this.extractFigureAnchor("xdr:to", figureElement),
        ];
      default:
        throw new Error(`${anchorType} is not supported for xlsx drawings. `);
    }
  }

  private extractFigureSizeFromSizeTag(figureElement: Element, sizeTag: string): ExcelFigureSize {
    const sizeElement = this.querySelector(figureElement, sizeTag);
    if (!sizeElement) {
      throw new Error(`Missing size element '${sizeTag}'`);
    }
    return {
      cx: this.extractAttr(sizeElement, "cx", { required: true })!.asNum(),
      cy: this.extractAttr(sizeElement, "cy", { required: true })!.asNum(),
    };
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

    const extension = image.fileName.split(".").at(-1);
    const anchorType = removeTagEscapedNamespaces(figureElement.tagName);
    const sizeElement =
      anchorType === TWO_CELL_ANCHOR ? this.querySelector(figureElement, "a:xfrm")! : figureElement;
    const sizeTag = anchorType === TWO_CELL_ANCHOR ? "a:ext" : "xdr:ext";
    const size = this.extractFigureSizeFromSizeTag(sizeElement, sizeTag);

    return {
      imageSrc: image.imageSrc,
      mimetype: extension ? IMAGE_EXTENSION_TO_MIMETYPE_MAPPING[extension] : undefined,
      size,
    };
  }
}
