import { useProps } from "@odoo/owl";
import { ALL_PERIODS } from "../../../../../helpers/pivot/pivot_helpers";
import { ValueAndLabel } from "../../../../../types/misc";
import { PivotDimension } from "../../../../../types/pivot";
import { types } from "../../../../props_validation";
import { Select } from "../../../../select/select";
import { SpreadsheetComponent } from "../../../../spreadsheet/spreadsheet_component";

export class PivotDimensionGranularity extends SpreadsheetComponent {
  static template = "o-spreadsheet-PivotDimensionGranularity";
  protected props = useProps({
    dimension: types.PivotDimension(),
    onUpdated: types.function<(dimension: PivotDimension, ev: InputEvent) => void>(),
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
