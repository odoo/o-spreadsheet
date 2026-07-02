import { getDateTimeFormat, isValidLocale } from "../../helpers/locale";
import { UuidGenerator } from "../../helpers/uuid";
import { CommandResult, CoreCommand } from "../../types/commands";
import { Format } from "../../types/format";
import { DEFAULT_LOCALE, Locale } from "../../types/locale";
import { UID } from "../../types/misc";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

export class SettingsPlugin extends CorePlugin {
  static getters = ["getLocale", "getSpreadsheetUuid"] as const;
  private locale: Locale = DEFAULT_LOCALE;
  private uuid: UID = "";

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

  getSpreadsheetUuid(): UID {
    return this.uuid;
  }

  private changeCellsDateFormatWithLocale(oldLocale: Locale, newLocale: Locale) {
    for (const sheetId of this.getters.getSheetIds()) {
      for (const cell of this.getters.getCells(sheetId)) {
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
    // `load()` back-fills a uuid on every document, but guard anyway so a model
    // built from raw data still gets a stable identity.
    this.uuid = data.uuid || UuidGenerator.uuidv4();
  }

  export(data: WorkbookData) {
    data.settings = { locale: this.locale };
    data.uuid = this.uuid;
  }
}
