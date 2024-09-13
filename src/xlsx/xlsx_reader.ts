import { DEFAULT_REVISION_ID } from "../constants";
import { removeFalsyAttributes } from "../helpers";
import { _t } from "../translation";
import {
  ImportedFiles,
  XLSXExternalBook,
  XLSXFileStructure,
  XLSXImageFile,
  XLSXImportData,
  XLSXWorksheet,
  XLSXXmlDocuments,
  XMLString,
} from "../types/xlsx";
import { WorkbookData } from "./../types/workbook_data";
import { CONTENT_TYPES } from "./constants";
import {
  convertBorders,
  convertFormats,
  convertSheets,
  convertStyles,
  convertTables,
} from "./conversion";
import { XlsxMiscExtractor, XlsxSheetExtractor, XlsxStyleExtractor } from "./extraction";
import { XlsxExternalBookExtractor } from "./extraction/external_book_extractor";
import { getXLSXFilesOfType } from "./helpers/xlsx_helper";
import { XLSXImportWarningManager } from "./helpers/xlsx_parser_error_manager";
import { escapeTagNamespaces, parseXML } from "./helpers/xml_helpers";

const EXCEL_IMPORT_VERSION = 21;

export class XlsxReader {
  warningManager: XLSXImportWarningManager;
  xmls: XLSXXmlDocuments;
  images: XLSXImageFile[];

  constructor(files: ImportedFiles) {
    this.warningManager = new XLSXImportWarningManager();

    this.xmls = {};
    this.images = [];
    for (let key of Object.keys(files)) {
      // Random files can be in xlsx (like a bin file for printer settings)
      if (key.endsWith(".xml") || key.endsWith(".rels")) {
        const contentString = escapeTagNamespaces(files[key] as string);

        this.xmls[key] = parseXML(new XMLString(contentString));
      } else if (key.includes("media/image")) {
        this.images.push({
          fileName: key,
          imageSrc: files[key]["imageSrc"],
        });
      }
    }
  }

  convertXlsx(): WorkbookData {
    const xlsxData = this.getXlsxData();
    const convertedData = this.convertImportedData(xlsxData);
    return convertedData;
  }

  // ---------------------------------------------------------------------------
  // Parsing XMLs
  // ---------------------------------------------------------------------------

  private getXlsxData(): XLSXImportData {
    const xlsxFileStructure = this.buildXlsxFileStructure();

    const theme = xlsxFileStructure.theme
      ? new XlsxMiscExtractor(
          xlsxFileStructure.theme,
          xlsxFileStructure,
          this.warningManager
        ).getTheme()
      : undefined;

    const sharedStrings = xlsxFileStructure.sharedStrings
      ? new XlsxMiscExtractor(
          xlsxFileStructure.sharedStrings,
          xlsxFileStructure,
          this.warningManager
        ).getSharedStrings()
      : [];

    // Sort sheets by file name : the sheets will always be named sheet1.xml, sheet2.xml, ... in order
    const sheets = xlsxFileStructure.sheets
      .sort((a, b) => a.file.fileName.localeCompare(b.file.fileName, undefined, { numeric: true }))
      .map((sheetFile): XLSXWorksheet => {
        return new XlsxSheetExtractor(
          sheetFile,
          xlsxFileStructure,
          this.warningManager,
          theme
        ).getSheet();
      });

    const externalBooks = xlsxFileStructure.externalLinks.map(
      (externalLinkFile): XLSXExternalBook => {
        return new XlsxExternalBookExtractor(
          externalLinkFile,
          xlsxFileStructure,
          this.warningManager
        ).getExternalBook();
      }
    );

    const styleExtractor = new XlsxStyleExtractor(xlsxFileStructure, this.warningManager, theme);

    return {
      fonts: styleExtractor.getFonts(),
      fills: styleExtractor.getFills(),
      borders: styleExtractor.getBorders(),
      dxfs: styleExtractor.getDxfs(),
      numFmts: styleExtractor.getNumFormats(),
      styles: styleExtractor.getStyles(),
      sheets: sheets,
      sharedStrings,
      externalBooks,
    };
  }

  private buildXlsxFileStructure(): XLSXFileStructure {
    const xlsxFileStructure = {
      sheets: getXLSXFilesOfType(CONTENT_TYPES.sheet, this.xmls),
      workbook: getXLSXFilesOfType(CONTENT_TYPES.workbook, this.xmls)[0],
      styles: getXLSXFilesOfType(CONTENT_TYPES.styles, this.xmls)[0],
      sharedStrings: getXLSXFilesOfType(CONTENT_TYPES.sharedStrings, this.xmls)[0],
      theme: getXLSXFilesOfType(CONTENT_TYPES.themes, this.xmls)[0],
      charts: getXLSXFilesOfType(CONTENT_TYPES.chart, this.xmls),
      figures: getXLSXFilesOfType(CONTENT_TYPES.drawing, this.xmls),
      tables: getXLSXFilesOfType(CONTENT_TYPES.table, this.xmls),
      pivots: getXLSXFilesOfType(CONTENT_TYPES.pivot, this.xmls),
      externalLinks: getXLSXFilesOfType(CONTENT_TYPES.externalLink, this.xmls),
      images: this.images,
    };

    if (!xlsxFileStructure.workbook.rels) {
      throw Error(_t("Cannot find workbook relations file"));
    }

    return xlsxFileStructure;
  }

  // ---------------------------------------------------------------------------
  // Conversion
  // ---------------------------------------------------------------------------

  convertImportedData(data: XLSXImportData): WorkbookData {
    const convertedData = {
      version: EXCEL_IMPORT_VERSION,
      sheets: convertSheets(data, this.warningManager),
      styles: convertStyles(data, this.warningManager),
      formats: convertFormats(data, this.warningManager),
      borders: convertBorders(data, this.warningManager),
      revisionId: DEFAULT_REVISION_ID,
    } as WorkbookData;

    convertTables(convertedData, data);

    // Remove falsy attributes in styles. Not mandatory, but make objects more readable when debugging
    Object.keys(data.styles).map((key) => {
      data.styles[key] = removeFalsyAttributes(data.styles[key]);
    });

    return convertedData;
  }
}
