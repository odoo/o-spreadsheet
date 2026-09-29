import { isValidLocale } from "../../helpers/locale";
import { CommandResult, UpdateLocaleCommand } from "../../types/commands";
import { DEFAULT_LOCALE, Locale } from "../../types/locale";
import { WorkbookData } from "../../types/workbook_data";
import { CorePlugin } from "../core_plugin";

interface SettingsState {
  locale: Locale;
}

export class SettingsPlugin extends CorePlugin<typeof SettingsPlugin, SettingsState> {
  static readonly dependencies = [] as const;
  static getters = ["getLocale"] as const;
  private locale: Locale = DEFAULT_LOCALE;

  validators = {
    UPDATE_LOCALE: this.checkLocaleIsValid,
  };

  handlers = {
    UPDATE_LOCALE: this.onUpdateLocale,
  };

  private onUpdateLocale(cmd: UpdateLocaleCommand) {
    this.history.update("locale", cmd.locale);
  }

  private checkLocaleIsValid(cmd: UpdateLocaleCommand) {
    return isValidLocale(cmd.locale) ? CommandResult.Success : CommandResult.InvalidLocale;
  }

  getLocale(): Locale {
    return this.locale;
  }

  import(data: WorkbookData) {
    this.locale = data.settings?.locale ?? DEFAULT_LOCALE;
  }

  export(data: WorkbookData) {
    data.settings = { locale: this.locale };
  }
}
