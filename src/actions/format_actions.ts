import {
  DEFAULT_CURRENCY,
  DEFAULT_FONT_SIZE,
  DEFAULT_VERTICAL_ALIGN,
  DEFAULT_WRAPPING_MODE,
  FONT_SIZES,
  ROTATION_EPSILON,
} from "../constants";
import { parseLiteral } from "../helpers/cells/cell_evaluation";
import {
  createAccountingFormat,
  createCurrencyFormat,
  formatValue,
  roundFormat,
} from "../helpers/format/format";
import { getDateTimeFormat } from "../helpers/locale";
import { Model } from "../model";
import { _t } from "../translation";
import { CellValue } from "../types/cells";
import { Format } from "../types/format";
import { DEFAULT_LOCALE } from "../types/locale";
import { Align, VerticalAlign, Wrapping } from "../types/misc";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";
import { setFormatter, setStyle } from "./menu_items_actions";

export interface NumberFormatActionSpec extends ActionSpec {
  format?: Format | ((model: Model) => Format);
}

/**
 * Create a format action specification for a given format.
 * The format can be dynamically computed from the model.
 */
export function createFormatActionSpec({
  name,
  format,
  descriptionValue,
}: {
  name: string;
  descriptionValue: CellValue;
  format: Format | ((model: Model) => Format);
}): NumberFormatActionSpec {
  const formatCallback = typeof format === "function" ? format : () => format;
  return {
    name,
    description: (model) =>
      formatValue(descriptionValue, {
        format: formatCallback(model),
        locale: model.getters.getLocale(),
      }),
    execute: (model) => setFormatter(model, formatCallback(model)),
    isActive: (model) => isFormatSelected(model, formatCallback(model)),
    format,
  };
}

export const formatNumberAutomatic: NumberFormatActionSpec = {
  name: _t("Automatic"),
  execute: (model) => setFormatter(model, ""),
  isActive: (model) => isAutomaticFormatSelected(model),
};

export const formatNumberPlainText: NumberFormatActionSpec = {
  name: _t("Plain text"),
  execute: (model) => setFormatter(model, "@"),
  isActive: (model) => isFormatSelected(model, "@"),
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

export const formatNumberScientific = createFormatActionSpec({
  name: _t("Scientific"),
  descriptionValue: 0.1012,
  format: "0.00e",
});

export const formatNumberCurrency = createFormatActionSpec({
  name: _t("Currency"),
  descriptionValue: 1000.12,
  format: (model) => createCurrencyFormat(model.config.defaultCurrency || DEFAULT_CURRENCY),
});

export const formatNumberCurrencyRounded: NumberFormatActionSpec = {
  ...createFormatActionSpec({
    name: _t("Currency rounded"),
    descriptionValue: 1000,
    format: (model) =>
      roundFormat(createCurrencyFormat(model.config.defaultCurrency || DEFAULT_CURRENCY)),
  }),
  isVisible: (model) => {
    const currencyFormat = createCurrencyFormat(model.config.defaultCurrency || DEFAULT_CURRENCY);
    const roundedFormat = roundFormat(currencyFormat);
    return currencyFormat !== roundedFormat;
  },
};

export const formatNumberAccounting = createFormatActionSpec({
  name: _t("Accounting"),
  descriptionValue: -1000.12,
  format: (model) => createAccountingFormat(model.config.defaultCurrency || DEFAULT_CURRENCY),
});

export const EXAMPLE_DATE = parseLiteral("2023/09/26 10:43:00 PM", DEFAULT_LOCALE);

export const formatCustomCurrency: ActionSpec = {
  name: _t("Custom currency"),
  isVisible: (model, env) => env.loadCurrencies !== undefined && !env.isSmall,
  execute: (model, env) => env.openSidePanel("MoreFormats", { category: "currency" }),
};

export const formatNumberDate = createFormatActionSpec({
  name: _t("Date"),
  descriptionValue: EXAMPLE_DATE,
  format: (model) => model.getters.getLocale().dateFormat,
});

export const formatNumberTime = createFormatActionSpec({
  name: _t("Time"),
  descriptionValue: EXAMPLE_DATE,
  format: (model) => model.getters.getLocale().timeFormat,
});

export const formatNumberDateTime = createFormatActionSpec({
  name: _t("Date time"),
  descriptionValue: EXAMPLE_DATE,
  format: (model) => {
    const locale = model.getters.getLocale();
    return getDateTimeFormat(locale);
  },
});

export const formatNumberDuration = createFormatActionSpec({
  name: _t("Duration"),
  descriptionValue: "27:51:38",
  format: "hhhh:mm:ss",
});

export const customDateFormat: ActionSpec = {
  name: _t("Custom date and time"),
  isVisible: (model, env) => !env.isSmall,
  execute: (model, env) => env.openSidePanel("MoreFormats", { category: "date" }),
};

export const customNumberFormat: ActionSpec = {
  name: _t("Custom number format"),
  isVisible: (model, env) => !env.isSmall,
  execute: (model, env) => env.openSidePanel("MoreFormats", { category: "number" }),
};

export const formatNumberFullDateTime = createFormatActionSpec({
  name: _t("Full date time"),
  format: "dddd d mmmm yyyy hh:mm:ss a",
  descriptionValue: EXAMPLE_DATE,
});

export const increaseDecimalPlaces: ActionSpec = {
  name: _t("Increase decimal places"),
  icon: "o-spreadsheet-Icon.INCREASE_DECIMAL",
  execute: (model) =>
    model.dispatch("SET_DECIMAL", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      step: 1,
    }),
};

