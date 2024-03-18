import {
  DEFAULT_FONT_SIZE,
  DEFAULT_VERTICAL_ALIGN,
  DEFAULT_WRAPPING_MODE,
  FONT_SIZES,
} from "../constants";
import { formatValue, roundFormat } from "../helpers";
import { parseLiteral } from "../helpers/cells";
import { getDateTimeFormat } from "../helpers/locale";
import { _t } from "../translation";
import {
  Align,
  CellValue,
  DEFAULT_LOCALE,
  Format,
  PLAIN_TEXT_FORMAT,
  SpreadsheetChildEnv,
  VerticalAlign,
  Wrapping,
} from "../types";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";
import { setFormatter, setStyle } from "./menu_items_actions";

export interface NumberFormatActionSpec extends ActionSpec {
  format?: Format | ((env: SpreadsheetChildEnv) => Format);
}

/**
 * Create a format action specification for a given format.
 * The format can be dynamically computed from the environment.
 */
export function createFormatActionSpec({
  name,
  format,
  descriptionValue,
}: {
  name: string;
  descriptionValue: CellValue;
  format: Format | ((env: SpreadsheetChildEnv) => Format);
}): NumberFormatActionSpec {
  const formatCallback = typeof format === "function" ? format : () => format;
  return {
    name,
    description: (env) =>
      formatValue(descriptionValue, {
        format: formatCallback(env),
        locale: env.model.getters.getLocale(),
      }),
    execute: (env) => setFormatter(env, formatCallback(env)),
    isActive: (env) => isFormatSelected(env, formatCallback(env)),
    format,
  };
}

export const formatNumberAutomatic: NumberFormatActionSpec = {
  name: _t("Automatic"),
  execute: (env) => setFormatter(env, ""),
  isActive: (env) => isAutomaticFormatSelected(env),
};

export const formatNumberPlainText: NumberFormatActionSpec = {
  name: _t("Plain text"),
  execute: (env) => setFormatter(env, PLAIN_TEXT_FORMAT),
  isActive: (env) => isFormatSelected(env, PLAIN_TEXT_FORMAT),
};

export const formatNumberNumber = createFormatActionSpec({
  name: _t("Number"),
  descriptionValue: 1000.12,
  format: "#,##0.00",
});

export const formatPercent: ActionSpec = {
  name: _t("Format as percent"),
  execute: ACTIONS.FORMAT_PERCENT_ACTION,
  icon: "o-spreadsheet-Icon.PERCENT",
};

export const formatNumberPercent = createFormatActionSpec({
  name: _t("Percent"),
  descriptionValue: 0.1012,
  format: "0.00%",
});

export const formatNumberCurrency = createFormatActionSpec({
  name: _t("Currency"),
  descriptionValue: 1000.12,
  format: (env) => env.model.config.defaultCurrencyFormat ?? DEFAULT_CURRENCY_FORMAT,
});

export const formatNumberCurrencyRounded: NumberFormatActionSpec = {
  ...createFormatActionSpec({
    name: _t("Currency rounded"),
    descriptionValue: 1000,
    format: (env) => roundFormat(env.model.config.defaultCurrencyFormat ?? DEFAULT_CURRENCY_FORMAT),
  }),
  isVisible: (env) => {
    const currencyFormat = env.model.config.defaultCurrencyFormat;
    return currencyFormat !== roundFormat(currencyFormat ?? DEFAULT_CURRENCY_FORMAT);
  },
};

const DEFAULT_CURRENCY_FORMAT = "[$$]#,##0.00";

export const EXAMPLE_DATE = parseLiteral("2023/09/26 10:43:00 PM", DEFAULT_LOCALE);

export const formatCustomCurrency: ActionSpec = {
  name: _t("Custom currency"),
  isVisible: (env) => env.loadCurrencies !== undefined,
  execute: (env) => env.openSidePanel("CustomCurrency", {}),
};

export const formatNumberDate = createFormatActionSpec({
  name: _t("Date"),
  descriptionValue: EXAMPLE_DATE,
  format: (env) => env.model.getters.getLocale().dateFormat,
});

