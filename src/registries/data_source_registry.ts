import { Model } from "../model";
import { _t } from "../translation";
import { Getters } from "../types/getters";
import { UID } from "../types/misc";
import { Registry } from "./registry";

export interface UnusedDataSource {
  label: string;
  id: UID;
}

interface DataSourceType {
  type: string;
  unusedLabel: string;
  getUnusedInstances: (getters: Getters) => UnusedDataSource[];
  deleteDataSource: (dispatch: Model["dispatch"], id: UID) => void;
}

export const unusedDataSourceRegistry = new Registry<DataSourceType>();

unusedDataSourceRegistry.add("pivot", {
  type: "pivot",
  unusedLabel: _t("Unused pivots"),
  deleteDataSource: (dispatch, id) => dispatch("REMOVE_PIVOT", { pivotId: id }),
  getUnusedInstances: (getters) => {
    const unusedPivots: UnusedDataSource[] = [];
    for (const id of getters.getPivotIds()) {
      if (getters.isPivotUnused(id)) {
        unusedPivots.push({ id, label: getters.getPivotDisplayName(id) });
      }
    }
    return unusedPivots;
  },
});
