import { DEFAULT_FONT_SIZE, DEFAULT_VERTICAL_ALIGN, FONT_SIZES } from "../../../constants";
import { _lt } from "../../../translation";
import { Align, BorderCommand, SpreadsheetChildEnv } from "../../../types";
import { MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const formatNumberAutomaticMenuItem: MenuItemSpec = {
  name: _lt("Automatic"),
  action: ACTIONS.FORMAT_AUTOMATIC_ACTION,
  isActive: (env) => isAutomaticFormatSelected(env),
};

export const formatNumberNumberMenuItem: MenuItemSpec = {
  name: _lt("Number"),
  description: "1,000.12",
  action: ACTIONS.FORMAT_NUMBER_ACTION,
  isActive: (env) => isFormatSelected(env, "#,##0.00"),
};

export const formatPercentMenuItem: MenuItemSpec = {
  name: _lt("Format as percent"),
  action: ACTIONS.FORMAT_PERCENT_ACTION,
  icon: "o-spreadsheet-Icon.PERCENT",
};

export const formatNumberPercentMenuItem: MenuItemSpec = {
  name: _lt("Percent"),
  description: "10.12%",
  action: ACTIONS.FORMAT_PERCENT_ACTION,
  isActive: (env) => isFormatSelected(env, "0.00%"),
};

export const formatNumberCurrencyMenuItem: MenuItemSpec = {
  name: _lt("Currency"),
  description: "$1,000.12",
  action: ACTIONS.FORMAT_CURRENCY_ACTION,
  isActive: (env) => isFormatSelected(env, "[$$]#,##0.00"),
};

export const formatNumberCurrencyRoundedMenuItem: MenuItemSpec = {
  name: _lt("Currency rounded"),
  description: "$1,000",
  action: ACTIONS.FORMAT_CURRENCY_ROUNDED_ACTION,
  isActive: (env) => isFormatSelected(env, "[$$]#,##0"),
};

export const formatCustomCurrencyMenuItem: MenuItemSpec = {
  name: _lt("Custom currency"),
  isVisible: (env) => env.loadCurrencies !== undefined,
  action: ACTIONS.OPEN_CUSTOM_CURRENCY_SIDEPANEL_ACTION,
};

export const formatNumberDateMenuItem: MenuItemSpec = {
  name: _lt("Date"),
  description: "9/26/2008",
  action: ACTIONS.FORMAT_DATE_ACTION,
  isActive: (env) => isFormatSelected(env, "m/d/yyyy"),
};

export const formatNumberTimeMenuItem: MenuItemSpec = {
  name: _lt("Time"),
  description: "10:43:00 PM",
  action: ACTIONS.FORMAT_TIME_ACTION,
  isActive: (env) => isFormatSelected(env, "hh:mm:ss a"),
};

export const formatNumberDateTimeMenuItem: MenuItemSpec = {
  name: _lt("Date time"),
  description: "9/26/2008 22:43:00",
  action: ACTIONS.FORMAT_DATE_TIME_ACTION,
  isActive: (env) => isFormatSelected(env, "m/d/yyyy hh:mm:ss"),
};

export const formatNumberDurationMenuItem: MenuItemSpec = {
  name: _lt("Duration"),
  description: "27:51:38",
  action: ACTIONS.FORMAT_DURATION_ACTION,
  isActive: (env) => isFormatSelected(env, "hhhh:mm:ss"),
};

export const incraseDecimalPlacesMenuItem: MenuItemSpec = {
  name: _lt("Increase decimal places"),
  icon: "o-spreadsheet-Icon.INCREASE_DECIMAL",
  action: (env) =>
    env.model.dispatch("SET_DECIMAL", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      step: 1,
    }),
};

export const decraseDecimalPlacesMenuItem: MenuItemSpec = {
  name: _lt("Decrease decimal places"),
  icon: "o-spreadsheet-Icon.DECRASE_DECIMAL",
  action: (env) =>
    env.model.dispatch("SET_DECIMAL", {
      sheetId: env.model.getters.getActiveSheetId(),
      target: env.model.getters.getSelectedZones(),
      step: -1,
    }),
};

export const formatBoldMenuItem: MenuItemSpec = {
  name: _lt("Bold"),
  description: "Ctrl+B",
  action: ACTIONS.FORMAT_BOLD_ACTION,
  icon: "o-spreadsheet-Icon.BOLD",
  isActive: (env) => !!env.model.getters.getCurrentStyle().bold,
};

