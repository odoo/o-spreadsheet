import { functionRegistry } from "../functions";
import { isDefined } from "../helpers";
import { handlePasteResult } from "../helpers/ui/paste_interactive";
import { _lt } from "../translation";
import { ActionBuilder, ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const insertRow: ActionSpec = {
  name: (env) => {
    const number = getRowsNumber(env);
    return number === 1 ? _lt("Insert row") : _lt("Insert %s rows", number.toString());
  },
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW",
};

export const rowInsertRowBefore: ActionSpec = {
  name: (env) => {
    const number = getRowsNumber(env);
    return number === 1 ? _lt("Insert row above") : _lt("Insert %s rows above", number.toString());
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
      return _lt("Row above");
    }
    return _lt("%s Rows above", number.toString());
  },
};

export const cellInsertRowsBefore: ActionSpec = {
  ...rowInsertRowBefore,
  name: (env) => {
    const number = getRowsNumber(env);
    if (number === 1) {
      return _lt("Insert row");
    }
    return _lt("Insert %s rows", number.toString());
  },
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.INSERT_ROW_BEFORE",
};

export const rowInsertRowsAfter: ActionSpec = {
  execute: ACTIONS.INSERT_ROWS_AFTER_ACTION,
  name: (env) => {
    const number = getRowsNumber(env);
    return number === 1 ? _lt("Insert row below") : _lt("Insert %s rows below", number.toString());
  },
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW_AFTER",
};

export const topBarInsertRowsAfter: ActionSpec = {
  ...rowInsertRowsAfter,
  name: (env) => {
    const number = getRowsNumber(env);
    if (number === 1) {
      return _lt("Row below");
    }
    return _lt("%s Rows below", number.toString());
  },
};

export const insertCol: ActionSpec = {
  name: (env) => {
    const number = getColumnsNumber(env);
    return number === 1 ? _lt("Insert column") : _lt("Insert %s columns", number.toString());
  },
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL",
};

export const colInsertColsBefore: ActionSpec = {
  name: (env) => {
    const number = getColumnsNumber(env);
    return number === 1
      ? _lt("Insert column left")
      : _lt("Insert %s columns left", number.toString());
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
      return _lt("Column left");
    }
    return _lt("%s Columns left", number.toString());
  },
};

export const cellInsertColsBefore: ActionSpec = {
  ...colInsertColsBefore,
  name: (env) => {
    const number = getColumnsNumber(env);
    if (number === 1) {
      return _lt("Insert column");
    }
    return _lt("Insert %s columns", number.toString());
  },
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.INSERT_COL_BEFORE",
};

export const colInsertColsAfter: ActionSpec = {
  name: (env) => {
    const number = getColumnsNumber(env);
    return number === 1
      ? _lt("Insert column right")
      : _lt("Insert %s columns right", number.toString());
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
      return _lt("Column right");
    }
    return _lt("%s Columns right", number.toString());
  },
  execute: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
};

export const insertCell: ActionSpec = {
  name: _lt("Insert cells"),
  isVisible: (env) =>
    ACTIONS.IS_ONLY_ONE_RANGE(env) &&
    env.model.getters.getActiveCols().size === 0 &&
    env.model.getters.getActiveRows().size === 0,
  icon: "o-spreadsheet-Icon.INSERT_CELL",
};

export const insertCellShiftDown: ActionSpec = {
  name: _lt("Insert cells and shift down"),
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
  name: _lt("Insert cells and shift right"),
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
  name: _lt("Chart"),
  execute: ACTIONS.CREATE_CHART,
  icon: "o-spreadsheet-Icon.INSERT_CHART",
};

export const insertImage: ActionSpec = {
  name: _lt("Image"),
  description: "Ctrl+O",
  execute: ACTIONS.CREATE_IMAGE,
  isVisible: (env) => env.imageProvider !== undefined,
  icon: "o-spreadsheet-Icon.INSERT_IMAGE",
};

export const insertFunction: ActionSpec = {
  name: _lt("Function"),
  icon: "o-spreadsheet-Icon.SHOW_HIDE_FORMULA",
};

export const insertFunctionSum: ActionSpec = {
  name: _lt("SUM"),
  execute: (env) => env.startCellEdition(`=SUM(`),
};

export const insertFunctionAverage: ActionSpec = {
  name: _lt("AVERAGE"),
  execute: (env) => env.startCellEdition(`=AVERAGE(`),
};

export const insertFunctionCount: ActionSpec = {
  name: _lt("COUNT"),
  execute: (env) => env.startCellEdition(`=COUNT(`),
};

export const insertFunctionMax: ActionSpec = {
  name: _lt("MAX"),
  execute: (env) => env.startCellEdition(`=MAX(`),
};

export const insertFunctionMin: ActionSpec = {
  name: _lt("MIN"),
  execute: (env) => env.startCellEdition(`=MIN(`),
};

export const categorieFunctionAll: ActionSpec = {
  name: _lt("All"),
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
  name: _lt("Link"),
  execute: ACTIONS.INSERT_LINK,
  icon: "o-spreadsheet-Icon.INSERT_LINK",
};

export const insertSheet: ActionSpec = {
  name: _lt("Insert sheet"),
  execute: (env) => {
    const activeSheetId = env.model.getters.getActiveSheetId();
    const position = env.model.getters.getSheetIds().indexOf(activeSheetId) + 1;
    const sheetId = env.model.uuidGenerator.uuidv4();
    env.model.dispatch("CREATE_SHEET", { sheetId, position });
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
