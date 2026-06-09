import { props } from "@odoo/owl";
import { _t } from "../../../../../translation";
import { Color, UID } from "../../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Section } from "../../../components/section/section";

import { onWillUpdateProps } from "@odoo/owl";
import { Component } from "../../../../../owl3_compatibility_layer";
import { types } from "../../../../props_validation";

export class ChartDataSeries extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartDataSeries";
  static components = { SelectionInput, Section };

  protected props = props({
    ranges: types.ArrayOf<{ dataRange: string; dataSetId: UID }>(),
    "dataSetStyles?": types.DataSetStyle(),
    "hasSingleRange?": types.boolean(),
    onSelectionChanged: types.function<(ranges: string[]) => void>(),
    "onSelectionReordered?": types.function<(indexes: number[]) => void>(),
    "onSelectionRemoved?": types.function<(index: number) => void>(),
    onSelectionConfirmed: types.function(),
    "maxNumberOfUsedRanges?": types.number(),
    "title?": types.string(),
    "datasetOrientation?": types.or([types.literal("rows"), types.literal("columns")]),
    "canChangeDatasetOrientation?": types.boolean(),
    "onFlipAxis?": types.function<(structure: string) => void>(),
  });

  get ranges(): string[] {
    return this.props.ranges.map((r) => r.dataRange);
  }
  setup() {
    // TODO: remove this hook.
    // Required to ensure that it's part of the same update cycle as its child component so it can pass the correct version of the props.
    onWillUpdateProps(async () => {});
  }

  get disabledRanges(): boolean[] {
    return this.props.ranges.map((r, i) =>
      this.props.maxNumberOfUsedRanges ? i >= this.props.maxNumberOfUsedRanges : false
    );
  }

  get colors(): (Color | undefined)[] {
    return this.props.ranges.map((r) => this.props.dataSetStyles?.[r.dataSetId]?.backgroundColor);
  }

  get title() {
    if (this.props.title) {
      return this.props.title;
    }
    return this.props.hasSingleRange ? _t("Data range") : _t("Data series");
  }
}
