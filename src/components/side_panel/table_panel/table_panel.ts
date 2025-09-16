import { Component, useState } from "@odoo/owl";
import { getZoneArea, positionToZone } from "../../../helpers";
import {
  CommandResult,
  CoreTable,
  DispatchResult,
  Range,
  SpreadsheetChildEnv,
  TableConfig,
  Zone,
} from "../../../types";

import { getTableTopLeft } from "../../../helpers/table_helpers";
import { NumberInput } from "../../number_input/number_input";
import { SelectionInput } from "../../selection_input/selection_input";
import { TableStylePicker } from "../../tables/table_style_picker/table_style_picker";
import { TableTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

interface Props {
  table: CoreTable;
  onCloseSidePanel: () => void;
}

interface State {
  tableZoneErrors: CommandResult[];
  tableXc: string;
  /** We want to save the state of the "hasFilter" checkbox so that toggling the header off (which
   * disable the filters), then toggling it back on doesn't change the "hasFilter" state*/
  filtersEnabledIfPossible: boolean;
}

export class TablePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TablePanel";
  static components = {
    TableStylePicker,
    SelectionInput,
    ValidationMessages,
    Checkbox,
    Section,
    NumberInput,
  };
  static props = { onCloseSidePanel: Function, table: Object };

  state!: State;

  setup() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.state = useState({
      tableZoneErrors: [],
      tableXc: this.env.model.getters.getRangeString(this.props.table.range, sheetId),
      filtersEnabledIfPossible: this.props.table.config.hasFilters,
    });
  }

  updateHasFilters(hasFilters: boolean) {
    this.state.filtersEnabledIfPossible = hasFilters;
    this.updateTableConfig("hasFilters", hasFilters);
  }

  updateTableConfig(attName: keyof TableConfig, value: boolean | string | number): DispatchResult {
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.dispatch("UPDATE_TABLE", {
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
    const uiTable = this.env.model.getters.getTable(getTableTopLeft(this.props.table));
    if (!uiTable) {
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const result = this.env.model.dispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.env.model.getters.getRangeData(uiTable.range),
      tableType: newTableType,
    });
    const updatedTable = this.env.model.getters.getCoreTable(getTableTopLeft(this.props.table));
    if (result.isSuccessful && updatedTable) {
      const newTableRange = updatedTable.range;
      this.state.tableXc = this.env.model.getters.getRangeString(newTableRange, sheetId);
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
    return this.env.model.dispatch("UPDATE_TABLE", {
      sheetId: this.env.model.getters.getActiveSheetId(),
      zone: this.props.table.range.zone,
      config: { numberOfHeaders, hasFilters },
    });
  }

  onRangeChanged(ranges: string[]) {
    const sheetId = this.env.model.getters.getActiveSheetId();

    this.state.tableXc = ranges[0];
    const newTableRange = this.env.model.getters.getRangeFromSheetXC(sheetId, this.state.tableXc);
    this.state.tableZoneErrors = this.env.model.canDispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.env.model.getters.getRangeDataFromXc(sheetId, this.state.tableXc),
      tableType: this.getNewTableType(newTableRange.zone),
    }).reasons;
  }

  onRangeConfirmed() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    let newRange: Range = this.env.model.getters.getRangeFromSheetXC(sheetId, this.state.tableXc);
    if (getZoneArea(newRange.zone) === 1) {
      const extendedZone = this.env.model.getters.getContiguousZone(sheetId, newRange.zone);
      newRange = this.env.model.getters.getRangeFromZone(sheetId, extendedZone);
    }
    const newTableZone = newRange.zone;
    const oldTableZone = this.props.table.range.zone;
    const cmdToCall =
      newTableZone.top === oldTableZone.top && newTableZone.left === oldTableZone.left
        ? "RESIZE_TABLE"
        : "UPDATE_TABLE";
    const result = this.env.model.dispatch(cmdToCall, {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.env.model.getters.getRangeData(newRange),
      tableType: this.getNewTableType(newRange.zone),
    });

    const position = { sheetId, col: newRange.zone.left, row: newRange.zone.top };
    const updatedTable = this.env.model.getters.getCoreTable(position);

    if (result.isSuccessful && updatedTable) {
      const newTopLeft = getTableTopLeft(updatedTable);
      this.env.model.selection.selectZone({
        zone: positionToZone(newTopLeft),
        cell: newTopLeft,
      });
      const newTableRange = updatedTable.range;
      this.state.tableXc = this.env.model.getters.getRangeString(newTableRange, sheetId);
    }
  }

  deleteTable() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("REMOVE_TABLE", {
      sheetId,
      target: [this.props.table.range.zone],
    });
  }

  private getNewTableType(newTableZone: Zone) {
    if (this.props.table.type === "forceStatic") {
      return "forceStatic";
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    return this.env.model.getters.canCreateDynamicTableOnZones(sheetId, [newTableZone])
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
    const sheetId = this.env.model.getters.getActiveSheetId();
    return (
      this.props.table.type === "dynamic" ||
      this.env.model.getters.canCreateDynamicTableOnZones(sheetId, [this.props.table.range.zone])
    );
  }

  get dynamicTableTooltip() {
    return TableTerms.Tooltips.isDynamic;
  }
}
