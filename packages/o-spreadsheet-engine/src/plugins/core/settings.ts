import { getDateTimeFormat, isValidLocale } from "../../helpers/locale";
import { CommandResult, CoreCommand } from "../../types/commands";
import { Format } from "../../types/format";
import { DEFAULT_LOCALE, Locale } from "../../types/locale";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

export class SettingsPlugin extends CorePlugin {
  static getters = ["getLocale"] as const;
  private locale: Locale = DEFAULT_LOCALE;

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_LOCALE":
        return isValidLocale(cmd.locale) ? CommandResult.Success : CommandResult.InvalidLocale;
    }
    return CommandResult.Success;
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "UPDATE_LOCALE":
        const oldLocale = this.locale;
        const newLocale = cmd.locale;
        this.history.update("locale", newLocale);
        this.changeCellsDateFormatWithLocale(oldLocale, newLocale);
        break;
    }
  }

  getLocale(): Locale {
    return this.locale;
  }

  private changeCellsDateFormatWithLocale(oldLocale: Locale, newLocale: Locale) {
    for (const sheetId of this.getters.getSheetIds()) {
      const cells = this.getters.getCells(sheetId);
      for (const cellId in cells) {
        const cell = cells[cellId];
        let formatToApply: Format | undefined;
        if (cell.format === oldLocale.dateFormat) {
          formatToApply = newLocale.dateFormat;
        }
        if (cell.format === oldLocale.timeFormat) {
          formatToApply = newLocale.timeFormat;
        }
        if (cell.format === getDateTimeFormat(oldLocale)) {
          formatToApply = getDateTimeFormat(newLocale);
        }
        if (formatToApply) {
          const { col, row, sheetId } = this.getters.getCellPosition(cell.id);
          this.dispatch("UPDATE_CELL", {
            col,
            row,
            sheetId,
            format: formatToApply,
          });
        }
      }
    }
  }

  import(data: WorkbookData) {
    this.locale = data.settings?.locale ?? DEFAULT_LOCALE;
  }

  export(data: WorkbookData) {
    data.settings = { locale: this.locale };
  }
}
