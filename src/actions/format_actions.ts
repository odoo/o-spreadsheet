import { DEFAULT_FONT_SIZE, DEFAULT_VERTICAL_ALIGN, FONT_SIZES } from "../constants";
import { formatValue, roundFormat } from "../helpers";
import { parseLiteral } from "../helpers/cells";
import { _lt } from "../translation";
import { Align, DEFAULT_LOCALE, SpreadsheetChildEnv } from "../types";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";
import { setFormatter, setStyle } from "./menu_items_actions";

export const formatNumberAutomatic: ActionSpec = {
  name: _lt("Automatic"),
  execute: (env) => setFormatter(env, ""),
  isActive: (env) => isAutomaticFormatSelected(env),
};

export const formatNumberNumber: ActionSpec = {
  name: _lt("Number"),
  description: (env) =>
    formatValue(1000.12, {
      format: "#,##0.00",
      locale: env.model.getters.getLocale(),
    }),
  execute: (env) => setFormatter(env, "#,##0.00"),
  isActive: (env) => isFormatSelected(env, "#,##0.00"),
};

export const formatPercent: ActionSpec = {
  name: _lt("Format as percent"),
  execute: ACTIONS.FORMAT_PERCENT_ACTION,
  icon: "o-spreadsheet-Icon.PERCENT",
};

export const formatNumberPercent: ActionSpec = {
  name: _lt("Percent"),
  description: (env) =>
    formatValue(0.1012, {
      format: "0.00%",
      locale: env.model.getters.getLocale(),
    }),
  execute: ACTIONS.FORMAT_PERCENT_ACTION,
  isActive: (env) => isFormatSelected(env, "0.00%"),
};

export const formatNumberCurrency: ActionSpec = {
  name: _lt("Currency"),
  description: (env) =>
    formatValue(1000.12, {
      format: env.model.config.defaultCurrencyFormat,
      locale: env.model.getters.getLocale(),
    }),
  execute: (env) => setFormatter(env, env.model.config.defaultCurrencyFormat),
  isActive: (env) => isFormatSelected(env, env.model.config.defaultCurrencyFormat),
};

export const formatNumberCurrencyRounded: ActionSpec = {
  name: _lt("Currency rounded"),
  description: (env) =>
    formatValue(1000, {
      format: roundFormat(env.model.config.defaultCurrencyFormat),
      locale: env.model.getters.getLocale(),
    }),
  execute: (env) => setFormatter(env, roundFormat(env.model.config.defaultCurrencyFormat)),
  isActive: (env) => isFormatSelected(env, roundFormat(env.model.config.defaultCurrencyFormat)),
  isVisible: (env) => {
    const currencyFormat = env.model.config.defaultCurrencyFormat;
    return currencyFormat !== roundFormat(currencyFormat);
  },
};

export const formatCustomCurrency: ActionSpec = {
  name: _lt("Custom currency"),
  isVisible: (env) => env.loadCurrencies !== undefined,
  execute: (env) => env.openSidePanel("CustomCurrency", {}),
};

export const formatNumberDate: ActionSpec = {
  name: _lt("Date"),
  description: (env) => {
    const locale = env.model.getters.getLocale();
    return formatValue(parseLiteral("9/26/2023", DEFAULT_LOCALE), {
      format: locale.dateFormat,
      locale,
    });
  },
  execute: (env) => setFormatter(env, env.model.getters.getLocale().dateFormat),
  isActive: (env) => isFormatSelected(env, env.model.getters.getLocale().dateFormat),
};

export const formatNumberTime: ActionSpec = {
  name: _lt("Time"),
  description: (env) => {
    const locale = env.model.getters.getLocale();
    return formatValue(parseLiteral("9/26/2023 10:43:00 PM", DEFAULT_LOCALE), {
      format: locale.timeFormat,
      locale,
    });
  },
  execute: (env) => setFormatter(env, env.model.getters.getLocale().timeFormat),
  isActive: (env) => isFormatSelected(env, env.model.getters.getLocale().timeFormat),
};

export const formatNumberDateTime: ActionSpec = {
  name: _lt("Date time"),
  description: (env) => {
    const locale = env.model.getters.getLocale();
    return formatValue(parseLiteral("9/26/2023 22:43:00", DEFAULT_LOCALE), {
      format: locale.dateFormat + " " + locale.timeFormat,
      locale,
    });
  },
  execute: (env) => {
    const locale = env.model.getters.getLocale();
    setFormatter(env, locale.dateFormat + " " + locale.timeFormat);
  },
  isActive: (env) => {
    const locale = env.model.getters.getLocale();
    return isFormatSelected(env, locale.dateFormat + " " + locale.timeFormat);
  },
};

export const formatNumberDuration: ActionSpec = {
  name: _lt("Duration"),
  description: "27:51:38",
  execute: (env) => setFormatter(env, "hhhh:mm:ss"),
  isActive: (env) => isFormatSelected(env, "hhhh:mm:ss"),
};

export const incraseDecimalPlaces: ActionSpec = {
  name: _lt("Increase decimal places"),
  icon: "o-spreadsheet-Icon.INCREASE_DECIMAL",
  execute: (env) =>
    env.model.dispatch("SET_DECIMAL", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      step: 1,
    }),
};

export const decraseDecimalPlaces: ActionSpec = {
  name: _lt("Decrease decimal places"),
  icon: "o-spreadsheet-Icon.DECRASE_DECIMAL",
  execute: (env) =>
    env.model.dispatch("SET_DECIMAL", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      step: -1,
    }),
};

export const formatBold: ActionSpec = {
  name: _lt("Bold"),
  description: "Ctrl+B",
  execute: (env) => setStyle(env, { bold: !env.model.getters.getCurrentStyle().bold }),
  icon: "o-spreadsheet-Icon.BOLD",
  isActive: (env) => !!env.model.getters.getCurrentStyle().bold,
};

