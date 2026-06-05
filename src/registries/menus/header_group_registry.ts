import { Action, createActions } from "../../actions/action";
import * as ACTION_VIEW from "../../actions/view_actions";
import { interactiveToggleGroup } from "../../helpers/ui/toggle_group_interactive";
import { _t } from "../../translation";
import { Dimension, UID } from "../../types/misc";
import { MenuItemRegistry } from "../menu_items_registry";

export function createHeaderGroupContainerContextMenu(
  sheetId: UID,
  dimension: Dimension
): Action[] {
  return createActions([
    {
      id: "unfold_all",
      name: dimension === "ROW" ? _t("Expand all row groups") : _t("Expand all column groups"),
      execute: (model) => {
        model.dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension });
      },
      icon: "o-spreadsheet-Icon.EXPAND",
    },
    {
      id: "fold_all",
      name: dimension === "ROW" ? _t("Collapse all row groups") : _t("Collapse all column groups"),
      execute: (model) => {
        model.dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension });
      },
      icon: "o-spreadsheet-Icon.COLLAPSE",
    },
  ]);
}

export function getHeaderGroupContextMenu(
  sheetId: UID,
  dimension: Dimension,
  start: number,
  end: number
): Action[] {
  const groupActions: Action[] = createActions([
    {
      id: "toggle_group",
      name: (model) => {
        const sheetId = model.getters.getActiveSheetId();
        const groupIsFolded = model.getters.isGroupFolded(sheetId, dimension, start, end);
        if (groupIsFolded) {
          return dimension === "ROW" ? _t("Expand row group") : _t("Expand column group");
        } else {
          return dimension === "ROW" ? _t("Collapse row group") : _t("Collapse column group");
        }
      },
      execute: (model, env) => {
        const sheetId = model.getters.getActiveSheetId();
        interactiveToggleGroup(model, env, sheetId, dimension, start, end);
      },
      icon: (model) => {
        const sheetId = model.getters.getActiveSheetId();
        const groupIsFolded = model.getters.isGroupFolded(sheetId, dimension, start, end);
        return groupIsFolded ? "o-spreadsheet-Icon.EXPAND" : "o-spreadsheet-Icon.COLLAPSE";
      },
    },
    {
      id: "remove_group",
      name: dimension === "ROW" ? _t("Remove row group") : _t("Remove column group"),
      execute: (model) => {
        const sheetId = model.getters.getActiveSheetId();
        model.dispatch("UNGROUP_HEADERS", { sheetId, dimension, start, end });
      },
      icon: "o-spreadsheet-Icon.TRASH",
      separator: true,
    },
  ]);

  return [...groupActions, ...createHeaderGroupContainerContextMenu(sheetId, dimension)];
}

export const groupHeadersMenuRegistry = new MenuItemRegistry();
groupHeadersMenuRegistry
  .add("group_columns", {
    sequence: 10,
    ...ACTION_VIEW.groupColumns,
    isVisible: () => true,
    isEnabled: ACTION_VIEW.groupColumns.isVisible,
  })
  .add("group_rows", {
    sequence: 20,
    ...ACTION_VIEW.groupRows,
    isVisible: () => true,
    isEnabled: ACTION_VIEW.groupRows.isVisible,
  });

export const unGroupHeadersMenuRegistry = new MenuItemRegistry();
unGroupHeadersMenuRegistry
  .add("ungroup_columns", {
    sequence: 10,
    ...ACTION_VIEW.ungroupColumns,
    isEnabled: (env) => ACTION_VIEW.canUngroupHeaders(env, "COL"),
  })
  .add("ungroup_rows", {
    sequence: 20,
    ...ACTION_VIEW.ungroupRows,
    isEnabled: (env) => ACTION_VIEW.canUngroupHeaders(env, "ROW"),
  });
