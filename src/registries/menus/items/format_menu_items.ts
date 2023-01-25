import { NumberFormatTerms } from "../../../components/translations_terms";
import { DEFAULT_FONT_SIZE, FONT_SIZES } from "../../../constants";
import { _lt } from "../../../translation";
import { MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const formatNumberMenuItem: MenuItemSpec = {
  name: _lt("Numbers"),
};

export const formatNumberAutomaticMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Automatic,
  action: ACTIONS.FORMAT_AUTOMATIC_ACTION,
  isActive: (env) => isAutomaticFormatSelected(env),
};

export const formatNumberNumberMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Number,
  description: "1,000.12",
  action: ACTIONS.FORMAT_NUMBER_ACTION,
  isActive: (env) => isFormatSelected(env, "#,##0.00"),
};

export const formatNumberPercentMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Percent,
  description: "10.12%",
  action: ACTIONS.FORMAT_PERCENT_ACTION,
  isActive: (env) => isFormatSelected(env, "0.00%"),
};

export const formatNumberCurrencyMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Currency,
  description: "$1,000.12",
  action: ACTIONS.FORMAT_CURRENCY_ACTION,
  isActive: (env) => isFormatSelected(env, "[$$]#,##0.00"),
};

export const formatNumberCurrencyRoundedMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.CurrencyRounded,
  description: "$1,000",
  action: ACTIONS.FORMAT_CURRENCY_ROUNDED_ACTION,
  isActive: (env) => isFormatSelected(env, "[$$]#,##0"),
};

export const formatCustomCurrencyMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.CustomCurrency,
  isVisible: (env) => env.loadCurrencies !== undefined,
  action: ACTIONS.OPEN_CUSTOM_CURRENCY_SIDEPANEL_ACTION,
};

export const formatNumberDateMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Date,
  description: "9/26/2008",
  action: ACTIONS.FORMAT_DATE_ACTION,
  isActive: (env) => isFormatSelected(env, "m/d/yyyy"),
};

export const formatNumberTimeMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Time,
  description: "10:43:00 PM",
  action: ACTIONS.FORMAT_TIME_ACTION,
  isActive: (env) => isFormatSelected(env, "hh:mm:ss a"),
};

export const formatNumberDateTimeMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.DateTime,
  description: "9/26/2008 22:43:00",
  action: ACTIONS.FORMAT_DATE_TIME_ACTION,
  isActive: (env) => isFormatSelected(env, "m/d/yyyy hh:mm:ss"),
};

export const formatNumberDurationMenuItem: MenuItemSpec = {
  name: NumberFormatTerms.Duration,
  description: "27:51:38",
  action: ACTIONS.FORMAT_DURATION_ACTION,
  isActive: (env) => isFormatSelected(env, "hhhh:mm:ss"),
};

export const formatBoldMenuItem: MenuItemSpec = {
  name: _lt("Bold"),
  description: "Ctrl+B",
  action: ACTIONS.FORMAT_BOLD_ACTION,
  icon: "o-spreadsheet-Icon.BOLD",
};

export const formatItalicMenuItem: MenuItemSpec = {
  name: _lt("Italic"),
  description: "Ctrl+I",
  action: ACTIONS.FORMAT_ITALIC_ACTION,
  icon: "o-spreadsheet-Icon.ITALIC",
};

export const formatUnderlineMenuItem: MenuItemSpec = {
  name: _lt("Underline"),
  description: "Ctrl+U",
  action: ACTIONS.FORMAT_UNDERLINE_ACTION,
  icon: "o-spreadsheet-Icon.UNDERLINE",
};

export const formatStrikethroughMenuItem: MenuItemSpec = {
  name: _lt("Strikethrough"),
  action: ACTIONS.FORMAT_STRIKETHROUGH_ACTION,
  icon: "o-spreadsheet-Icon.STRIKE",
};

export const formatFontSizeMenuItem: MenuItemSpec = {
  name: _lt("Font size"),
  children: fontSizeMenuBuilder(),
};

export const formatAlignmentMenuItem: MenuItemSpec = {
  name: _lt("Alignment"),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentLeftMenuItem: MenuItemSpec = {
  name: _lt("Left"),
  action: (env) => ACTIONS.setStyle(env, { align: "left" }),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentCenterMenuItem: MenuItemSpec = {
  name: _lt("Center"),
  action: (env) => ACTIONS.setStyle(env, { align: "center" }),
  icon: "o-spreadsheet-Icon.ALIGN_CENTER",
};

export const formatAlignmentRightMenuItem: MenuItemSpec = {
  name: _lt("Right"),
  action: (env) => ACTIONS.setStyle(env, { align: "right" }),
  icon: "o-spreadsheet-Icon.ALIGN_RIGHT",
};

export const formatAlignmentTopMenuItem: MenuItemSpec = {
  name: _lt("Top"),
  action: (env) => ACTIONS.setStyle(env, { verticalAlign: "top" }),
  icon: "o-spreadsheet-Icon.ALIGN_TOP",
};

export const formatAlignmentMiddleMenuItem: MenuItemSpec = {
  name: _lt("Middle"),
  action: (env) => ACTIONS.setStyle(env, { verticalAlign: "middle" }),
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentBottomMenuItem: MenuItemSpec = {
  name: _lt("Bottom"),
  action: (env) => ACTIONS.setStyle(env, { verticalAlign: "bottom" }),
  icon: "o-spreadsheet-Icon.ALIGN_BOTTOM",
};

export const formatWrappingMenuItem: MenuItemSpec = {
  name: _lt("Wrapping"),
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingOverflowMenuItem: MenuItemSpec = {
  name: _lt("Overflow"),
  action: (env) => ACTIONS.setStyle(env, { wrapping: "overflow" }),
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingWrapMenuItem: MenuItemSpec = {
  name: _lt("Wrap"),
  action: (env) => ACTIONS.setStyle(env, { wrapping: "wrap" }),
  icon: "o-spreadsheet-Icon.WRAPPING_WRAP",
};

export const formatWrappingClipMenuItem: MenuItemSpec = {
  name: _lt("Clip"),
  action: (env) => ACTIONS.setStyle(env, { wrapping: "clip" }),
  icon: "o-spreadsheet-Icon.WRAPPING_CLIP",
};

export const formatCFMenuItem: MenuItemSpec = {
  name: _lt("Conditional formatting"),
  action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
};

export const clearFormatMenuItem: MenuItemSpec = {
  name: _lt("Clear formatting"),
  action: ACTIONS.FORMAT_CLEARFORMAT_ACTION,
  icon: "o-spreadsheet-Icon.CLEAR_FORMAT",
};

function fontSizeMenuBuilder(): MenuItemSpec[] {
  return FONT_SIZES.map((fs) => {
    return {
      name: fs.toString(),
      sequence: fs,
      id: `font_size_${fs}`,
      action: (env) => ACTIONS.setStyle(env, { fontSize: fs }),
      isActive: (env) => isFontSizeSelected(env, fs),
    };
  });
}

function isAutomaticFormatSelected(env): boolean {
  const activeCell = env.model.getters.getActiveCell();
  return !activeCell || !activeCell.format;
}

function isFormatSelected(env, format: string): boolean {
  const activeCell = env.model.getters.getActiveCell();
  return activeCell && activeCell.format === format;
}

function isFontSizeSelected(env, fontSize: number): boolean {
  const currentFontSize = env.model.getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  return currentFontSize === fontSize;
}
