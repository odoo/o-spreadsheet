import { ActionSpec, createActions } from "../actions/action";
import * as ACTION_FORMAT from "../actions/format_actions";
import { isDateTimeFormat, memoize } from "../helpers";
import { numberFormatMenuRegistry } from "../registries/menus/number_format_menu_registry";
import { _t } from "../translation";
import { Command, Format, invalidateEvaluationCommands } from "../types";
import { SpreadsheetStore } from "./spreadsheet_store";

const getNumberFormatType = memoize((format: Format) => {
  if (isDateTimeFormat(format)) {
    return "date";
  } else if (format.includes("[$")) {
    return "currency";
  }
  return "number";
});

export class customNumerFormatStore extends SpreadsheetStore {
  private _customFormats: ACTION_FORMAT.NumberFormatActionSpec[] | undefined = undefined;

  handle(cmd: Command) {
    if (
      invalidateEvaluationCommands.has(cmd.type) ||
      (cmd.type === "UPDATE_CELL" && ("content" in cmd || "format" in cmd))
    ) {
      this._customFormats = undefined;
    }
  }

  get customFormats(): ACTION_FORMAT.NumberFormatActionSpec[] {
    if (this._customFormats === undefined) {
      return (this._customFormats = this.computeCustomFormats());
    }
    return this._customFormats;
  }

  private computeCustomFormats(): ACTION_FORMAT.NumberFormatActionSpec[] {
    const defaultFormats = new Set(
      numberFormatMenuRegistry
        .getAll()
        .map((f) => (typeof f.format === "function" ? f.format(this.model) : f.format))
    );

    const customFormats = new Map<Format, ACTION_FORMAT.NumberFormatActionSpec>();
    for (const sheetId of this.model.getters.getSheetIds()) {
      const cells = this.model.getters.getEvaluatedCells(sheetId);
      for (const cellId in cells) {
        const cell = cells[cellId];

        if (cell.format && !customFormats.has(cell.format) && !defaultFormats.has(cell.format)) {
          const formatType = getNumberFormatType(cell.format);
          if (formatType === "date" || formatType === "currency") {
            customFormats.set(
              cell.format,
              ACTION_FORMAT.createFormatActionSpec({
                descriptionValue: formatType === "currency" ? 1000 : ACTION_FORMAT.EXAMPLE_DATE,
                format: cell.format,
                name: cell.format,
              })
            );
          }
        }
      }
    }
    return [...customFormats.values()];
  }
}

export const formatNumberMenuItemSpec: ActionSpec = {
  name: _t("More formats"),
  icon: "o-spreadsheet-Icon.NUMBER_FORMATS",
  children: [
    (env) => {
      const customFormats = env.getStore(customNumerFormatStore).customFormats.map((action) => ({
        ...action,
        sequence: 110,
      }));
      if (customFormats.length > 0) {
        customFormats[customFormats.length - 1].separator = true;
      }
      return createActions([...numberFormatMenuRegistry.getAll(), ...customFormats]);
    },
  ],
};
