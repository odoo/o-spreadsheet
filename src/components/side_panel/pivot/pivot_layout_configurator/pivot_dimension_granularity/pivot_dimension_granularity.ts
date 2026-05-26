import { props } from "@odoo/owl";
import { ALL_PERIODS } from "../../../../../helpers/pivot/pivot_helpers";
import { Component } from "../../../../../owl3_compatibility_layer";
import { ValueAndLabel } from "../../../../../types/misc";
import { PivotDimension } from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { types } from "../../../../props_validation";
import { Select } from "../../../../select/select";

export class PivotDimensionGranularity extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDimensionGranularity";
  protected props = props({
    dimension: types.PivotDimension(),
    onUpdated: types.function<[dimension: PivotDimension, ev: InputEvent]>([
      types.PivotDimension(),
      types.instanceOf(InputEvent),
    ]),
    availableGranularities: types.SetOf<string>(),
    allGranularities: types.array(),
  });
  static components = { Select };
  periods = ALL_PERIODS;

  get granularityOptions(): ValueAndLabel[] {
    const propsGranularity = this.props.dimension.granularity || "month";
    return this.props.allGranularities
      .filter(
        (granularity) =>
          this.props.availableGranularities.has(granularity) || granularity === propsGranularity
      )
      .map((granularity) => ({
        value: granularity,
        label: this.periods[granularity],
      }));
  }
}