export const decreaseDecimalPlaces: ActionSpec = {
  name: _t("Decrease decimal places"),
  icon: "o-spreadsheet-Icon.DECRASE_DECIMAL",
  execute: (model) =>
    model.dispatch("SET_DECIMAL", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
      step: -1,
    }),
};

export const formatBold: ActionSpec = {
  name: _t("Bold"),
  shortcut: "Ctrl+B",
  execute: (model) => setStyle(model, { bold: !model.getters.getCurrentStyle().bold }),
  icon: "o-spreadsheet-Icon.BOLD",
  isActive: (model) => !!model.getters.getCurrentStyle().bold,
};

export const formatItalic: ActionSpec = {
  name: _t("Italic"),
  shortcut: "Ctrl+I",
  execute: (model) => setStyle(model, { italic: !model.getters.getCurrentStyle().italic }),
  icon: "o-spreadsheet-Icon.ITALIC",
  isActive: (model) => !!model.getters.getCurrentStyle().italic,
};

export const formatUnderline: ActionSpec = {
  name: _t("Underline"),
  shortcut: "Ctrl+U",
  execute: (model) => setStyle(model, { underline: !model.getters.getCurrentStyle().underline }),
  icon: "o-spreadsheet-Icon.UNDERLINE",
  isActive: (model) => !!model.getters.getCurrentStyle().underline,
};

export const formatRotation: ActionSpec = {
  name: _t("Rotation"),
  icon: (model) => getRotationIcon(model),
};

function setRotation(model: Model, rotation: number) {
  rotation = Math.trunc(rotation / ROTATION_EPSILON) * ROTATION_EPSILON;
  setStyle(model, { rotation });
}

function currentRotationEqual(model: Model, rotation: number): boolean {
  const current = model.getters.getCurrentStyle().rotation;
  if (current === undefined) {
    return rotation === 0;
  }
  return Math.abs(current - rotation) < ROTATION_EPSILON;
}

export const formatNoRotation: ActionSpec = {
  name: _t("No rotation"),
  execute: (model) => setStyle(model, { rotation: 0 }),
  icon: "o-spreadsheet-Icon.ROTATION-0",
  isActive: (model) => currentRotationEqual(model, 0),
};

export const formatRotation45: ActionSpec = {
  name: _t("45° rotation"),
  execute: (model) => setRotation(model, Math.PI / 4),
  icon: "o-spreadsheet-Icon.ROTATION-45",
  isActive: (model) => currentRotationEqual(model, Math.PI / 4),
};

export const formatRotation90: ActionSpec = {
  name: _t("90° rotation"),
  execute: (model) => setRotation(model, Math.PI / 2),
  icon: "o-spreadsheet-Icon.ROTATION-90",
  isActive: (model) => currentRotationEqual(model, Math.PI / 2),
};

export const formatRotation270: ActionSpec = {
  name: _t("-90° rotation"),
  execute: (model) => setRotation(model, -Math.PI / 2),
  icon: "o-spreadsheet-Icon.ROTATION-270",
  isActive: (model) => currentRotationEqual(model, -Math.PI / 2),
};

