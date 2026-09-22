import * as ACTION_FORMAT from "../../actions/format_actions";
import { Registry } from "../registry";

export const numberFormatMenuRegistry = new Registry<ACTION_FORMAT.NumberFormatActionSpec>();

numberFormatMenuRegistry
  .add("format_number_automatic", {
    ...ACTION_FORMAT.formatNumberAutomatic,
    id: "format_number_automatic",
    sequence: 10,
  })
  .add("format_number_plain_text", {
    ...ACTION_FORMAT.formatNumberPlainText,
    id: "format_number_plain_text",
    sequence: 15,
    separator: true,
  })
  .add("format_number_number", {
    ...ACTION_FORMAT.formatNumberNumber,
    id: "format_number_number",
    sequence: 20,
  })
  .add("format_number_percent", {
    ...ACTION_FORMAT.formatNumberPercent,
    id: "format_number_percent",
    sequence: 30,
    separator: true,
  })
  .add("format_number_currency", {
    ...ACTION_FORMAT.formatNumberCurrency,
    id: "format_number_currency",
    sequence: 40,
  })
  .add("format_number_accounting", {
    ...ACTION_FORMAT.formatNumberAccounting,
    id: "format_number_accounting",
    sequence: 45,
  })
  .add("format_number_currency_rounded", {
    ...ACTION_FORMAT.formatNumberCurrencyRounded,
    id: "format_number_currency_rounded",
    sequence: 50,
  })
  .add("format_custom_currency", {
    ...ACTION_FORMAT.formatCustomCurrency,
    id: "format_custom_currency",
    sequence: 60,
    separator: true,
  })
  .add("format_number_date", {
    ...ACTION_FORMAT.formatNumberDate,
    id: "format_number_date",
    sequence: 70,
  })
  .add("format_number_time", {
    ...ACTION_FORMAT.formatNumberTime,
    id: "format_number_time",
    sequence: 80,
  })
  .add("format_number_date_time", {
    ...ACTION_FORMAT.formatNumberDateTime,
    id: "format_number_date_time",
    sequence: 90,
  })
  .add("format_number_duration", {
    ...ACTION_FORMAT.formatNumberDuration,
    id: "format_number_duration",
    sequence: 100,
    separator: true,
  })
  .add("more_formats", {
    ...ACTION_FORMAT.moreFormats,
    id: "more_formats",
    sequence: 120,
  });
