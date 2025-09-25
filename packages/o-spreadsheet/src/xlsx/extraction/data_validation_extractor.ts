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
          type: this.extractAttr(dvElement, "type", { required: true }).asString(),
          operator: this.extractAttr(dvElement, "operator", {
            default: "between",
          })?.asString() as XLSXDataValidationOperatorType,
          sqref: this.extractAttr(dvElement, "sqref", { required: true }).asString().split(" "),
          errorStyle: this.extractAttr(dvElement, "errorStyle")?.asString(),
          formula1: this.extractDataValidationFormula(dvElement, 1)[0],
          formula2: this.extractDataValidationFormula(dvElement, 2)[0],
          showErrorMessage: this.extractAttr(dvElement, "showErrorMessage")?.asBool(),
          errorTitle: this.extractAttr(dvElement, "errorTitle")?.asString(),
          error: this.extractAttr(dvElement, "error")?.asString(),
          showInputMessage: this.extractAttr(dvElement, "showInputMessage")?.asBool(),
          promptTitle: this.extractAttr(dvElement, "promptTitle")?.asString(),
          prompt: this.extractAttr(dvElement, "prompt")?.asString(),
          allowBlank: this.extractAttr(dvElement, "allowBlank")?.asBool(),
        };
      }
    );
    return dataValidations;
  }

  private extractDataValidationFormula(dvElement: Element, index: number): string[] {
    return this.mapOnElements(
      { parent: dvElement, query: `formula${index}` },
      (cfFormulaElements): string => {
        return this.extractTextContent(cfFormulaElements, { required: true });
      }
    );
  }
}