export const formatRotation315: ActionSpec = {
  name: _t("-45° rotation"),
  execute: (model) => setRotation(model, -Math.PI / 4),
  icon: "o-spreadsheet-Icon.ROTATION-315",
  isActive: (model) => currentRotationEqual(model, -Math.PI / 4),
};

export const formatStrikethrough: ActionSpec = {
  name: _t("Strikethrough"),
  execute: (model) =>
    setStyle(model, { strikethrough: !model.getters.getCurrentStyle().strikethrough }),
  icon: "o-spreadsheet-Icon.STRIKE",
  isActive: (model) => !!model.getters.getCurrentStyle().strikethrough,
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
  icon: (model) => getHorizontalAlignmentIcon(model),
};

export const formatAlignmentLeft: ActionSpec = {
  name: _t("Left"),
  shortcut: "Ctrl+Shift+L",
  execute: (model) => ACTIONS.setStyle(model, { align: "left" }),
  isActive: (model) => getHorizontalAlign(model) === "left",
  icon: "o-spreadsheet-Icon.ALIGN_LEFT",
};

export const formatAlignmentCenter: ActionSpec = {
  name: _t("Center"),
  shortcut: "Ctrl+Shift+E",
  execute: (model) => ACTIONS.setStyle(model, { align: "center" }),
  isActive: (model) => getHorizontalAlign(model) === "center",
  icon: "o-spreadsheet-Icon.ALIGN_CENTER",
};

export const formatAlignmentRight: ActionSpec = {
  name: _t("Right"),
  shortcut: "Ctrl+Shift+R",
  execute: (model) => ACTIONS.setStyle(model, { align: "right" }),
  isActive: (model) => getHorizontalAlign(model) === "right",
  icon: "o-spreadsheet-Icon.ALIGN_RIGHT",
};

export const formatAlignmentVertical: ActionSpec = {
  name: _t("Vertical align"),
  icon: (model) => getVerticalAlignmentIcon(model),
};

export const formatAlignmentTop: ActionSpec = {
  name: _t("Top"),
  execute: (model) => ACTIONS.setStyle(model, { verticalAlign: "top" }),
  isActive: (model) => getVerticalAlign(model) === "top",
  icon: "o-spreadsheet-Icon.ALIGN_TOP",
};

export const formatAlignmentMiddle: ActionSpec = {
  name: _t("Middle"),
  execute: (model) => ACTIONS.setStyle(model, { verticalAlign: "middle" }),
  isActive: (model) => getVerticalAlign(model) === "middle",
  icon: "o-spreadsheet-Icon.ALIGN_MIDDLE",
};

export const formatAlignmentBottom: ActionSpec = {
  name: _t("Bottom"),
  execute: (model) => ACTIONS.setStyle(model, { verticalAlign: "bottom" }),
  isActive: (model) => getVerticalAlign(model) === "bottom",
  icon: "o-spreadsheet-Icon.ALIGN_BOTTOM",
};

