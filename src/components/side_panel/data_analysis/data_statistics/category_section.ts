import { useProps } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { StatisticItem } from "./statistic_item";

export class CategorySection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-CategorySection";
  protected props = useProps({
    statSections: types.array(types.StatSection()),
  });
  static components = {
    StatisticItem,
  };
}
