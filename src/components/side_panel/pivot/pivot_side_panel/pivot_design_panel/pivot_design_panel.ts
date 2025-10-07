import { DEFAULT_PIVOT_STYLE } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component } from "@odoo/owl";
import { Store, useLocalStore } from "../../../../../store_engine";
import { PivotStyle, UID } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { PivotSidePanelStore } from "../pivot_side_panel_store";

interface Props {
  pivotId: UID;
}

export class PivotDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotDesignPanel";
  static props = { pivotId: String };
  static components = { Section, Checkbox };

  store!: Store<PivotSidePanelStore>;

  setup() {
    this.store = useLocalStore(PivotSidePanelStore, this.props.pivotId, "neverDefer");
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
}
