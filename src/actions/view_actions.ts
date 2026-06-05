import { SidePanelStore } from "../components/side_panel/side_panel/side_panel_store";
import { numberToLetters } from "../helpers/coordinates";
import { interactiveFreezeColumnsRows } from "../helpers/ui/freeze_interactive";
import { Model } from "../model";
import { FormulaFingerprintStore } from "../stores/formula_fingerprints_store";
import { _t } from "../translation";
import { Dimension } from "../types/misc";
import { ActionSpec } from "./action";
import * as ACTIONS from "./menu_items_actions";

export const hideCols: ActionSpec = {
  name: ACTIONS.HIDE_COLUMNS_NAME,
  execute: (model) => {
    const columns = model.getters.getElementsFromSelection("COL");
    model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      dimension: "COL",
      elements: columns,
    });
  },
  isVisible: ACTIONS.NOT_ALL_VISIBLE_COLS_SELECTED,

  icon: "o-spreadsheet-Icon.HIDE_COL",
};

export const unhideCols: ActionSpec = {
  name: _t("Unhide columns"),
  execute: (model) => {
    const columns = model.getters.getElementsFromSelection("COL");
    model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      dimension: "COL",
      elements: columns,
    });
  },
  isVisible: (model: Model) => {
    const hiddenCols = model.getters.getHiddenColsGroups(model.getters.getActiveSheetId()).flat();
    const currentCols = model.getters.getElementsFromSelection("COL");
    return currentCols.some((col) => hiddenCols.includes(col));
  },

  icon: "o-spreadsheet-Icon.UNHIDE_COL",
};

export const unhideAllCols: ActionSpec = {
  name: _t("Unhide all columns"),
  execute: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId,
      dimension: "COL",
      elements: Array.from(Array(model.getters.getNumberCols(sheetId)).keys()),
    });
  },
  isVisible: (model: Model) =>
    model.getters.getHiddenColsGroups(model.getters.getActiveSheetId()).length > 0,

  icon: "o-spreadsheet-Icon.UNHIDE_COL",
};

export const hideRows: ActionSpec = {
  name: ACTIONS.HIDE_ROWS_NAME,
  execute: (model) => {
    const rows = model.getters.getElementsFromSelection("ROW");
    model.dispatch("HIDE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      dimension: "ROW",
      elements: rows,
    });
  },

  isVisible: ACTIONS.NOT_ALL_VISIBLE_ROWS_SELECTED,
  icon: "o-spreadsheet-Icon.HIDE_ROW",
};

export const unhideRows: ActionSpec = {
  name: _t("Unhide rows"),
  execute: (model) => {
    const columns = model.getters.getElementsFromSelection("ROW");
    model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
      dimension: "ROW",
      elements: columns,
    });
  },
  isVisible: (model: Model) => {
    const hiddenRows = model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId()).flat();
    const currentRows = model.getters.getElementsFromSelection("ROW");
    return currentRows.some((col) => hiddenRows.includes(col));
  },

  icon: "o-spreadsheet-Icon.UNHIDE_ROW",
};

export const unhideAllRows: ActionSpec = {
  name: _t("Unhide all rows"),
  execute: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("UNHIDE_COLUMNS_ROWS", {
      sheetId,
      dimension: "ROW",
      elements: Array.from(Array(model.getters.getNumberRows(sheetId)).keys()),
    });
  },
  isVisible: (model: Model) =>
    model.getters.getHiddenRowsGroups(model.getters.getActiveSheetId()).length > 0,

  icon: "o-spreadsheet-Icon.UNHIDE_ROW",
};

export const unFreezePane: ActionSpec = {
  name: _t("Unfreeze"),
  isVisible: (model) => {
    const { xSplit, ySplit } = model.getters.getPaneDivisions(model.getters.getActiveSheetId());
    return xSplit + ySplit > 0;
  },
  execute: (model) =>
    model.dispatch("UNFREEZE_COLUMNS_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
    }),

  icon: "o-spreadsheet-Icon.UNFREEZE",
};

