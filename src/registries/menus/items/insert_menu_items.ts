import { functionRegistry } from "../../../functions";
import { isDefined } from "../../../helpers";
import { _lt } from "../../../translation";
import { MenuItemsBuilder, MenuItemSpec } from "../../menu_items_registry";
import * as ACTIONS from "./../menu_items_actions";

export const rowInsertRowBeforeMenuItem: MenuItemSpec = {
  name: ACTIONS.ROW_INSERT_ROWS_BEFORE_NAME,
  action: ACTIONS.INSERT_ROWS_BEFORE_ACTION,
};

export const topBarInsertRowsBeforeMenuItem: MenuItemSpec = {
  ...rowInsertRowBeforeMenuItem,
  name: ACTIONS.MENU_INSERT_ROWS_BEFORE_NAME,
  isVisible: (env) => env.model.getters.getActiveCols().size === 0,
};

export const cellInsertRowsBeforeMenuItem: MenuItemSpec = {
  ...rowInsertRowBeforeMenuItem,
  name: ACTIONS.CELL_INSERT_ROWS_BEFORE_NAME,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const rowInsertRowsAfterMenuItem: MenuItemSpec = {
  action: ACTIONS.INSERT_ROWS_AFTER_ACTION,
  name: ACTIONS.ROW_INSERT_ROWS_AFTER_NAME,
};

export const topBarInsertRowsAfterMenuItem: MenuItemSpec = {
  ...rowInsertRowsAfterMenuItem,
  name: ACTIONS.MENU_INSERT_ROWS_AFTER_NAME,
  isVisible: (env) => env.model.getters.getActiveCols().size === 0,
};

export const colInsertColsBeforeMenuItem: MenuItemSpec = {
  name: ACTIONS.COLUMN_INSERT_COLUMNS_BEFORE_NAME,
  action: ACTIONS.INSERT_COLUMNS_BEFORE_ACTION,
};

export const topBarInsertColsBeforeMenuItem: MenuItemSpec = {
  ...colInsertColsBeforeMenuItem,
  name: ACTIONS.MENU_INSERT_COLUMNS_BEFORE_NAME,
  isVisible: (env) => env.model.getters.getActiveRows().size === 0,
};

export const cellInsertColsBeforeMenuItem: MenuItemSpec = {
  ...colInsertColsBeforeMenuItem,
  name: ACTIONS.CELL_INSERT_COLUMNS_BEFORE_NAME,
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const colInsertColsAfterMenuItem: MenuItemSpec = {
  name: ACTIONS.COLUMN_INSERT_COLUMNS_AFTER_NAME,
  action: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
};

export const topBarInsertColsAfterMenuItem: MenuItemSpec = {
  ...colInsertColsAfterMenuItem,
  name: ACTIONS.MENU_INSERT_COLUMNS_AFTER_NAME,
  action: ACTIONS.INSERT_COLUMNS_AFTER_ACTION,
  isVisible: (env) => env.model.getters.getActiveRows().size === 0,
};

export const insertCellMenuItem: MenuItemSpec = {
  name: _lt("Insert cells"),
  isVisible: ACTIONS.IS_ONLY_ONE_RANGE,
};

export const insertCellShiftDownMenuItem: MenuItemSpec = {
  name: _lt("Insert cells and shift down"),
  action: ACTIONS.INSERT_CELL_SHIFT_DOWN,
};

export const insertCellShiftRightMenuItem: MenuItemSpec = {
  name: _lt("Insert cells and shift right"),
  action: ACTIONS.INSERT_CELL_SHIFT_RIGHT,
};

export const insertChartMenuItem: MenuItemSpec = {
  name: _lt("Chart"),
  action: ACTIONS.CREATE_CHART,
};

export const insertImageMenuItem: MenuItemSpec = {
  name: _lt("Image"),
  action: ACTIONS.CREATE_IMAGE,
  isVisible: (env) => env.imageProvider !== undefined,
};

export const insertFunctionMenuItem: MenuItemSpec = {
  name: _lt("Function"),
};

export const insertFunctionSumMenuItem: MenuItemSpec = {
  name: _lt("SUM"),
  action: (env) => env.startCellEdition(`=SUM(`),
};

export const insertFunctionAverageMenuItem: MenuItemSpec = {
  name: _lt("AVERAGE"),
  action: (env) => env.startCellEdition(`=AVERAGE(`),
};

export const insertFunctionCountMenuItem: MenuItemSpec = {
  name: _lt("COUNT"),
  action: (env) => env.startCellEdition(`=COUNT(`),
};

export const insertFunctionMaxMenuItem: MenuItemSpec = {
  name: _lt("MAX"),
  action: (env) => env.startCellEdition(`=MAX(`),
};

export const insertFunctionMinMenuItem: MenuItemSpec = {
  name: _lt("MIN"),
  action: (env) => env.startCellEdition(`=MIN(`),
};

export const categorieFunctionAllMenuItem: MenuItemSpec = {
  name: _lt("All"),
  children: allFunctionListMenuBuilder(),
};

function allFunctionListMenuBuilder(): MenuItemSpec[] {
  const fnNames = functionRegistry.getKeys();
  return createFormulaFunctionMenuItems(fnNames);
}

export const categoriesFunctionListMenuBuilder: MenuItemsBuilder = () => {
  const functions = functionRegistry.content;
  const categories = [...new Set(functionRegistry.getAll().map((fn) => fn.category))].filter(
    isDefined
  );

  return categories.sort().map((category, i) => {
    const functionsInCategory = Object.keys(functions).filter(
      (key) => functions[key].category === category
    );
    return {
      name: category,
      children: createFormulaFunctionMenuItems(functionsInCategory),
    };
  });
};

export const insertLinkMenuItem: MenuItemSpec = {
  name: _lt("Link"),
  action: ACTIONS.INSERT_LINK,
};

export const insertSheetMenuItem: MenuItemSpec = {
  name: _lt("New sheet"),
  action: ACTIONS.CREATE_SHEET_ACTION,
};

function createFormulaFunctionMenuItems(fnNames: string[]): MenuItemSpec[] {
  return fnNames.sort().map((fnName, i) => {
    return {
      name: fnName,
      sequence: i * 10,
      action: (env) => env.startCellEdition(`=${fnName}(`),
    };
  });
}
