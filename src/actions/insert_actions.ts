import { functionRegistry } from "../functions";
import { isDefined } from "../helpers";
import { _lt } from "../translation";
import { ActionBuilder, ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const insertRow: ActionSpec = {
  name: ACTIONS.MENU_INSERT_ROWS_NAME,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW",
};

export const rowInsertRowBefore: ActionSpec = {
  name: ACTIONS.ROW_INSERT_ROWS_BEFORE_NAME,
  execute: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW_BEFORE",
};

export const topBarInsertRowsBefore: ActionSpec = {
  ...rowInsertRowBefore,
  name: ACTIONS.MENU_INSERT_ROWS_BEFORE_NAME,
};

export const cellInsertRowsBefore: ActionSpec = {
  ...rowInsertRowBefore,
  name: ACTIONS.CELL_INSERT_ROWS_BEFORE_NAME,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.INSERT_ROW_BEFORE",
};

export const rowInsertRowsAfter: ActionSpec = {
  execute: ACTIONS.INSERT_ROWS_AFTER_ACTION,
  name: ACTIONS.ROW_INSERT_ROWS_AFTER_NAME,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "ROW"),
  icon: "o-spreadsheet-Icon.INSERT_ROW_AFTER",
};

export const topBarInsertRowsAfter: ActionSpec = {
  ...rowInsertRowsAfter,
  name: ACTIONS.MENU_INSERT_ROWS_AFTER_NAME,
};

export const insertCol: ActionSpec = {
  name: ACTIONS.MENU_INSERT_COLUMNS_NAME,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL",
};

export const colInsertColsBefore: ActionSpec = {
  name: ACTIONS.COLUMN_INSERT_COLUMNS_BEFORE_NAME,
  execute: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL_BEFORE",
};

export const topBarInsertColsBefore: ActionSpec = {
  ...colInsertColsBefore,
  name: ACTIONS.MENU_INSERT_COLUMNS_BEFORE_NAME,
};

export const cellInsertColsBefore: ActionSpec = {
  ...colInsertColsBefore,
  name: ACTIONS.CELL_INSERT_COLUMNS_BEFORE_NAME,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
  icon: "o-spreadsheet-Icon.INSERT_COL_BEFORE",
};

export const colInsertColsAfter: ActionSpec = {
  name: ACTIONS.COLUMN_INSERT_COLUMNS_AFTER_NAME,
  execute: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
  isVisible: (env) => ACTIONS.CAN_INSERT_HEADER(env, "COL"),
  icon: "o-spreadsheet-Icon.INSERT_COL_AFTER",
};

export const topBarInsertColsAfter: ActionSpec = {
  ...colInsertColsAfter,
  name: ACTIONS.MENU_INSERT_COLUMNS_AFTER_NAME,
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
  execute: ACTIONS.INSERT_CELL_SHIFT_DOWN,
  isVisible: (env) =>
    env.model.getters.getActiveRows().size === 0 && env.model.getters.getActiveCols().size === 0,
  icon: "o-spreadsheet-Icon.INSERT_CELL_SHIFT_DOWN",
};

export const insertCellShiftRight: ActionSpec = {
  name: _lt("Insert cells and shift right"),
  execute: ACTIONS.INSERT_CELL_SHIFT_RIGHT,
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
  execute: ACTIONS.CREATE_SHEET_ACTION,
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