export const freezePane: ActionSpec = {
  name: _t("Freeze"),
  icon: "o-spreadsheet-Icon.FREEZE",
};

export const unFreezeRows: ActionSpec = {
  name: _t("No rows"),
  execute: (model) =>
    model.dispatch("UNFREEZE_ROWS", {
      sheetId: model.getters.getActiveSheetId(),
    }),
  isVisible: (model) => !!model.getters.getPaneDivisions(model.getters.getActiveSheetId()).ySplit,
};

export const freezeFirstRow: ActionSpec = {
  name: _t("1 row"),
  execute: (model, env) => interactiveFreezeColumnsRows(model, env, "ROW", 1),
};

export const freezeSecondRow: ActionSpec = {
  name: _t("2 rows"),
  execute: (model, env) => interactiveFreezeColumnsRows(model, env, "ROW", 2),
};

export const freezeCurrentRow: ActionSpec = {
  name: _t("Up to current row"),
  execute: (model, env) => {
    const { bottom } = model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(model, env, "ROW", bottom + 1);
  },
};

export const unFreezeCols: ActionSpec = {
  name: _t("No columns"),
  execute: (model) =>
    model.dispatch("UNFREEZE_COLUMNS", {
      sheetId: model.getters.getActiveSheetId(),
    }),
  isVisible: (model) => !!model.getters.getPaneDivisions(model.getters.getActiveSheetId()).xSplit,
};

export const freezeFirstCol: ActionSpec = {
  name: _t("1 column"),
  execute: (model, env) => interactiveFreezeColumnsRows(model, env, "COL", 1),
};

export const freezeSecondCol: ActionSpec = {
  name: _t("2 columns"),
  execute: (model, env) => interactiveFreezeColumnsRows(model, env, "COL", 2),
};

export const freezeCurrentCol: ActionSpec = {
  name: _t("Up to current column"),
  execute: (model, env) => {
    const { right } = model.getters.getSelectedZone();
    interactiveFreezeColumnsRows(model, env, "COL", right + 1);
  },
};

export const viewGridlines: ActionSpec = {
  name: _t("Gridlines"),
  execute: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    model.dispatch("SET_GRID_LINES_VISIBILITY", {
      sheetId,
      areGridLinesVisible: !model.getters.getGridLinesVisibility(sheetId),
    });
  },
  isActive: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    return model.getters.getGridLinesVisibility(sheetId);
  },
};

export const irregularityMap: ActionSpec = {
  name: _t("Irregularity map"),
  execute: (model, env) => {
    const fingerprintStore = env.getStore(FormulaFingerprintStore);
    if (fingerprintStore.isEnabled) {
      fingerprintStore.disable();
    } else {
      fingerprintStore.enable();
    }
  },
  isReadonlyAllowed: true,
  isEnabledOnLockedSheet: true,
  icon: "o-spreadsheet-Icon.IRREGULARITY_MAP",
};

export function zoomAction(zoom: number): ActionSpec {
  return {
    name: _t("%(zoom_percentage)s%", { zoom_percentage: zoom }),
    execute: (model) => {
      model.dispatch("SET_ZOOM", { zoom: zoom / 100 });
    },
    isActive: (model: Model) => model.getters.getViewportZoomLevel() === zoom / 100,
    isReadonlyAllowed: true,
    isEnabledOnLockedSheet: true,
    sequence: zoom,
  };
}

export const viewFormulas: ActionSpec = {
  name: _t("Formulas"),
  isActive: (model: Model) => model.getters.shouldShowFormulas(),
  execute: (model) =>
    model.dispatch("SET_FORMULA_VISIBILITY", { show: !model.getters.shouldShowFormulas() }),
  isReadonlyAllowed: true,
  isEnabledOnLockedSheet: true,
};

