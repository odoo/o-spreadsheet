/**
 * Map of the different types of conversions warnings and their name in error messages
 */
export enum WarningTypes {
  DiagonalBorderNotSupported = "Diagonal Borders",
  BorderStyleNotSupported = "Border style",
  FillStyleNotSupported = "Fill Style",
  FontNotSupported = "Font",
  HorizontalAlignmentNotSupported = "Horizontal Alignment",
  VerticalAlignmentNotSupported = "Vertical Alignments",
  MultipleRulesCfNotSupported = "Multiple rules conditional formats",
  CfTypeNotSupported = "Conditional format type",
  CfFormatBorderNotSupported = "Borders in conditional formats",
  CfFormatAlignmentNotSupported = "Alignment in conditional formats",
  CfFormatNumFmtNotSupported = "Num formats in conditional formats",
  CfIconSetEmptyIconNotSupported = "IconSets with empty icons",
  BadlyFormattedHyperlink = "Badly formatted hyperlink",
  NumFmtIdNotSupported = "Number format",
}

export class XLSXImportWarningManager {
  _parsingWarnings: Set<string> = new Set();
  _conversionWarnings: Set<string> = new Set();

  addParsingWarning(warning: string) {
    this._parsingWarnings.add(warning);
  }

  addConversionWarning(warning: string) {
    this._conversionWarnings.add(warning);
  }

  get warnings(): string[] {
    return [...this._parsingWarnings, ...this._conversionWarnings];
  }

  /**
   * Add a warning "... is not supported" to the manager.
   *
   * @param type the type of the warning to add
   * @param name optional, name of the element that was not supported
   * @param supported optional, list of the supported elements
   */
  generateNotSupportedWarning(type: WarningTypes, name?: string, supported?: string[]) {
    let warning = `${type} ${name ? '"' + name + '" is' : "are"} not yet supported. `;
    if (supported) {
      warning += `Only ${supported.join(", ")} are currently supported.`;
    }
    if (!this._conversionWarnings.has(warning)) {
      this._conversionWarnings.add(warning);
    }
  }
}