export const formatItalicMenuItem: MenuItemSpec = {
  name: _lt("Italic"),
  description: "Ctrl+I",
  action: ACTIONS.FORMAT_ITALIC_ACTION,
  icon: "o-spreadsheet-Icon.ITALIC",
  isActive: (env) => !!env.model.getters.getCurrentStyle().italic,
};

export const formatUnderlineMenuItem: MenuItemSpec = {
  name: _lt("Underline"),
  description: "Ctrl+U",
  action: ACTIONS.FORMAT_UNDERLINE_ACTION,
  icon: "o-spreadsheet-Icon.UNDERLINE",
  isActive: (env) => !!env.model.getters.getCurrentStyle().underline,
};

export const formatStrikethroughMenuItem: MenuItemSpec = {
  name: _lt("Strikethrough"),
  action: ACTIONS.FORMAT_STRIKETHROUGH_ACTION,
  icon: "o-spreadsheet-Icon.STRIKE",
  isActive: (env) => !!env.model.getters.getCurrentStyle().strikethrough,
};

export const formatFontSizeMenuItem: MenuItemSpec = {
  name: _lt("Font size"),
  children: fontSizeMenuBuilder(),
};

export const formatAlignmentMenuItem: MenuItemSpec = {
  name: _lt("Alignment"),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentHorizontalMenuItem: MenuItemSpec = {
  name: _lt("Horizontal align"),
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentLeftMenuItem: MenuItemSpec = {
  name: _lt("Left"),
  action: (env) => ACTIONS.setStyle(env, { align: "left" }),
  isActive: (env) => getHorizontalAlign(env) === "left",
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentCenterMenuItem: MenuItemSpec = {
  name: _lt("Center"),
  action: (env) => ACTIONS.setStyle(env, { align: "center" }),
  isActive: (env) => getHorizontalAlign(env) === "center",
  icon: "o-spreadsheet-Icon.ALIGN_CENTER",
};

export const formatAlignmentRightMenuItem: MenuItemSpec = {
  name: _lt("Right"),
  action: (env) => ACTIONS.setStyle(env, { align: "right" }),
  isActive: (env) => getHorizontalAlign(env) === "right",
  icon: "o-spreadsheet-Icon.ALIGN_RIGHT",
};

export const formatAlignmentVerticalMenuItem: MenuItemSpec = {
  name: _lt("Vertical align"),
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentTopMenuItem: MenuItemSpec = {
  name: _lt("Top"),
  action: (env) => ACTIONS.setStyle(env, { verticalAlign: "top" }),
  isActive: (env) =>
    (env.model.getters.getCurrentStyle().verticalAlign || DEFAULT_VERTICAL_ALIGN) === "top",
  icon: "o-spreadsheet-Icon.ALIGN_TOP",
};

export const formatAlignmentMiddleMenuItem: MenuItemSpec = {
  name: _lt("Middle"),
  action: (env) => ACTIONS.setStyle(env, { verticalAlign: "middle" }),
  isActive: (env) =>
    (env.model.getters.getCurrentStyle().verticalAlign || DEFAULT_VERTICAL_ALIGN) === "middle",
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentBottomMenuItem: MenuItemSpec = {
  name: _lt("Bottom"),
  action: (env) => ACTIONS.setStyle(env, { verticalAlign: "bottom" }),
  isActive: (env) =>
    (env.model.getters.getCurrentStyle().verticalAlign || DEFAULT_VERTICAL_ALIGN) === "bottom",
  icon: "o-spreadsheet-Icon.ALIGN_BOTTOM",
};

export const formatWrappingMenuItem: MenuItemSpec = {
  name: _lt("Wrapping"),
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingOverflowMenuItem: MenuItemSpec = {
  name: _lt("Overflow"),
  action: (env) => ACTIONS.setStyle(env, { wrapping: "overflow" }),
  isActive: (env) => (env.model.getters.getCurrentStyle().wrapping || "overflow") === "overflow",
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingWrapMenuItem: MenuItemSpec = {
  name: _lt("Wrap"),
  action: (env) => ACTIONS.setStyle(env, { wrapping: "wrap" }),
  isActive: (env) => env.model.getters.getCurrentStyle().wrapping === "wrap",
  icon: "o-spreadsheet-Icon.WRAPPING_WRAP",
};

export const formatWrappingClipMenuItem: MenuItemSpec = {
  name: _lt("Clip"),
  action: (env) => ACTIONS.setStyle(env, { wrapping: "clip" }),
  isActive: (env) => env.model.getters.getCurrentStyle().wrapping === "clip",
  icon: "o-spreadsheet-Icon.WRAPPING_CLIP",
};

export const textColorMenuItem: MenuItemSpec = {
  name: _lt("Text Color"),
  icon: "o-spreadsheet-Icon.TEXT_COLOR",
};

export const fillColorMenuItem: MenuItemSpec = {
  name: _lt("Fill Color"),
  icon: "o-spreadsheet-Icon.FILL_COLOR",
};

export const formatCFMenuItem: MenuItemSpec = {
  name: _lt("Conditional formatting"),
  action: ACTIONS.OPEN_CF_SIDEPANEL_ACTION,
};

export const paintFormatMenuItem: MenuItemSpec = {
  name: _lt("Paint Format"),
  action: (env) =>
    env.model.dispatch("ACTIVATE_PAINT_FORMAT", {
      target: env.model.getters.getSelectedZones(),
    }),
  icon: "o-spreadsheet-Icon.PAINT_FORMAT",
  isActive: (env) => env.model.getters.isPaintingFormat(),
};

export const clearFormatMenuItem: MenuItemSpec = {
  name: _lt("Clear formatting"),
  action: ACTIONS.FORMAT_CLEARFORMAT_ACTION,
  icon: "o-spreadsheet-Icon.CLEAR_FORMAT",
};

export const bordersMenuItem: MenuItemSpec = {
  name: _lt("Borders"),
  icon: "o-spreadsheet-Icon.BORDERS",
};

export const bordersAllMenuItem: MenuItemSpec = {
  name: _lt("All borders"),
  action: (env) => setBorder(env, "all"),
  icon: "o-spreadsheet-Icon.BORDERS",
};

export const bordersInnerMenuItem: MenuItemSpec = {
  name: _lt("Inner borders"),
  action: (env) => setBorder(env, "hv"),
  icon: "o-spreadsheet-Icon.BORDER_HV",
};

export const bordersHorizontalMenuItem: MenuItemSpec = {
  name: _lt("Horizontal borders"),
  action: (env) => setBorder(env, "h"),
  icon: "o-spreadsheet-Icon.BORDER_H",
};

export const bordersVerticalMenuItem: MenuItemSpec = {
  name: _lt("Vertical borders"),
  action: (env) => setBorder(env, "v"),
  icon: "o-spreadsheet-Icon.BORDER_V",
};

export const bordersExternalMenuItem: MenuItemSpec = {
  name: _lt("External borders"),
  action: (env) => setBorder(env, "external"),
  icon: "o-spreadsheet-Icon.BORDER_EXTERNAL",
};

export const bordersLeftMenuItem: MenuItemSpec = {
  name: _lt("Left borders"),
  action: (env) => setBorder(env, "left"),
  icon: "o-spreadsheet-Icon.BORDER_LEFT",
};

export const bordersTopMenuItem: MenuItemSpec = {
  name: _lt("Top borders"),
  action: (env) => setBorder(env, "top"),
  icon: "o-spreadsheet-Icon.BORDER_TOP",
};

export const bordersRightMenuItem: MenuItemSpec = {
  name: _lt("Right borders"),
  action: (env) => setBorder(env, "right"),
  icon: "o-spreadsheet-Icon.BORDER_RIGHT",
};

export const bordersBottomMenuItem: MenuItemSpec = {
  name: _lt("Bottom borders"),
  action: (env) => setBorder(env, "bottom"),
  icon: "o-spreadsheet-Icon.BORDER_BOTTOM",
};

export const bordersClearMenuItem: MenuItemSpec = {
  name: _lt("Clear borders"),
  action: (env) => setBorder(env, "clear"),
  icon: "o-spreadsheet-Icon.BORDER_CLEAR",
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

function setBorder(env: SpreadsheetChildEnv, command: BorderCommand) {
  env.model.dispatch("SET_FORMATTING", {
    sheetId: env.model.getters.getActiveSheetId(),
    target: env.model.getters.getSelectedZones(),
    border: command,
  });
}

function getHorizontalAlign(env: SpreadsheetChildEnv): Align {
  const style = env.model.getters.getCurrentStyle();
  if (style.align) {
    return style.align;
  }
  const cell = env.model.getters.getActiveCell();
  return cell.defaultAlign;
}
