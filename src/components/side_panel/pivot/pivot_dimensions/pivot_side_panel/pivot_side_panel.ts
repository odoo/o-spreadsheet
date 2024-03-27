import { Component } from "@odoo/owl";
import { SpreadsheetChildEnv, UID } from "../../../../..";
import { zoneToXc } from "../../../../../helpers";
import { SpreadsheetPivotRuntimeDefinition } from "../../../../../helpers/pivot/spreadsheet_pivot";
import { Store, useLocalStore } from "../../../../../store_engine";
import { PivotSidePanelStore } from "../../../../../stores/pivot_side_panel_store";
import { PivotDimensions } from "../pivot_dimensions";

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

export class PivotSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSidePanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = {
    PivotDimensions,
  };
  store!: Store<PivotSidePanelStore>;

  setup() {
    this.store = useLocalStore(PivotSidePanelStore, this.props.pivotId);
  }
  get pivot() {
    return this.env.model.getters.getPivot(this.props.pivotId);
  }

  get zone() {
    return zoneToXc(this.definition.range.zone);
  }

  get definition(): SpreadsheetPivotRuntimeDefinition {
    return this.pivot.definition as SpreadsheetPivotRuntimeDefinition;
  }

  onDimensionsUpdated(definition) {
    this.store.update(definition);
  }
}
