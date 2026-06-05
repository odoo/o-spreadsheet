import { props } from "@odoo/owl";
import { DEFAULT_PIVOT_STYLE } from "../../../../../helpers/pivot/pivot_helpers";
import { PIVOT_TABLE_PRESETS } from "../../../../../helpers/pivot_table_presets";
import { Component } from "../../../../../owl3_compatibility_layer";
import { useLocalStore } from "../../../../../store_engine/store_hooks";
import { PivotStyle } from "../../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
import { Store } from "../../../../../types/store_engine";
import { TableConfig, TableStyle } from "../../../../../types/table";
import { NumberInput } from "../../../../number_input/number_input";
import { useModel } from "../../../../owl_plugins/model_plugin";
import { types } from "../../../../props_validation";
import { TableStylePicker } from "../../../../tables/table_style_picker/table_style_picker";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { PivotSidePanelStore } from "../pivot_side_panel_store";

export class PivotDesignPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDesignPanel";
  static components = { Section, Checkbox, NumberInput, TableStylePicker };

  protected props = props({
    pivotId: types.UID(),
  });

  store!: Store<PivotSidePanelStore>;

  private model = useModel();
  setup() {
    this.store = useLocalStore(PivotSidePanelStore, this.props.pivotId, "neverDefer");
  }

  updatePivotStyleNumberProperty(valueStr: string, key: keyof PivotStyle) {
    const value = parseInt(valueStr);
    this.store.update({ style: { ...this.pivotStyle, [key]: isNaN(value) ? undefined : value } });
  }

  updatePivotStyleProperty(key: keyof PivotStyle, value: PivotStyle[keyof PivotStyle]) {
    this.store.update({ style: { ...this.pivotStyle, [key]: value } });
  }

  get pivotStyle() {
    const pivot = this.model().getters.getPivotCoreDefinition(this.props.pivotId);
    return pivot.style || {};
  }

  get defaultStyle() {
    return DEFAULT_PIVOT_STYLE;
  }

  get tableConfig(): TableConfig {
    const hasHeaderRow =
      (this.pivotStyle.displayMeasuresRow ?? DEFAULT_PIVOT_STYLE.displayMeasuresRow) ||
      (this.pivotStyle.displayColumnHeaders ?? DEFAULT_PIVOT_STYLE.displayColumnHeaders);
    return {
      hasFilters: false,
      totalRow: this.pivotStyle.displayTotals ?? DEFAULT_PIVOT_STYLE.displayTotals,
      firstColumn: true,
      lastColumn: false,
      styleId: this.pivotStyle.tableStyleId ?? DEFAULT_PIVOT_STYLE.tableStyleId,
      bandedRows: this.pivotStyle.bandedRows ?? DEFAULT_PIVOT_STYLE.bandedRows,
      bandedColumns: this.pivotStyle.bandedColumns ?? DEFAULT_PIVOT_STYLE.bandedColumns,
      numberOfHeaders: hasHeaderRow ? 1 : 0,
    };
  }

  onStylePicked(styleId: string) {
    this.updatePivotStyleProperty("tableStyleId", styleId);
  }

  get tableStyles(): Record<string, TableStyle> {
    return PIVOT_TABLE_PRESETS;
  }
}