export const formatNumberTime = createFormatActionSpec({
  name: _t("Time"),
  descriptionValue: EXAMPLE_DATE,
  format: (env) => env.model.getters.getLocale().timeFormat,
});

export const formatNumberDateTime = createFormatActionSpec({
  name: _t("Date time"),
  descriptionValue: EXAMPLE_DATE,
  format: (env) => {
    const locale = env.model.getters.getLocale();
    return getDateTimeFormat(locale);
  },
});

export const formatNumberDuration = createFormatActionSpec({
  name: _t("Duration"),
  descriptionValue: "27:51:38",
  format: "hhhh:mm:ss",
});

export const formatNumberQuarter = createFormatActionSpec({
  name: _t("Quarter"),
  descriptionValue: EXAMPLE_DATE,
  format: "qq yyyy",
});

export const formatNumberFullQuarter = createFormatActionSpec({
  name: _t("Full quarter"),
  descriptionValue: EXAMPLE_DATE,
  format: "qqqq yyyy",
});

export const moreFormats: ActionSpec = {
  name: _t("More date formats"),
  execute: (env) => env.openSidePanel("MoreFormats", {}),
};

export const formatNumberFullDateTime = createFormatActionSpec({
  name: _t("Full date time"),
  format: "dddd d mmmm yyyy hh:mm:ss a",
  descriptionValue: EXAMPLE_DATE,
});

export const formatNumberFullWeekDayAndMonth = createFormatActionSpec({
  name: _t("Full week day and month"),
  format: "dddd d mmmm yyyy",
  descriptionValue: EXAMPLE_DATE,
});

export const formatNumberDayAndFullMonth = createFormatActionSpec({
  name: _t("Day and full month"),
  format: "d mmmm yyyy",
  descriptionValue: EXAMPLE_DATE,
});

export const formatNumberShortWeekDay = createFormatActionSpec({
  name: _t("Short week day"),
  format: "ddd d mmm yyyy",
  descriptionValue: EXAMPLE_DATE,
});

export const formatNumberDayAndShortMonth = createFormatActionSpec({
  name: _t("Day and short month"),
  format: "d mmm yyyy",
  descriptionValue: EXAMPLE_DATE,
});

export const formatNumberFullMonth = createFormatActionSpec({
  name: _t("Full month"),
  format: "mmmm yyyy",
  descriptionValue: EXAMPLE_DATE,
});

export const formatNumberShortMonth = createFormatActionSpec({
  name: _t("Short month"),
  format: "mmm yyyy",
  descriptionValue: EXAMPLE_DATE,
});

export const incraseDecimalPlaces: ActionSpec = {
  name: _t("Increase decimal places"),
  icon: "o-spreadsheet-Icon.INCREASE_DECIMAL",
  execute: (env) =>
    env.model.dispatch("SET_DECIMAL", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      step: 1,
    }),
};

export const decraseDecimalPlaces: ActionSpec = {
  name: _t("Decrease decimal places"),
  icon: "o-spreadsheet-Icon.DECRASE_DECIMAL",
  execute: (env) =>
    env.model.dispatch("SET_DECIMAL", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      step: -1,
    }),
};

export const formatBold: ActionSpec = {
  name: _t("Bold"),
  description: "Ctrl+B",
  execute: (env) => setStyle(env, { bold: !env.model.getters.getCurrentStyle().bold }),
  icon: "o-spreadsheet-Icon.BOLD",
  isActive: (env) => !!env.model.getters.getCurrentStyle().bold,
};

export const formatItalic: ActionSpec = {
  name: _t("Italic"),
  description: "Ctrl+I",
  execute: (env) => setStyle(env, { italic: !env.model.getters.getCurrentStyle().italic }),
  icon: "o-spreadsheet-Icon.ITALIC",
  isActive: (env) => !!env.model.getters.getCurrentStyle().italic,
};

