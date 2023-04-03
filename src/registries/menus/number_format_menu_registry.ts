import { _lt } from "../../translation";
import { ActionSpec, MenuItemRegistry } from "../menu_items_registry";
import * as ACTION_FORMAT from "./items/format_menu_items";

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
  });

export const formatNumberMenuItemSpec: ActionSpec = {
  name: _lt("More formats"),
  icon: "o-spreadsheet-Icon.NUMBER_FORMATS",
  children: [() => numberFormatMenuRegistry.getAll()],
};
