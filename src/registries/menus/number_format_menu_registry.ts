import { Registry } from "@odoo/o-spreadsheet-engine/registries/registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { ActionSpec } from "../../actions/action";
import * as ACTION_FORMAT from "../../actions/format_actions";
import { isDateTimeFormat, memoize } from "../../helpers";
import { Format } from "../../types";

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
    separator: false,
  })
  .add("format_number_scientific", {
    ...ACTION_FORMAT.formatNumberScientific,
    id: "format_number_scientific",
    sequence: 33,
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
  .add("format_custom_currency", {
    ...ACTION_FORMAT.formatCustomCurrency,
    id: "format_custom_currency",
    sequence: 120,
  })
  .add("format_custom_date", {
    ...ACTION_FORMAT.customDateFormat,
    id: "format_custom_date",
    sequence: 130,
  })
  .add("format_custom_number", {
    ...ACTION_FORMAT.customNumberFormat,
    id: "format_custom_number",
    sequence: 140,
  });

export function getCustomNumberFormats(
  env: SpreadsheetChildEnv
): ACTION_FORMAT.NumberFormatActionSpec[] {
  const defaultFormats = new Set(
    numberFormatMenuRegistry
      .getAll()
      .map((f) => (typeof f.format === "function" ? f.format(env) : f.format))
  );

  const customFormats = new Map<Format, ACTION_FORMAT.NumberFormatActionSpec>();
  for (const sheetId of env.model.getters.getSheetIds()) {
    const zoneFormats = env.model.getters.getZoneFormats(sheetId);
    for (const zoneFormat of zoneFormats) {
      const format = zoneFormat.format;
      if (format && !customFormats.has(format) && !defaultFormats.has(format)) {
        const formatType = getNumberFormatType(format);
        if (formatType === "date" || formatType === "currency") {
          customFormats.set(
            format,
            ACTION_FORMAT.createFormatActionSpec({
              descriptionValue: formatType === "currency" ? 1000 : ACTION_FORMAT.EXAMPLE_DATE,
              format: format,
              name: format,
            })
          );
        }
      }
    }
  }
  return [...customFormats.values()];
}

const getNumberFormatType = memoize((format: Format) => {
  if (isDateTimeFormat(format)) {
    return "date";
  } else if (format.includes("[$")) {
    return "currency";
  }
  return "number";
});

export const formatNumberMenuItemSpec: ActionSpec = {
  name: _t("More formats"),
  icon: "o-spreadsheet-Icon.NUMBER_FORMATS",
  children: [
    (env) => {
      const customFormats = getCustomNumberFormats(env).map((action) => ({
        ...action,
        sequence: 110,
      }));
      if (customFormats.length > 0) {
        customFormats[customFormats.length - 1].separator = true;
      }
      return [...numberFormatMenuRegistry.getAll(), ...customFormats];
    },
  ],
};
