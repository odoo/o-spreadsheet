import { getDateTimeFormat, isValidLocale } from "../../helpers/locale";
import type { CoreCommand, Format, Locale, WorkbookData } from "../../types";
import { CommandResult, DEFAULT_LOCALE } from "../../types";
import { CorePlugin } from "./../core_plugin";

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
      for (const [cellId, cell] of Object.entries(this.getters.getCells(sheetId))) {
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
          const { col, row, sheetId } = this.getters.getCellPosition(cellId);
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
    data.settings = {
      locale: this.locale,
    };
  }
}