export const formatWrappingIcon: ActionSpec = {
  name: _t("Wrapping"),
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrapping: ActionSpec = {
  name: _t("Wrapping"),
  icon: (model) => getWrapModeIcon(model),
};

export const formatWrappingOverflow: ActionSpec = {
  name: _t("Overflow"),
  execute: (model) => ACTIONS.setStyle(model, { wrapping: "overflow" }),
  isActive: (model) => getWrappingMode(model) === "overflow",
  icon: "o-spreadsheet-Icon.WRAPPING_OVERFLOW",
};

export const formatWrappingWrap: ActionSpec = {
  name: _t("Wrap"),
  execute: (model) => ACTIONS.setStyle(model, { wrapping: "wrap" }),
  isActive: (model) => getWrappingMode(model) === "wrap",
  icon: "o-spreadsheet-Icon.WRAPPING_WRAP",
};

export const formatWrappingClip: ActionSpec = {
  name: _t("Clip"),
  execute: (model) => ACTIONS.setStyle(model, { wrapping: "clip" }),
  isActive: (model) => getWrappingMode(model) === "clip",
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
  isEnabled: (model, env) => !env.isSmall,
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.CONDITIONAL_FORMAT",
};

export const clearFormat: ActionSpec = {
  name: _t("Clear formatting"),
  shortcut: "Ctrl+<",
  execute: (model) =>
    model.dispatch("CLEAR_FORMATTING", {
      sheetId: model.getters.getActiveSheetId(),
      target: model.getters.getSelectedZones(),
    }),

  icon: "o-spreadsheet-Icon.CLEAR_FORMAT",
};

function fontSizeMenuBuilder(): ActionSpec[] {
  return FONT_SIZES.map((fs) => {
    return {
      name: fs.toString(),
      sequence: fs,
      id: `font_size_${fs}`,
      execute: (model) => ACTIONS.setStyle(model, { fontSize: fs }),
      isActive: (model) => isFontSizeSelected(model, fs),
    };
  });
}

function isAutomaticFormatSelected(model: Model): boolean {
  const activePosition = model.getters.getActivePosition();
  const pivotCell = model.getters.getPivotCellFromPosition(activePosition);
  if (pivotCell.type === "VALUE") {
    return !model.getters.getEvaluatedCell(activePosition).format;
  }
  return !model.getters.getCell(activePosition)?.format;
}

function isFormatSelected(model: Model, format: string): boolean {
  const activePosition = model.getters.getActivePosition();
  const pivotCell = model.getters.getPivotCellFromPosition(activePosition);
  if (pivotCell.type === "VALUE") {
    return model.getters.getEvaluatedCell(activePosition).format === format;
  }
  return model.getters.getCell(activePosition)?.format === format;
}

function isFontSizeSelected(model: Model, fontSize: number): boolean {
  const currentFontSize = model.getters.getCurrentStyle().fontSize || DEFAULT_FONT_SIZE;
  return currentFontSize === fontSize;
}

function getHorizontalAlign(model: Model): Align {
  const style = model.getters.getCurrentStyle();
  if (style.align) {
    return style.align;
  }
  const cell = model.getters.getActiveCell();
  return cell.defaultAlign;
}

function getVerticalAlign(model: Model): VerticalAlign {
  const style = model.getters.getCurrentStyle();
  if (style.verticalAlign) {
    return style.verticalAlign;
  }
  return DEFAULT_VERTICAL_ALIGN;
}

function getWrappingMode(model: Model): Wrapping {
  const style = model.getters.getCurrentStyle();
  if (style.wrapping) {
    return style.wrapping;
  }
  return DEFAULT_WRAPPING_MODE;
}

function getHorizontalAlignmentIcon(model: Model) {
  const horizontalAlign = getHorizontalAlign(model);

  switch (horizontalAlign) {
    case "right":
      return "o-spreadsheet-Icon.ALIGN_RIGHT";
    case "center":
      return "o-spreadsheet-Icon.ALIGN_CENTER";
    default:
      return "o-spreadsheet-Icon.ALIGN_LEFT";
  }
}

function getVerticalAlignmentIcon(model: Model) {
  const verticalAlign = getVerticalAlign(model);

  switch (verticalAlign) {
    case "top":
      return "o-spreadsheet-Icon.ALIGN_TOP";
    case "middle":
      return "o-spreadsheet-Icon.ALIGN_MIDDLE";
    default:
      return "o-spreadsheet-Icon.ALIGN_BOTTOM";
  }
}

function getWrapModeIcon(model: Model) {
  const wrapMode = getWrappingMode(model);

  switch (wrapMode) {
    case "wrap":
      return "o-spreadsheet-Icon.WRAPPING_WRAP";
    case "clip":
      return "o-spreadsheet-Icon.WRAPPING_CLIP";
    default:
      return "o-spreadsheet-Icon.WRAPPING_OVERFLOW";
  }
}

function getRotationIcon(model: Model) {
  if (currentRotationEqual(model, Math.PI / 2)) {
    return "o-spreadsheet-Icon.ROTATION-90";
  } else if (currentRotationEqual(model, -Math.PI / 2)) {
    return "o-spreadsheet-Icon.ROTATION-270";
  } else if (currentRotationEqual(model, Math.PI / 4)) {
    return "o-spreadsheet-Icon.ROTATION-45";
  } else if (currentRotationEqual(model, -Math.PI / 4)) {
    return "o-spreadsheet-Icon.ROTATION-315";
  }
  return "o-spreadsheet-Icon.ROTATION-0";
}
