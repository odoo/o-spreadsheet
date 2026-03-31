import { Component } from "@odoo/owl";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { DEFAULT_PIVOT_STYLE } from "../../../../../helpers/pivot/pivot_helpers";
import { PIVOT_TABLE_PRESETS } from "../../../../../helpers/pivot_table_presets";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
=======
import { DEFAULT_PIVOT_STYLE } from "../../../../../helpers/pivot/pivot_helpers";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { Store, useLocalStore } from "../../../../../store_engine";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { PivotStyle, TableConfig, TableStyle, UID } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { PivotStyle, UID } from "../../../../../types";
=======
import { PivotStyle, UID } from "../../../../../types";
import { SpreadsheetChildEnv } from "../../../../../types/spreadsheet_env";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db
import { NumberInput } from "../../../../number_input/number_input";
import { TableStylePicker } from "../../../../tables/table_style_picker/table_style_picker";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { PivotSidePanelStore } from "../pivot_side_panel_store";

interface Props {
  pivotId: UID;
}

export class PivotDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDesignPanel";
  static props = { pivotId: String };
  static components = { Section, Checkbox, NumberInput, TableStylePicker };

  store!: Store<PivotSidePanelStore>;

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
    const pivot = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
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
