import { DEFAULT_FONT_SIZE } from "../../constants";
import {
  XLSXBorder,
  XLSXBorderDescr,
  XLSXCellAlignment,
  XLSXDxf,
  XLSXFileStructure,
  XLSXFill,
  XLSXFont,
  XLSXHorizontalAlignment,
  XLSXNumFormat,
  XLSXStyle,
  XLSXTheme,
  XLSXVerticalAlignment,
} from "../../types/xlsx";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { XLSXBorderStyle } from "./../../types/xlsx";
import { XlsxBaseExtractor } from "./base_extractor";

type BorderDirection = "left" | "right" | "top" | "bottom" | "diagonal";

export class XlsxStyleExtractor extends XlsxBaseExtractor {
  theme?: XLSXTheme;
  constructor(
    xlsxStructure: XLSXFileStructure,
    warningManager: XLSXImportWarningManager,
    theme: XLSXTheme | undefined
  ) {
    super(xlsxStructure.styles, xlsxStructure, warningManager);
    this.theme = theme;
  }

  getNumFormats(): XLSXNumFormat[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "numFmt" },
      (numFmtElement): XLSXNumFormat => {
        return this.extractNumFormats(numFmtElement);
      }
    );
  }

  private extractNumFormats(numFmtElement: Element): XLSXNumFormat {
    return {
      id: this.extractAttr(numFmtElement, "numFmtId", {
        required: true,
      }).asNum()!,
      format: this.extractAttr(numFmtElement, "formatCode", {
        required: true,
        default: "",
      }).asString()!,
    };
  }

  getFonts(): XLSXFont[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "font" },
      (font): XLSXFont => {
        return this.extractFont(font);
      }
    );
  }

  private extractFont(fontElement: Element): XLSXFont {
    const name = this.extractChildAttr(fontElement, "name", "val", {
      default: "Arial",
    }).asString();
    const size = this.extractChildAttr(fontElement, "sz", "val", {
      default: DEFAULT_FONT_SIZE.toString(),
    }).asNum();
    const color = this.extractColor(this.querySelector(fontElement, `color`), this.theme);

    // The behavior for these is kinda strange. The text is italic if there is either a "italic" tag with no "val"
    // attribute, or a tag with a "val" attribute = "1" (boolean).
    const italicElement = this.querySelector(fontElement, `i`) || undefined;
    const italic = italicElement && italicElement.attributes["val"]?.value !== "0";
    const boldElement = this.querySelector(fontElement, `b`) || undefined;
    const bold = boldElement && boldElement.attributes["val"]?.value !== "0";
    const strikeElement = this.querySelector(fontElement, `strike`) || undefined;
    const strike = strikeElement && strikeElement.attributes["val"]?.value !== "0";
    const underlineElement = this.querySelector(fontElement, `u`) || undefined;
    const underline = underlineElement && underlineElement.attributes["val"]?.value !== "none";

    return { name, size, color, italic, bold, underline, strike };
  }

  getFills(): XLSXFill[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "fill" },
      (fillElement): XLSXFill => {
        return this.extractFill(fillElement);
      }
    );
  }

  private extractFill(fillElement: Element): XLSXFill {
    // Fills are either patterns of gradients
    const fillChild = fillElement.children[0];
    if (fillChild.tagName === "patternFill") {
      return {
        patternType: fillChild.attributes["patternType"]?.value,
        bgColor: this.extractColor(this.querySelector(fillChild, "bgColor"), this.theme),
        fgColor: this.extractColor(this.querySelector(fillChild, "fgColor"), this.theme),
      };
    } else {
      // We don't support gradients. Take the second gradient color as fill color
      return {
        patternType: "solid",
        fgColor: this.extractColor(this.querySelectorAll(fillChild, "color")[1], this.theme),
      };
    }
  }

  getBorders(): XLSXBorder[] {
    return this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "border" },
      (borderElement): XLSXBorder => {
        return this.extractBorder(borderElement);
      }
    );
  }

  private extractBorder(borderElement: Element): XLSXBorder {
    const border: XLSXBorder = {
      left: this.extractSingleBorder(borderElement, "left", this.theme),
      right: this.extractSingleBorder(borderElement, "right", this.theme),
      top: this.extractSingleBorder(borderElement, "top", this.theme),
      bottom: this.extractSingleBorder(borderElement, "bottom", this.theme),
      diagonal: this.extractSingleBorder(borderElement, "diagonal", this.theme),
    };
    if (border.diagonal) {
      border.diagonalUp = this.extractAttr(borderElement, "diagonalUp")?.asBool();
      border.diagonalDown = this.extractAttr(borderElement, "diagonalDown")?.asBool();
    }
    return border;
  }

  private extractSingleBorder(
    borderElement: Element,
    direction: BorderDirection,
    theme: XLSXTheme | undefined
  ): XLSXBorderDescr | undefined {
    const directionElement = this.querySelector(borderElement, direction);
    if (!directionElement || !directionElement.attributes["style"]) return undefined;
    return {
      style: this.extractAttr(directionElement, "style", {
        required: true,
        default: "thin",
      }).asString() as XLSXBorderStyle,
      color: this.extractColor(directionElement.children[0], theme, "000000")!,
    };
  }

  private extractAlignment(alignmentElement: Element): XLSXCellAlignment {
    return {
      horizontal: this.extractAttr(alignmentElement, "horizontal", {
        default: "general",
      }).asString() as XLSXHorizontalAlignment,
      vertical: this.extractAttr(alignmentElement, "vertical", {
        default: "bottom",
      }).asString() as XLSXVerticalAlignment,
      textRotation: this.extractAttr(alignmentElement, "textRotation")?.asNum(),
      wrapText: this.extractAttr(alignmentElement, "wrapText")?.asBool(),
      indent: this.extractAttr(alignmentElement, "indent")?.asNum(),
      relativeIndent: this.extractAttr(alignmentElement, "relativeIndent")?.asNum(),
      justifyLastLine: this.extractAttr(alignmentElement, "justifyLastLine")?.asBool(),
      shrinkToFit: this.extractAttr(alignmentElement, "shrinkToFit")?.asBool(),
      readingOrder: this.extractAttr(alignmentElement, "readingOrder")?.asNum(),
    };
  }

  getDxfs(): XLSXDxf[] {
    return this.mapOnElements(
      { query: "dxf", parent: this.rootFile.file.xml },
      (dxfElement): XLSXDxf => {
        const fontElement = this.querySelector(dxfElement, "font");
        const fillElement = this.querySelector(dxfElement, "fill");
        const borderElement = this.querySelector(dxfElement, "border");
        const numFmtElement = this.querySelector(dxfElement, "numFmt");
        const alignmentElement = this.querySelector(dxfElement, "alignment");

        return {
          font: fontElement ? this.extractFont(fontElement) : undefined,
          fill: fillElement ? this.extractFill(fillElement) : undefined,
          numFmt: numFmtElement ? this.extractNumFormats(numFmtElement) : undefined,
          alignment: alignmentElement ? this.extractAlignment(alignmentElement) : undefined,
          border: borderElement ? this.extractBorder(borderElement) : undefined,
        };
      }
    );
  }

  getStyles(): XLSXStyle[] {
    return this.mapOnElements(
      { query: "cellXfs xf", parent: this.rootFile.file.xml },
      (styleElement): XLSXStyle => {
        const alignmentElement = this.querySelector(styleElement, "alignment");
        return {
          fontId: this.extractAttr(styleElement, "fontId", {
            required: true,
            default: 0,
          }).asNum()!,
          fillId: this.extractAttr(styleElement, "fillId", {
            required: true,
            default: 0,
          }).asNum()!,
          borderId: this.extractAttr(styleElement, "borderId", {
            required: true,
            default: 0,
          }).asNum()!,
          numFmtId: this.extractAttr(styleElement, "numFmtId", {
            required: true,
            default: 0,
          }).asNum()!,
          alignment: alignmentElement ? this.extractAlignment(alignmentElement) : undefined,
        };
      }
    );
  }
}
