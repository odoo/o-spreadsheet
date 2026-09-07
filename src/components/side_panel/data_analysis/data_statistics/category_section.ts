import { useProps } from "@odoo/owl";
import { StatValue } from "../../../../helpers/data_statistics/statistics_items";
import { Component } from "../../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { Occurencies } from "./occurencies";
import { StatisticItem } from "./statistic_item";

export class CategorySection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CategorySection";
  protected props = useProps({
    statSections: types.array(types.StatSection()),
  });
  static components = {
    StatisticItem,
    Occurencies,
  };

  sort(
    items: StatValue[],
    sortType: "asc" | "desc" | "none"
  ): { sortedItems: StatValue[]; newSortType: "asc" | "desc" | "none" } {
    switch (sortType) {
      case "desc":
        return {
          sortedItems: items.sort(
            (a, b) => Number(a.value) - Number(b.value) || a.name.localeCompare(b.name)
          ),
          newSortType: "asc",
        };
      case "asc":
        return {
          sortedItems: items.sort((a, b) => a.name.localeCompare(b.name)),
          newSortType: "none",
        };
      case "none":
        return {
          sortedItems: items.sort(
            (a, b) => Number(b.value) - Number(a.value) || a.name.localeCompare(b.name)
          ),
          newSortType: "desc",
        };
    }
  }
}