export const formatItalic: ActionSpec = {
  name: _lt("Italic"),
  description: "Ctrl+I",
  execute: (env) => setStyle(env, { italic: !env.model.getters.getCurrentStyle().italic }),
  icon: "o-spreadsheet-Icon.ITALIC",
  isActive: (env) => !!env.model.getters.getCurrentStyle().italic,
};

export const formatUnderline: ActionSpec = {
  name: _lt("Underline"),
  description: "Ctrl+U",
  execute: (env) => setStyle(env, { underline: !env.model.getters.getCurrentStyle().underline }),
  icon: "o-spreadsheet-Icon.UNDERLINE",
  isActive: (env) => !!env.model.getters.getCurrentStyle().underline,
};

export const formatStrikethrough: ActionSpec = {
  name: _lt("Strikethrough"),
  execute: (env) =>
    setStyle(env, { strikethrough: !env.model.getters.getCurrentStyle().strikethrough }),
  icon: "o-spreadsheet-Icon.STRIKE",
  isActive: (env) => !!env.model.getters.getCurrentStyle().strikethrough,
};

export const formatFontSize: ActionSpec = {
  name: _lt("Font size"),
  children: fontSizeMenuBuilder(),
  icon: "o-spreadsheet-Icon.FONT_SIZE",
};

export const formatAlignment: ActionSpec = {
  name: _lt("Alignment"),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentHorizontal: ActionSpec = {
  name: _lt("Horizontal align"),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentLeft: ActionSpec = {
  name: _lt("Left"),
  description: "Ctrl+Shift+L",
  execute: (env) => ACTIONS.setStyle(env, { align: "left" }),
  isActive: (env) => getHorizontalAlign(env) === "left",
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentCenter: ActionSpec = {
  name: _lt("Center"),
  description: "Ctrl+Shift+E",
  execute: (env) => ACTIONS.setStyle(env, { align: "center" }),
  isActive: (env) => getHorizontalAlign(env) === "center",
  icon: "o-spreadsheet-Icon.ALIGN_CENTER",
};

export const formatAlignmentRight: ActionSpec = {
  name: _lt("Right"),
  description: "Ctrl+Shift+R",
  execute: (env) => ACTIONS.setStyle(env, { align: "right" }),
  isActive: (env) => getHorizontalAlign(env) === "right",
  icon: "o-spreadsheet-Icon.ALIGN_RIGHT",
};

export const formatAlignmentVertical: ActionSpec = {
  name: _lt("Vertical align"),
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentTop: ActionSpec = {
  name: _lt("Top"),
  execute: (env) => ACTIONS.setStyle(env, { verticalAlign: "top" }),
  isActive: (env) =>
    (env.model.getters.getCurrentStyle().verticalAlign || DEFAULT_VERTICAL_ALIGN) === "top",
  icon: "o-spreadsheet-Icon.ALIGN_TOP",
};

export const formatAlignmentMiddle: ActionSpec = {
  name: _lt("Middle"),
  execute: (env) => ACTIONS.setStyle(env, { verticalAlign: "middle" }),
  isActive: (env) =>
    (env.model.getters.getCurrentStyle().verticalAlign || DEFAULT_VERTICAL_ALIGN) === "middle",
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentBottom: ActionSpec = {
  name: _lt("Bottom"),
  execute: (env) => ACTIONS.setStyle(env, { verticalAlign: "bottom" }),
  isActive: (env) =>
    (env.model.getters.getCurrentStyle().verticalAlign || DEFAULT_VERTICAL_ALIGN) === "bottom",
  icon: "o-spreadsheet-Icon.ALIGN_BOTTOM",
};

export const formatWrapping: ActionSpec = {
  name: _lt("Wrapping"),
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingOverflow: ActionSpec = {
  name: _lt("Overflow"),
  execute: (env) => ACTIONS.setStyle(env, { wrapping: "overflow" }),
  isActive: (env) => (env.model.getters.getCurrentStyle().wrapping || "overflow") === "overflow",
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingWrap: ActionSpec = {
  name: _lt("Wrap"),
  execute: (env) => ACTIONS.setStyle(env, { wrapping: "wrap" }),
  isActive: (env) => env.model.getters.getCurrentStyle().wrapping === "wrap",
  icon: "o-spreadsheet-Icon.WRAPPING_WRAP",
};

export const formatWrappingClip: ActionSpec = {
  name: _lt("Clip"),
  execute: (env) => ACTIONS.setStyle(env, { wrapping: "clip" }),
  isActive: (env) => env.model.getters.getCurrentStyle().wrapping === "clip",
  icon: "o-spreadsheet-Icon.WRAPPING_CLIP",
};

export const textColor: ActionSpec = {
  name: _lt("Text Color"),
  icon: "o-spreadsheet-Icon.TEXT_COLOR",
};

export const fillColor: ActionSpec = {
  name: _lt("Fill Color"),
  icon: "o-spreadsheet-Icon.FILL_COLOR",
};

export const formatCF: ActionSpec = {
  name: _lt("Conditional formatting"),
  execute: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
  icon: "o-spreadsheet-Icon.CONDITIONAL_FORMAT",
};

export const paintFormat: ActionSpec = {
  name: _lt("Paint Format"),
  execute: (env) =>
    env.model.dispatch("ACTIVATE_PAINT_FORMAT", {
      target: env.model.getters.getSelectedZones(),
    }),
  icon: "o-spreadsheet-Icon.PAINT_FORMAT",
  isActive: (env) => env.model.getters.isPaintingFormat(),
};

export const clearFormat: ActionSpec = {
  name: _lt("Clear formatting"),
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
