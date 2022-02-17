import {
  ExcelIconSet,
  XLSXCfIcon,
  XLSXCfOperatorType,
  XLSXCfRule,
  XLSXCfType,
  XLSXCfValueObject,
  XLSXCfValueObjectType,
  XLSXColor,
  XLSXConditionalFormat,
  XLSXFileStructure,
  XLSXIconSet,
  XLSXImportFile,
  XLSXTheme,
} from "../../types/xlsx";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { XLSXColorScale } from "./../../types/xlsx";
import { XlsxBaseExtractor } from "./base_extractor";

export class XlsxCfExtractor extends XlsxBaseExtractor {
  theme?: XLSXTheme;

  constructor(
    sheetFile: XLSXImportFile,
    xlsxStructure: XLSXFileStructure,
    warningManager: XLSXImportWarningManager,
    theme: XLSXTheme | undefined
  ) {
    super(sheetFile, xlsxStructure, warningManager);
    this.theme = theme;
  }

  public extractConditionalFormattings(): XLSXConditionalFormat[] {
    const cfs = this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "worksheet > conditionalFormatting" },
      (cfElement): XLSXConditionalFormat => {
        return {
          // sqref = ranges on which the cf applies, separated by spaces
          sqref: this.extractAttr(cfElement, "sqref", { required: true }).asString().split(" "),
          pivot: this.extractAttr(cfElement, "pivot")?.asBool(),
          cfRules: this.extractCFRules(cfElement, this.theme),
        };
      }
    );
    // XLSX extension to OpenXml
    cfs.push(
      ...this.mapOnElements(
        { parent: this.rootFile.file.xml, query: "extLst x14:conditionalFormatting" },
        (cfElement): XLSXConditionalFormat => {
          return {
            sqref: this.extractChildTextContent(cfElement, "xm:sqref", { required: true })!.split(
              " "
            ),
            pivot: this.extractAttr(cfElement, "xm:pivot")?.asBool(),
            cfRules: this.extractCFRules(cfElement, this.theme),
          };
        }
      )
    );

    return cfs;
  }

  private extractCFRules(cfElement: Element, theme: XLSXTheme | undefined): XLSXCfRule[] {
    return this.mapOnElements(
      { parent: cfElement, query: "cfRule, x14:cfRule" },
      (cfRuleElement): XLSXCfRule => {
        const cfType: XLSXCfType = this.extractAttr(cfRuleElement, "type", {
          required: true,
        }).asString() as XLSXCfType;

        if (cfType === "dataBar") {
          // Databars are an extension to OpenXml and have a different format (XLSX §2.6.30). Do'nt bother
          // extracting them as we don't support them.
          throw new Error("Databars conditional formats are not supported.");
        }

        return {
          type: cfType,
          priority: this.extractAttr(cfRuleElement, "priority", { required: true }).asNum(),
          colorScale: this.extractCfColorScale(cfRuleElement, theme),
          formula: this.extractCfFormula(cfRuleElement),
          iconSet: this.extractCfIconSet(cfRuleElement),
          dxfId: this.extractAttr(cfRuleElement, "dxfId")?.asNum(),
          stopIfTrue: this.extractAttr(cfRuleElement, "stopIfTrue")?.asBool(),
          aboveAverage: this.extractAttr(cfRuleElement, "aboveAverage")?.asBool(),
          percent: this.extractAttr(cfRuleElement, "percent")?.asBool(),
          bottom: this.extractAttr(cfRuleElement, "bottom")?.asBool(),
          operator: this.extractAttr(cfRuleElement, "operator")?.asString() as XLSXCfOperatorType,
          text: this.extractAttr(cfRuleElement, "text")?.asString(),
          timePeriod: this.extractAttr(cfRuleElement, "timePeriod")?.asString(),
          rank: this.extractAttr(cfRuleElement, "rank")?.asNum(),
          stdDev: this.extractAttr(cfRuleElement, "stdDev")?.asNum(),
          equalAverage: this.extractAttr(cfRuleElement, "equalAverage")?.asBool(),
        };
      }
    );
  }

  private extractCfFormula(cfRulesElement: Element): string[] {
    return this.mapOnElements(
      { parent: cfRulesElement, query: "formula" },
      (cfFormulaElements): string => {
        return this.extractTextContent(cfFormulaElements, { required: true });
      }
    );
  }

  private extractCfColorScale(
    cfRulesElement: Element,
    theme: XLSXTheme | undefined
  ): XLSXColorScale | undefined {
    const colorScaleElement = this.querySelector(cfRulesElement, "colorScale");
    if (!colorScaleElement) return undefined;

    return {
      colors: this.mapOnElements(
        { parent: colorScaleElement, query: "color" },
        (colorElement): XLSXColor => {
          return this.extractColor(colorElement, theme, "ffffff");
        }
      ),
      cfvos: this.extractCFVos(colorScaleElement),
    };
  }

  private extractCfIconSet(cfRulesElement: Element): XLSXIconSet | undefined {
    const iconSetElement = this.querySelector(cfRulesElement, "iconSet, x14:iconSet");
    if (!iconSetElement) return undefined;

    return {
      iconSet: this.extractAttr(iconSetElement, "iconSet", {
        default: "3TrafficLights1",
      }).asString() as ExcelIconSet,
      showValue: this.extractAttr(iconSetElement, "showValue", { default: true }).asBool(),
      percent: this.extractAttr(iconSetElement, "percent", { default: true }).asBool(),
      reverse: this.extractAttr(iconSetElement, "reverse")?.asBool(),
      custom: this.extractAttr(iconSetElement, "custom")?.asBool(),
      cfvos: this.extractCFVos(iconSetElement),
      cfIcons: this.extractCfIcons(iconSetElement),
    };
  }

  private extractCfIcons(iconSetElement: Element): XLSXCfIcon[] | undefined {
    const icons = this.mapOnElements(
      { parent: iconSetElement, query: "cfIcon, x14:cfIcon" },
      (cfIconElement): XLSXCfIcon => {
        return {
          iconSet: this.extractAttr(cfIconElement, "iconSet", {
            required: true,
          }).asString() as ExcelIconSet,
          iconId: this.extractAttr(cfIconElement, "iconId", { required: true }).asNum(),
        };
      }
    );
    return icons.length === 0 ? undefined : icons;
  }

  private extractCFVos(parent: Element): XLSXCfValueObject[] {
    return this.mapOnElements(
      { parent, query: "cfvo, x14:cfvo" },
      (cfVoElement): XLSXCfValueObject => {
        return {
          type: this.extractAttr(cfVoElement, "type", {
            required: true,
          }).asString() as XLSXCfValueObjectType,
          gte: this.extractAttr(cfVoElement, "gte", { default: true })?.asBool(),
          value: cfVoElement.attributes["val"]
            ? this.extractAttr(cfVoElement, "val")?.asString()
            : this.extractChildTextContent(cfVoElement, "f, xm:f"),
        };
      }
    );
  }
}
