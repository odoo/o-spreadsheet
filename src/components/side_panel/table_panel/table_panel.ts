import { props, proxy } from "@odoo/owl";
import { getZoneArea, positionToZone } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { CommandResult, DispatchResult } from "../../../types/commands";
import { Zone } from "../../../types/misc";
import { Range } from "../../../types/range";
import { TableConfig } from "../../../types/table";

import { getTableTopLeft } from "../../../helpers/table_helpers";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { NumberInput } from "../../number_input/number_input";
import { useModel } from "../../owl_plugins/model_plugin";
import { types } from "../../props_validation";
import { SelectionInput } from "../../selection_input/selection_input";
import { TableStylePicker } from "../../tables/table_style_picker/table_style_picker";
import { TableTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

interface State {
  tableZoneErrors: CommandResult[];
  tableXc: string;
  /** We want to save the state of the "hasFilter" checkbox so that toggling the header off (which
   * disable the filters), then toggling it back on doesn't change the "hasFilter" state*/
  filtersEnabledIfPossible: boolean;
}

export class TablePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TablePanel";
  static components = {
    TableStylePicker,
    SelectionInput,
    ValidationMessages,
    Checkbox,
    Section,
    NumberInput,
  };
  protected props = props({
    onCloseSidePanel: types.function([]),
    table: types.CoreTable(),
  });

  state!: State;

  private model = useModel();
  setup() {
    const sheetId = this.model().getters.getActiveSheetId();
    this.state = proxy({
      tableZoneErrors: [],
      tableXc: this.model().getters.getRangeString(this.props.table.range, sheetId),
      filtersEnabledIfPossible: this.props.table.config.hasFilters,
    });
  }

  updateHasFilters(hasFilters: boolean) {
    this.state.filtersEnabledIfPossible = hasFilters;
    this.updateTableConfig("hasFilters", hasFilters);
  }

  updateTableConfig(attName: keyof TableConfig, value: boolean | string | number): DispatchResult {
    const sheetId = this.model().getters.getActiveSheetId();
    return this.model().dispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      config: { [attName]: value },
    });
  }

  updateHasHeaders(hasHeaders: boolean) {
    const numberOfHeaders = hasHeaders ? 1 : 0;
    this.updateNumberOfHeaders(numberOfHeaders);
  }

  updateTableIsDynamic(isDynamic: boolean) {
    const newTableType = isDynamic ? "dynamic" : "forceStatic";
    if (newTableType === this.props.table.type) {
      return;
    }
    const uiTable = this.model().getters.getTable(getTableTopLeft(this.props.table));
    if (!uiTable) {
      return;
    }
    const sheetId = this.model().getters.getActiveSheetId();
    const result = this.model().dispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.model().getters.getRangeData(uiTable.range),
      tableType: newTableType,
    });
    const updatedTable = this.model().getters.getCoreTable(getTableTopLeft(this.props.table));
    if (result.isSuccessful && updatedTable) {
      const newTableRange = updatedTable.range;
      this.state.tableXc = this.model().getters.getRangeString(newTableRange, sheetId);
      this.state.tableZoneErrors = [];
    }
  }

  onChangeNumberOfHeaders(value: string) {
    const numberOfHeaders = parseInt(value);
    this.updateNumberOfHeaders(numberOfHeaders);
  }

  private updateNumberOfHeaders(numberOfHeaders: number) {
    const hasFilters =
      numberOfHeaders > 0 && (this.tableConfig.hasFilters || this.state.filtersEnabledIfPossible);
    return this.model().dispatch("UPDATE_TABLE", {
      sheetId: this.model().getters.getActiveSheetId(),
      zone: this.props.table.range.zone,
      config: { numberOfHeaders, hasFilters },
    });
  }

  onRangeChanged(ranges: string[]) {
    const sheetId = this.model().getters.getActiveSheetId();

    this.state.tableXc = ranges[0];
    const newTableRange = this.model().getters.getRangeFromSheetXC(sheetId, this.state.tableXc);
    this.state.tableZoneErrors = this.model().canDispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.model().getters.getRangeDataFromXc(sheetId, this.state.tableXc),
      tableType: this.getNewTableType(newTableRange.zone),
    }).reasons;
  }

  onRangeConfirmed() {
    const sheetId = this.model().getters.getActiveSheetId();
    let newRange: Range = this.model().getters.getRangeFromSheetXC(sheetId, this.state.tableXc);
    if (getZoneArea(newRange.zone) === 1) {
      const extendedZone = this.model().getters.getContiguousZone(sheetId, newRange.zone);
      newRange = this.model().getters.getRangeFromZone(sheetId, extendedZone);
    }
    const newTableZone = newRange.zone;
    const oldTableZone = this.props.table.range.zone;
    const cmdToCall =
      newTableZone.top === oldTableZone.top && newTableZone.left === oldTableZone.left
        ? "RESIZE_TABLE"
        : "UPDATE_TABLE";
    const result = this.model().dispatch(cmdToCall, {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.model().getters.getRangeData(newRange),
      tableType: this.getNewTableType(newRange.zone),
    });

    const position = { sheetId, col: newRange.zone.left, row: newRange.zone.top };
    const updatedTable = this.model().getters.getCoreTable(position);

    if (result.isSuccessful && updatedTable) {
      const newTopLeft = getTableTopLeft(updatedTable);
      this.model().selection.selectZone({
        zone: positionToZone(newTopLeft),
        cell: newTopLeft,
      });
      const newTableRange = updatedTable.range;
      this.state.tableXc = this.model().getters.getRangeString(newTableRange, sheetId);
    }
  }

  onStylePicked(styleId: string) {
    const sheetId = this.model().getters.getActiveSheetId();
    this.model().dispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      config: { styleId: styleId },
    });
  }

  deleteTable() {
    const sheetId = this.model().getters.getActiveSheetId();
    this.model().dispatch("REMOVE_TABLE", {
      sheetId,
      target: [this.props.table.range.zone],
    });
  }

  private getNewTableType(newTableZone: Zone) {
    if (this.props.table.type === "forceStatic") {
      return "forceStatic";
    }
    const sheetId = this.model().getters.getActiveSheetId();
    return this.model().getters.canCreateDynamicTableOnZones(sheetId, [newTableZone])
      ? "dynamic"
      : "static";
  }

  get tableConfig(): TableConfig {
    return this.props.table.config;
  }

  get errorMessages(): string[] {
    const cancelledReasons = this.state.tableZoneErrors || [];
    return cancelledReasons.map(
      (error) => TableTerms.Errors[error] || TableTerms.Errors.Unexpected
    );
  }

  getCheckboxLabel(attName: keyof TableConfig): string {
    return TableTerms.Checkboxes[attName];
  }

  get canHaveFilters(): boolean {
    return this.tableConfig.numberOfHeaders > 0;
  }

  get hasFilterCheckboxTooltip() {
    return this.canHaveFilters ? undefined : TableTerms.Tooltips.filterWithoutHeader;
  }

  get canBeDynamic() {
    const sheetId = this.model().getters.getActiveSheetId();
    return (
      this.props.table.type === "dynamic" ||
      this.model().getters.canCreateDynamicTableOnZones(sheetId, [this.props.table.range.zone])
    );
  }

  get dynamicTableTooltip() {
    return TableTerms.Tooltips.isDynamic;
  }
}
