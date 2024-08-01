import type { ActionSpec } from "../../actions/action";
import * as ACTION_FORMAT from "../../actions/format_actions";
import { _t } from "../../translation";
import { MenuItemRegistry } from "../menu_items_registry";

export const numberFormatMenuRegistry = new MenuItemRegistry();

numberFormatMenuRegistry
  .add("format_number_automatic", {
    ...ACTION_FORMAT.formatNumberAutomatic,
    sequence: 10,
    separator: true,
  })
  .add("format_number_number", {
    ...ACTION_FORMAT.formatNumberNumber,
    sequence: 20,
  })
  .add("format_number_percent", {
    ...ACTION_FORMAT.formatNumberPercent,
    sequence: 30,
    separator: true,
  })
  .add("format_number_currency", {
    ...ACTION_FORMAT.formatNumberCurrency,
    sequence: 40,
  })
  .add("format_number_currency_rounded", {
    ...ACTION_FORMAT.formatNumberCurrencyRounded,
    sequence: 50,
  })
  .add("format_custom_currency", {
    ...ACTION_FORMAT.formatCustomCurrency,
    sequence: 60,
    separator: true,
  })
  .add("format_number_date", {
    ...ACTION_FORMAT.formatNumberDate,
    sequence: 70,
  })
  .add("format_number_time", {
    ...ACTION_FORMAT.formatNumberTime,
    sequence: 80,
  })
  .add("format_number_date_time", {
    ...ACTION_FORMAT.formatNumberDateTime,
    sequence: 90,
  })
  .add("format_number_duration", {
    ...ACTION_FORMAT.formatNumberDuration,
    sequence: 100,
    separator: true,
  })
  .add("more_formats", {
    ...ACTION_FORMAT.moreFormats,
    sequence: 110,
  });

export const formatNumberMenuItemSpec: ActionSpec = {
  name: _t("More formats"),
  icon: "o-spreadsheet-Icon.NUMBER_FORMATS",
  children: [() => numberFormatMenuRegistry.getAll()],
};