export const groupColumns: ActionSpec = {
  name: (model) => {
    const selection = model.getters.getSelectedZone();
    if (selection.left === selection.right) {
      return _t("Group column %s", numberToLetters(selection.left));
    }
    return _t(
      "Group columns %s - %s",
      numberToLetters(selection.left),
      numberToLetters(selection.right)
    );
  },
  execute: (model) => groupHeadersAction(model, "COL"),
  isVisible: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    const selection = model.getters.getSelectedZone();
    const groups = model.getters.getHeaderGroupsInZone(sheetId, "COL", selection);

    return (
      ACTIONS.IS_ONLY_ONE_RANGE(model) &&
      !groups.some((group) => group.start === selection.left && group.end === selection.right)
    );
  },

  icon: "o-spreadsheet-Icon.GROUP_COLUMNS",
};

export const groupRows: ActionSpec = {
  name: (model) => {
    const selection = model.getters.getSelectedZone();
    if (selection.top === selection.bottom) {
      return _t("Group row %s", String(selection.top + 1));
    }
    return _t("Group rows %s - %s", String(selection.top + 1), String(selection.bottom + 1));
  },
  execute: (model) => groupHeadersAction(model, "ROW"),
  isVisible: (model) => {
    const sheetId = model.getters.getActiveSheetId();
    const selection = model.getters.getSelectedZone();
    const groups = model.getters.getHeaderGroupsInZone(sheetId, "ROW", selection);

    return (
      ACTIONS.IS_ONLY_ONE_RANGE(model) &&
      !groups.some((group) => group.start === selection.top && group.end === selection.bottom)
    );
  },

  icon: "o-spreadsheet-Icon.GROUP_ROWS",
};

export const ungroupColumns: ActionSpec = {
  name: (model) => {
    const selection = model.getters.getSelectedZone();
    if (selection.left === selection.right) {
      return _t("Ungroup column %s", numberToLetters(selection.left));
    }
    return _t(
      "Ungroup columns %s - %s",
      numberToLetters(selection.left),
      numberToLetters(selection.right)
    );
  },
  execute: (model) => ungroupHeaders(model, "COL"),

  icon: "o-spreadsheet-Icon.UNGROUP_COLUMNS",
};

export const ungroupRows: ActionSpec = {
  name: (model) => {
    const selection = model.getters.getSelectedZone();
    if (selection.top === selection.bottom) {
      return _t("Ungroup row %s", String(selection.top + 1));
    }
    return _t("Ungroup rows %s - %s", String(selection.top + 1), String(selection.bottom + 1));
  },
  execute: (model) => ungroupHeaders(model, "ROW"),

  icon: "o-spreadsheet-Icon.UNGROUP_ROWS",
};

function groupHeadersAction(model: Model, dim: Dimension) {
  const selection = model.getters.getSelectedZone();
  const sheetId = model.getters.getActiveSheetId();
  model.dispatch("GROUP_HEADERS", {
    sheetId,
    dimension: dim,
    start: dim === "COL" ? selection.left : selection.top,
    end: dim === "COL" ? selection.right : selection.bottom,
  });
}

function ungroupHeaders(model: Model, dim: Dimension) {
  const selection = model.getters.getSelectedZone();
  const sheetId = model.getters.getActiveSheetId();
  model.dispatch("UNGROUP_HEADERS", {
    sheetId,
    dimension: dim,
    start: dim === "COL" ? selection.left : selection.top,
    end: dim === "COL" ? selection.right : selection.bottom,
  });
}

export function canUngroupHeaders(model: Model, dimension: Dimension): boolean {
  const sheetId = model.getters.getActiveSheetId();
  const selection = model.getters.getSelectedZones();
  return (
    selection.length === 1 &&
    model.getters.getHeaderGroupsInZone(sheetId, dimension, selection[0]).length > 0
  );
}

export const togglePinPanel: ActionSpec = {
  name: (model, env) => {
    const sidepanelStore = env.getStore(SidePanelStore);
    return sidepanelStore.mainPanel && sidepanelStore.mainPanel.isPinned
      ? _t("Unpin the side panel")
      : _t("Pin the side panel");
  },
  isVisible: (model, env) => {
    return env.getStore(SidePanelStore).isMainPanelOpen;
  },
  execute: (model, env) => {
    env.getStore(SidePanelStore).togglePinPanel();
  },
  icon: "o-spreadsheet-Icon.THUMB_TACK",
};
