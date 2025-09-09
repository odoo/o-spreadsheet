import { functionRegistry } from "../functions";
import { isDefined } from "../helpers";
import { handlePasteResult } from "../helpers/ui/paste_interactive";
import { _t } from "../translation";
import { ActionBuilder, ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const insertRow: ActionSpec = {
  name: (env) => {
    const number = getRowsNumber(env);
    return number === 1 ? _t("Insert row") : _t("Insert %s rows", number.toString());
  },
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW",
};

export const rowInsertRowBefore: ActionSpec = {
  name: (env) => {
    const number = getRowsNumber(env);
    return number === 1 ? _t("Insert row above") : _t("Insert %s rows above", number.toString());
  },
  execute: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW_BEFORE",
};

export const topBarInsertRowsBefore: ActionSpec = {
  ...rowInsertRowBefore,
  name: (env) => {
    const number = getRowsNumber(env);
    if (number === 1) {
      return _t("Row above");
    }
    return _t("%s Rows above", number.toString());
  },
};

export const cellInsertRowsBefore: ActionSpec = {
  ...rowInsertRowBefore,
  name: (env) => {
    const number = getRowsNumber(env);
    if (number === 1) {
      return _t("Insert row");
    }
    return _t("Insert %s rows", number.toString());
  },
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.INSERT_ROW_BEFORE",
};

export const rowInsertRowsAfter: ActionSpec = {
  execute: ACTIONS.INSERT_ROWS_AFTER_ACTION,
  name: (env) => {
    const number = getRowsNumber(env);
    return number === 1 ? _t("Insert row below") : _t("Insert %s rows below", number.toString());
  },
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW_AFTER",
};

export const topBarInsertRowsAfter: ActionSpec = {
  ...rowInsertRowsAfter,
  name: (env) => {
    const number = getRowsNumber(env);
    if (number === 1) {
      return _t("Row below");
    }
    return _t("%s Rows below", number.toString());
  },
};

export const insertCol: ActionSpec = {
  name: (env) => {
    const number = getColumnsNumber(env);
    return number === 1 ? _t("Insert column") : _t("Insert %s columns", number.toString());
  },
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL",
};

export const colInsertColsBefore: ActionSpec = {
  name: (env) => {
    const number = getColumnsNumber(env);
    return number === 1
      ? _t("Insert column left")
      : _t("Insert %s columns left", number.toString());
  },
  execute: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL_BEFORE",
};

export const topBarInsertColsBefore: ActionSpec = {
  ...colInsertColsBefore,
  name: (env) => {
    const number = getColumnsNumber(env);
    if (number === 1) {
      return _t("Column left");
    }
    return _t("%s Columns left", number.toString());
  },
};

export const cellInsertColsBefore: ActionSpec = {
  ...colInsertColsBefore,
  name: (env) => {
    const number = getColumnsNumber(env);
    if (number === 1) {
      return _t("Insert column");
    }
    return _t("Insert %s columns", number.toString());
  },
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.INSERT_COL_BEFORE",
};

export const colInsertColsAfter: ActionSpec = {
  name: (env) => {
    const number = getColumnsNumber(env);
    return number === 1
      ? _t("Insert column right")
      : _t("Insert %s columns right", number.toString());
  },
  execute: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL_AFTER",
};

export const topBarInsertColsAfter: ActionSpec = {
  ...colInsertColsAfter,
  name: (env) => {
    const number = getColumnsNumber(env);
    if (number === 1) {
      return _t("Column right");
    }
    return _t("%s Columns right", number.toString());
  },
  execute: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
};

export const insertCell: ActionSpec = {
  name: _t("Insert cells"),
  isVisible: (env) =>
    ACTIONS.IS_ONLY_ONE_RANGE(env) &&
    env.model.getters.getActiveCols().size === 0 &&
    env.model.getters.getActiveRows().size === 0,
  icon: "o-spreadsheet-Icon.INSERT_CELL",
};

export const insertCellShiftDown: ActionSpec = {
  name: _t("Insert cells and shift down"),
  execute: (env) => {
    const zone = env.model.getters.getSelectedZone();
    const result = env.model.dispatch("INSERT_CELL", { zone, shiftDimension: "ROW" });
    handlePasteResult(env, result);
  },
  isVisible: (env) =>
    env.model.getters.getActiveRows().size === 0 && env.model.getters.getActiveCols().size === 0,
  icon: "o-spreadsheet-Icon.INSERT_CELL_SHIFT_DOWN",
};

export const insertCellShiftRight: ActionSpec = {
  name: _t("Insert cells and shift right"),
  execute: (env) => {
    const zone = env.model.getters.getSelectedZone();
    const result = env.model.dispatch("INSERT_CELL", { zone, shiftDimension: "COL" });
    handlePasteResult(env, result);
  },
  isVisible: (env) =>
    env.model.getters.getActiveRows().size === 0 && env.model.getters.getActiveCols().size === 0,
  icon: "o-spreadsheet-Icon.INSERT_CELL_SHIFT_RIGHT",
};

export const insertChart: ActionSpec = {
  name: _t("Chart"),
  execute: ACTIONS.CREATE_CHART,
  isEnabled: (env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.INSERT_CHART",
};

export const insertCarousel: ActionSpec = {
  name: _t("Carousel"),
  execute: ACTIONS.CREATE_CAROUSEL,
  isEnabled: (env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.CAROUSEL",
};

export const insertPivot: ActionSpec = {
  name: _t("Pivot table"),
  execute: ACTIONS.CREATE_PIVOT,
  isEnabled: (env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.PIVOT",
};

export const insertImage: ActionSpec = {
  name: _t("Image"),
  description: "Ctrl+O",
  execute: ACTIONS.CREATE_IMAGE,
  isVisible: (env) => env.imageProvider !== undefined,
  isEnabled: (env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.INSERT_IMAGE",
};

export const insertTable: ActionSpec = {
  name: () => _t("Table"),
  execute: ACTIONS.INSERT_TABLE,
  isVisible: (env) =>
    ACTIONS.IS_SELECTION_CONTINUOUS(env) && !env.model.getters.getFirstTableInSelection(),
  isEnabled: (env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.PAINT_TABLE",
};

export const insertFunction: ActionSpec = {
  name: _t("Function"),
  icon: "o-spreadsheet-Icon.FORMULA",
};

export const insertFunctionSum: ActionSpec = {
  name: _t("SUM"),
  execute: (env) => env.startCellEdition(`=SUM(`),
};

export const insertFunctionAverage: ActionSpec = {
  name: _t("AVERAGE"),
  execute: (env) => env.startCellEdition(`=AVERAGE(`),
};

export const insertFunctionCount: ActionSpec = {
  name: _t("COUNT"),
  execute: (env) => env.startCellEdition(`=COUNT(`),
};

export const insertFunctionMax: ActionSpec = {
  name: _t("MAX"),
  execute: (env) => env.startCellEdition(`=MAX(`),
};

export const insertFunctionMin: ActionSpec = {
  name: _t("MIN"),
  execute: (env) => env.startCellEdition(`=MIN(`),
};

export const categorieFunctionAll: ActionSpec = {
  name: _t("All"),
  children: [allFunctionListMenuBuilder],
};

function allFunctionListMenuBuilder(): ActionSpec[] {
  const fnNames = functionRegistry.getKeys().filter((key) => !functionRegistry.get(key).hidden);
  return createFormulaFunctions(fnNames);
}

export const categoriesFunctionListMenuBuilder: ActionBuilder = () => {
  const functions = functionRegistry.content;
  const categories = [
    ...new Set(
      functionRegistry
        .getAll()
        .filter((fn) => !fn.hidden)
        .map((fn) => fn.category)
    ),
  ].filter(isDefined);

  return categories.sort().map((category, i) => {
    const functionsInCategory = Object.keys(functions).filter(
      (key) => functions[key].category === category && !functions[key].hidden
    );
    return {
      name: category,
      children: createFormulaFunctions(functionsInCategory),
    };
  });
};

export const insertLink: ActionSpec = {
  name: _t("Link"),
  execute: ACTIONS.INSERT_LINK,
  icon: "o-spreadsheet-Icon.INSERT_LINK",
};

export const insertCheckbox: ActionSpec = {
  name: _t("Checkbox"),
  execute: (env) => {
    const zones = env.model.getters.getSelectedZones();
    const sheetId = env.model.getters.getActiveSheetId();
    const ranges = zones.map((zone) => env.model.getters.getRangeDataFromZone(sheetId, zone));
    env.model.dispatch("ADD_DATA_VALIDATION_RULE", {
      ranges,
      sheetId,
      rule: {
        id: env.model.uuidGenerator.smallUuid(),
        criterion: {
          type: "isBoolean",
          values: [],
        },
      },
    });
  },
  icon: "o-spreadsheet-Icon.INSERT_CHECKBOX",
};

export const insertDropdown: ActionSpec = {
  name: _t("Dropdown list"),
  execute: (env) => {
    const zones = env.model.getters.getSelectedZones();
    const sheetId = env.model.getters.getActiveSheetId();
    const ranges = zones.map((zone) => env.model.getters.getRangeDataFromZone(sheetId, zone));
    const ruleID = env.model.uuidGenerator.smallUuid();
    env.model.dispatch("ADD_DATA_VALIDATION_RULE", {
      ranges,
      sheetId,
      rule: {
        id: ruleID,
        criterion: {
          type: "isValueInList",
          values: [],
          displayStyle: "chip",
        },
      },
    });
    const rule = env.model.getters.getDataValidationRule(sheetId, ruleID);
    if (!rule) {
      return;
    }
    env.openSidePanel("DataValidationEditor", { id: ruleID });
  },
  isEnabled: (env) => !env.isSmall,
  icon: "o-spreadsheet-Icon.INSERT_DROPDOWN",
};

export const insertSheet: ActionSpec = {
  name: _t("Insert sheet"),
  execute: (env) => {
    const activeSheetId = env.model.getters.getActiveSheetId();
    const position = env.model.getters.getSheetIds().indexOf(activeSheetId) + 1;
    const sheetId = env.model.uuidGenerator.smallUuid();
    env.model.dispatch("CREATE_SHEET", {
      sheetId,
      position,
      name: env.model.getters.getNextSheetName(),
    });
    env.model.dispatch("ACTIVATE_SHEET", { sheetIdFrom: activeSheetId, sheetIdTo: sheetId });
  },
  icon: "o-spreadsheet-Icon.INSERT_SHEET",
};

function createFormulaFunctions(fnNames: string[]): ActionSpec[] {
  return fnNames.sort().map((fnName, i) => {
    return {
      name: fnName,
      sequence: i * 10,
      execute: (env) => env.startCellEdition(`=${fnName}(`),
    };
  });
}

function getRowsNumber(env): number {
  const activeRows = env.model.getters.getActiveRows();
  if (activeRows.size) {
    return activeRows.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    return zone.bottom - zone.top + 1;
  }
}

function getColumnsNumber(env): number {
  const activeCols = env.model.getters.getActiveCols();
  if (activeCols.size) {
    return activeCols.size;
  } else {
    const zone = env.model.getters.getSelectedZones()[0];
    return zone.right - zone.left + 1;
  }
}