export const formatUnderline: ActionSpec = {
  name: _t("Underline"),
  description: "Ctrl+U",
  execute: (env) => setStyle(env, { underline: !env.model.getters.getCurrentStyle().underline }),
  icon: "o-spreadsheet-Icon.UNDERLINE",
  isActive: (env) => !!env.model.getters.getCurrentStyle().underline,
};

export const formatStrikethrough: ActionSpec = {
  name: _t("Strikethrough"),
  execute: (env) =>
    setStyle(env, { strikethrough: !env.model.getters.getCurrentStyle().strikethrough }),
  icon: "o-spreadsheet-Icon.STRIKE",
  isActive: (env) => !!env.model.getters.getCurrentStyle().strikethrough,
};

export const formatFontSize: ActionSpec = {
  name: _t("Font size"),
  children: fontSizeMenuBuilder(),
  icon: "o-spreadsheet-Icon.FONT_SIZE",
};

export const formatAlignment: ActionSpec = {
  name: _t("Alignment"),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentHorizontal: ActionSpec = {
  name: _t("Horizontal align"),
  icon: (env) => getHorizontalAlignmentIcon(env),
};

export const formatAlignmentLeft: ActionSpec = {
  name: _t("Left"),
  description: "Ctrl+Shift+L",
  execute: (env) => ACTIONS.setStyle(env, { align: "left" }),
  isActive: (env) => getHorizontalAlign(env) === "left",
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentCenter: ActionSpec = {
  name: _t("Center"),
  description: "Ctrl+Shift+E",
  execute: (env) => ACTIONS.setStyle(env, { align: "center" }),
  isActive: (env) => getHorizontalAlign(env) === "center",
  icon: "o-spreadsheet-Icon.ALIGN_CENTER",
};

export const formatAlignmentRight: ActionSpec = {
  name: _t("Right"),
  description: "Ctrl+Shift+R",
  execute: (env) => ACTIONS.setStyle(env, { align: "right" }),
  isActive: (env) => getHorizontalAlign(env) === "right",
  icon: "o-spreadsheet-Icon.ALIGN_RIGHT",
};

export const formatAlignmentVertical: ActionSpec = {
  name: _t("Vertical align"),
  icon: (env) => getVerticalAlignmentIcon(env),
};

export const formatAlignmentTop: ActionSpec = {
  name: _t("Top"),
  execute: (env) => ACTIONS.setStyle(env, { verticalAlign: "top" }),
  isActive: (env) => getVerticalAlign(env) === "top",
  icon: "o-spreadsheet-Icon.ALIGN_TOP",
};

export const formatAlignmentMiddle: ActionSpec = {
  name: _t("Middle"),
  execute: (env) => ACTIONS.setStyle(env, { verticalAlign: "middle" }),
  isActive: (env) => getVerticalAlign(env) === "middle",
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentBottom: ActionSpec = {
  name: _t("Bottom"),
  execute: (env) => ACTIONS.setStyle(env, { verticalAlign: "bottom" }),
  isActive: (env) => getVerticalAlign(env) === "bottom",
  icon: "o-spreadsheet-Icon.ALIGN_BOTTOM",
};

export const formatWrappingIcon: ActionSpec = {
  name: _t("Wrapping"),
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrapping: ActionSpec = {
  name: _t("Wrapping"),
  icon: (env) => getWrapModeIcon(env),
};

export const formatWrappingOverflow: ActionSpec = {
  name: _t("Overflow"),
  execute: (env) => ACTIONS.setStyle(env, { wrapping: "overflow" }),
  isActive: (env) => getWrappingMode(env) === "overflow",
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingWrap: ActionSpec = {
  name: _t("Wrap"),
  execute: (env) => ACTIONS.setStyle(env, { wrapping: "wrap" }),
  isActive: (env) => getWrappingMode(env) === "wrap",
  icon: "o-spreadsheet-Icon.WRAPPING_WRAP",
};

export const formatWrappingClip: ActionSpec = {
  name: _t("Clip"),
  execute: (env) => ACTIONS.setStyle(env, { wrapping: "clip" }),
  isActive: (env) => getWrappingMode(env) === "clip",
  icon: "o-spreadsheet-Icon.WRAPPING_CLIP",
};

export const textColor: ActionSpec = {
  name: _t("Text Color"),
  icon: "o-spreadsheet-Icon.TEXT_COLOR",
};

export const fillColor: ActionSpec = {
  name: _t("Fill Color"),
  icon: "o-spreadsheet-Icon.FILL_COLOR",
};

export const formatCF: ActionSpec = {
  name: _t("Conditional formatting"),
  execute: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  icon: "o-spreadsheet-Icon.CONDITIONAL_FORMAT",
};

export const clearFormat: ActionSpec = {
  name: _t("Clear formatting"),
  description: "Ctrl+<",
  execute: (env) =>
    env.model.dispatch("CLEAR_FORMATTING", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
    }),
  icon: "o-spreadsheet-Icon.CLEAR_FORMAT",
};

function fontSizeMenuBuilder(): ActionSpec[] {
  return FONT_SIZES.map((fs) => {
    return {
      name: fs.toString(),
      sequence: fs,
      id: `font_size_${fs}`,
      execute: (env) => ACTIONS.setStyle(env, { fontSize: fs }),
      isActive: (env) => isFontSizeSelected(env, fs),
    };
  });
}

function isAutomaticFormatSelected(env: SpreadsheetChildEnv): boolean {
  const activeCell = env.model.getters.getCell(env.model.getters.getActivePosition());
  return !activeCell || !activeCell.format;
}

function isFormatSelected(env: SpreadsheetChildEnv, format: string): boolean {
  const activeCell = env.model.getters.getCell(env.model.getters.getActivePosition());
  return activeCell?.format === format;
}

function isFontSizeSelected(env: SpreadsheetChildEnv, fontSize: number): boolean {
  const currentFontSize = env.model.getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  return currentFontSize === fontSize;
}

function getHorizontalAlign(env: SpreadsheetChildEnv): Align {
  const style = env.model.getters.getCurrentStyle();
  if (style.align) {
    return style.align;
  }
  const cell = env.model.getters.getActiveCell();
  return cell.defaultAlign;
}

function getVerticalAlign(env: SpreadsheetChildEnv): VerticalAlign {
  const style = env.model.getters.getCurrentStyle();
  if (style.verticalAlign) {
    return style.verticalAlign;
  }
  return DEFAULT_VERTICAL_ALIGN;
}

function getWrappingMode(env: SpreadsheetChildEnv): Wrapping {
  const style = env.model.getters.getCurrentStyle();
  if (style.wrapping) {
    return style.wrapping;
  }
  return DEFAULT_WRAPPING_MODE;
}

function getHorizontalAlignmentIcon(env: SpreadsheetChildEnv) {
  const horizontalAlign = getHorizontalAlign(env);

  switch (horizontalAlign) {
    case "right":
      return "o-spreadsheet-Icon.ALIGN_RIGHT";
    case "center":
      return "o-spreadsheet-Icon.ALIGN_CENTER";
    default:
      return "o-spreadsheet-Icon.ALIGN_LEFT";
  }
}

function getVerticalAlignmentIcon(env: SpreadsheetChildEnv) {
  const verticalAlign = getVerticalAlign(env);

  switch (verticalAlign) {
    case "top":
      return "o-spreadsheet-Icon.ALIGN_TOP";
    case "middle":
      return "o-spreadsheet-Icon.ALIGN_MIDDLE";
    default:
      return "o-spreadsheet-Icon.ALIGN_BOTTOM";
  }
}

function getWrapModeIcon(env: SpreadsheetChildEnv) {
  const wrapMode = getWrappingMode(env);

  switch (wrapMode) {
    case "wrap":
      return "o-spreadsheet-Icon.WRAPPING_WRAP";
    case "clip":
      return "o-spreadsheet-Icon.WRAPPING_CLIP";
    default:
      return "o-spreadsheet-Icon.WRAPPING_OVERFLOW";
  }
}
