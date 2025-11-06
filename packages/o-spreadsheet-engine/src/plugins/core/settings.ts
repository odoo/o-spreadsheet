import { isValidLocale } from "../../helpers/locale";
import { CommandResult, CoreCommand } from "../../types/commands";
import { Format, LocaleFormat } from "../../types/format";
import { DEFAULT_LOCALE, Locale } from "../../types/locale";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

export class SettingsPlugin extends CorePlugin {
  static getters = ["getLocale", "getLocaleFormat"] as const;
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
        this.history.update("locale", cmd.locale);
        break;
    }
  }

  getLocale(): Locale {
    return this.locale;
  }

  getLocaleFormat(format?: Format): LocaleFormat {
    return { locale: this.locale, format };
  }

  import(data: WorkbookData) {
    this.locale = data.settings?.locale ?? DEFAULT_LOCALE;
  }

  export(data: WorkbookData) {
    data.settings = { locale: this.locale };
  }
}
