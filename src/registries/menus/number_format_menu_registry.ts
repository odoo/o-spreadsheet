import { _lt } from "../../translation";
import { MenuItemRegistry, MenuItemSpec } from "../menu_items_registry";
import * as ACTION_FORMAT from "./items/format_menu_items";

export const numberFormatMenuRegistry = new MenuItemRegistry();

numberFormatMenuRegistry
  .add("format_number_automatic", {
    ...ACTION_FORMAT.formatNumberAutomaticMenuItem,
    sequence: 10,
    separator: true,
  })
  .add("format_number_number", {
    ...ACTION_FORMAT.formatNumberNumberMenuItem,
    sequence: 20,
  })
  .add("format_number_percent", {
    ...ACTION_FORMAT.formatNumberPercentMenuItem,
    sequence: 30,
    separator: true,
  })
  .add("format_number_currency", {
    ...ACTION_FORMAT.formatNumberCurrencyMenuItem,
    sequence: 40,
  })
  .add("format_number_currency_rounded", {
    ...ACTION_FORMAT.formatNumberCurrencyRoundedMenuItem,
    sequence: 50,
  })
  .add("format_custom_currency", {
    ...ACTION_FORMAT.formatCustomCurrencyMenuItem,
    sequence: 60,
    separator: true,
  })
  .add("format_number_date", {
    ...ACTION_FORMAT.formatNumberDateMenuItem,
    sequence: 70,
  })
  .add("format_number_time", {
    ...ACTION_FORMAT.formatNumberTimeMenuItem,
    sequence: 80,
  })
  .add("format_number_date_time", {
    ...ACTION_FORMAT.formatNumberDateTimeMenuItem,
    sequence: 90,
  })
  .add("format_number_duration", {
    ...ACTION_FORMAT.formatNumberDurationMenuItem,
    sequence: 100,
    separator: true,
  });

export const formatNumberMenuItemSpec: MenuItemSpec = {
  name: _lt("More formats"),
  icon: "o-spreadsheet-Icon.NUMBER_FORMATS",
  children: [() => numberFormatMenuRegistry.getAll()],
};
