import { Action, createActions } from "../../actions/action";
import * as ACTION_VIEW from "../../actions/view_actions";
import { interactiveToggleGroup } from "../../helpers/ui/toggle_group_interactive";
import { _t } from "../../translation";
import { Dimension, UID } from "../../types";
import { MenuItemRegistry } from "../menu_items_registry";

export function createHeaderGroupContainerContextMenu(
  sheetId: UID,
  dimension: Dimension
): Action[] {
  return createActions([
    {
      id: "unfold_all",
      name: dimension === "ROW" ? _t("Expand all row groups") : _t("Expand all column groups"),
      execute: (env) => {
        env.model.dispatch("UNFOLD_ALL_HEADER_GROUPS", { sheetId, dimension });
      },
    },
    {
      id: "fold_all",
      name: dimension === "ROW" ? _t("Collapse all row groups") : _t("Collapse all column groups"),
      execute: (env) => {
        env.model.dispatch("FOLD_ALL_HEADER_GROUPS", { sheetId, dimension });
      },
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
      name: (env) => {
        const sheetId = env.model.getters.getActiveSheetId();
        const groupIsFolded = env.model.getters.isGroupFolded(sheetId, dimension, start, end);
        if (groupIsFolded) {
          return dimension === "ROW" ? _t("Expand row group") : _t("Expand column group");
        } else {
          return dimension === "ROW" ? _t("Collapse row group") : _t("Collapse column group");
        }
      },
      execute: (env) => {
        const sheetId = env.model.getters.getActiveSheetId();
        interactiveToggleGroup(env, sheetId, dimension, start, end);
      },
    },
    {
      id: "remove_group",
      name: dimension === "ROW" ? _t("Remove row group") : _t("Remove column group"),
      execute: (env) => {
        const sheetId = env.model.getters.getActiveSheetId();
        env.model.dispatch("UNGROUP_HEADERS", { sheetId, dimension, start, end });
      },
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
