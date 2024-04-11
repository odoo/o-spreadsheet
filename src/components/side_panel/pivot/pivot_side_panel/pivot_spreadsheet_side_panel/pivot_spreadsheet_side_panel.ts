import { Component, useState } from "@odoo/owl";
import { SpreadsheetChildEnv } from "../../../../..";
import { splitReference, toZone } from "../../../../../helpers";
import { SpreadsheetPivotRuntimeDefinition } from "../../../../../helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetPivot } from "../../../../../helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { Store, useLocalStore } from "../../../../../store_engine";
import { _t } from "../../../../../translation";
import { UID } from "../../../../../types";
import { SpreadsheetPivotCoreDefinition } from "../../../../../types/pivot";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";
import { EditableName } from "../../editable_name/editable_name";
import { PivotLayoutConfigurator } from "../../pivot_layout_configurator/pivot_layout_configurator";
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
    EditableName,
    Checkbox,
  };
  store!: Store<PivotSidePanelStore>;

  state!: { range?: string; rangeHasChanged: boolean };

  setup() {
    this.store = useLocalStore(PivotSidePanelStore, this.props.pivotId);
    this.pivot.init();
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

  get name() {
    return this.env.model.getters.getPivotName(this.props.pivotId);
  }

  get displayName() {
    return this.env.model.getters.getPivotDisplayName(this.props.pivotId);
  }

  get definition(): SpreadsheetPivotRuntimeDefinition {
    return this.store.definition as SpreadsheetPivotRuntimeDefinition;
  }

  get deferUpdatesLabel() {
    return _t("Defer updates");
  }

  get deferUpdatesTooltip() {
    return _t("Changing the pivot definition requires to reload the data. It may take some time.");
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

  duplicatePivot() {
    const newPivotId = this.env.model.uuidGenerator.uuidv4();
    const result = this.env.model.dispatch("DUPLICATE_PIVOT", {
      pivotId: this.props.pivotId,
      newPivotId,
    });
    const text = result.isSuccessful ? _t("Pivot duplicated.") : _t("Pivot duplication failed");
    const type = result.isSuccessful ? "success" : "danger";
    this.env.notifyUser({
      text,
      sticky: false,
      type,
    });
    if (result.isSuccessful) {
      this.env.openSidePanel("PivotSidePanel", { pivotId: newPivotId });
    }
  }

  onNameChanged(name: string) {
    this.store.renamePivot(name);
  }

  onDimensionsUpdated(definition: Partial<SpreadsheetPivotCoreDefinition>) {
    this.store.update(definition);
  }

  back() {
    this.env.openSidePanel("PivotSidePanel", {});
  }

  delete() {
    this.env.model.dispatch("REMOVE_PIVOT", { pivotId: this.props.pivotId });
  }
}
