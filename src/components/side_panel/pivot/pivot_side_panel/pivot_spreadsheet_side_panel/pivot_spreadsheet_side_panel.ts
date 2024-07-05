import { Component, useState } from "@odoo/owl";
import { splitReference, toZone } from "../../../../../helpers";
import { SpreadsheetPivotRuntimeDefinition } from "../../../../../helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetPivot } from "../../../../../helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { Store, useLocalStore } from "../../../../../store_engine";
import { SpreadsheetChildEnv, UID } from "../../../../../types";
import { SpreadsheetPivotCoreDefinition } from "../../../../../types/pivot";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { PivotDeferUpdate } from "../../pivot_defer_update/pivot_defer_update";
import { PivotLayoutConfigurator } from "../../pivot_layout_configurator/pivot_layout_configurator";
import { PivotTitleSection } from "../../pivot_title_section/pivot_title_section";
import { PivotSidePanelStore } from "../pivot_side_panel_store";

interface Props {
  pivotId: UID;
  onCloseSidePanel: () => void;
}

export class PivotSpreadsheetSidePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotSpreadsheetSidePanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
  };
  static components = {
    PivotLayoutConfigurator,
    Section,
    SelectionInput,
    Checkbox,
    PivotDeferUpdate,
    PivotTitleSection,
  };
  store!: Store<PivotSidePanelStore>;

  state!: { range?: string; rangeHasChanged: boolean };

  setup() {
    this.store = useLocalStore(PivotSidePanelStore, this.props.pivotId);
    this.state = useState({
      range: undefined,
      rangeHasChanged: false,
    });
  }

  get shouldDisplayInvalidRangeError() {
    if (this.store.isDirty && this.state.rangeHasChanged) {
      return false;
    }
    return this.pivot.isInvalidRange;
  }

  get ranges() {
    if (this.state.range) {
      return [this.state.range];
    }
    if (this.definition.range) {
      return [this.env.model.getters.getRangeString(this.definition.range, "forceSheetReference")];
    }
    return [];
  }

  get pivot() {
    return this.store.pivot as SpreadsheetPivot;
  }

  get definition(): SpreadsheetPivotRuntimeDefinition {
    return this.store.definition as SpreadsheetPivotRuntimeDefinition;
  }

  onSelectionChanged(ranges: string[]) {
    this.state.rangeHasChanged = true;
    this.state.range = ranges[0];
  }

  onSelectionConfirmed() {
    if (this.state.range) {
      const { sheetName, xc } = splitReference(this.state.range);
      const sheetId = sheetName
        ? this.env.model.getters.getSheetIdByName(sheetName)
        : this.env.model.getters.getActiveSheetId();
      if (!sheetId) {
        return;
      }
      const zone = toZone(xc);
      const dataSet = { sheetId, zone };
      this.store.update({ dataSet });
      // Immediately apply the update to recompute the pivot fields
      this.store.applyUpdate();
    }
  }

  flipAxis() {
    const { rows, columns } = this.definition;
    this.onDimensionsUpdated({
      rows: columns,
      columns: rows,
    });
  }

  onDimensionsUpdated(definition: Partial<SpreadsheetPivotCoreDefinition>) {
    this.store.update(definition);
  }
}
