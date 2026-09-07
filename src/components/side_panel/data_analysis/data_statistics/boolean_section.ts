import { useProps } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { Occurencies } from "./occurencies";
import { StatisticItem } from "./statistic_item";

export class BooleanSection extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-BooleanSection";
  protected props = useProps({
    section: types.StatSection(),
  });
  static components = {
    StatisticItem,
    Occurencies,
  };
}
