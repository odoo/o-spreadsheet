import { ExcelSheetData } from "../../../types/workbook_data";
import { XLSXSheetView } from "../../../types/xlsx";

export function constructSheetViews(sheet: ExcelSheetData): XLSXSheetView[] {
  return [
    {
      tabSelected: false,
      showFormulas: false,
      showGridLines: !!sheet.areGridLinesVisible,
      showRowColHeaders: true,
      pane: sheet.panes ?? { xSplit: 0, ySplit: 0 },
    },
  ];
}
