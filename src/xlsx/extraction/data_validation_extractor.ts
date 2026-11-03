import {
  XLSXDataValidation,
  XLSXDataValidationOperatorType,
  XLSXFileStructure,
  XLSXImportFile,
  XLSXTheme,
} from "../../types/xlsx";
import { XLSXImportWarningManager } from "../helpers/xlsx_parser_error_manager";
import { XlsxBaseExtractor } from "./base_extractor";

export class XlsxDataValidationExtractor extends XlsxBaseExtractor {
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

  public extractDataValidations(): XLSXDataValidation[] {
    const dataValidations = this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "worksheet > dataValidations > dataValidation" },
      (dvElement): XLSXDataValidation => {
        return {
          ...this.extractDataValidationAttributes(dvElement),
          sqref: this.extractAttr(dvElement, "sqref", { required: true }).asString().split(" "),
          formula1: this.extractDataValidationFormula(dvElement, "formula1")[0],
          formula2: this.extractDataValidationFormula(dvElement, "formula2")[0],
        };
      }
    );
    // Data validations referencing other sheets are stored by Excel in the x14 extension
    const extDataValidations = this.mapOnElements(
      { parent: this.rootFile.file.xml, query: "extLst x14:dataValidations > x14:dataValidation" },
      (dvElement): XLSXDataValidation => {
        return {
          ...this.extractDataValidationAttributes(dvElement),
          sqref: this.extractChildTextContent(dvElement, "xm:sqref", { required: true }).split(" "),
          formula1: this.extractDataValidationFormula(dvElement, "x14:formula1 > xm:f")[0],
          formula2: this.extractDataValidationFormula(dvElement, "x14:formula2 > xm:f")[0],
        };
      }
    );
    return [...dataValidations, ...extDataValidations];
  }

  private extractDataValidationAttributes(
    dvElement: Element
  ): Omit<XLSXDataValidation, "sqref" | "formula1" | "formula2"> {
    return {
      type: this.extractAttr(dvElement, "type", { required: true }).asString(),
      operator: this.extractAttr(dvElement, "operator", {
        default: "between",
      })?.asString() as XLSXDataValidationOperatorType,
      errorStyle: this.extractAttr(dvElement, "errorStyle")?.asString(),
      showErrorMessage: this.extractAttr(dvElement, "showErrorMessage")?.asBool(),
      errorTitle: this.extractAttr(dvElement, "errorTitle")?.asString(),
      error: this.extractAttr(dvElement, "error")?.asString(),
      showInputMessage: this.extractAttr(dvElement, "showInputMessage")?.asBool(),
      promptTitle: this.extractAttr(dvElement, "promptTitle")?.asString(),
      prompt: this.extractAttr(dvElement, "prompt")?.asString(),
      allowBlank: this.extractAttr(dvElement, "allowBlank")?.asBool(),
    };
  }

  private extractDataValidationFormula(dvElement: Element, query: string): string[] {
    return this.mapOnElements({ parent: dvElement, query }, (formulaElement): string => {
      return this.extractTextContent(formulaElement, { required: true });
    });
  }
}
