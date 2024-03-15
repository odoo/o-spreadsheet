import { Component, useState } from "@odoo/owl";
import { positionToZone, rangeReference } from "../../../helpers";
import {
  CommandResult,
  DispatchResult,
  SpreadsheetChildEnv,
  Table,
  TableConfig,
} from "../../../types";
import { css } from "../../helpers";
import { SelectionInput } from "../../selection_input/selection_input";
import { TableStylePicker } from "../../tables/table_style_picker/table_style_picker";
import { TableTerms } from "../../translations_terms";
import { ValidationMessages } from "../../validation_messages/validation_messages";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

interface Props {
  table: Table;
  onCloseSidePanel: () => void;
}

interface State {
  tableZoneErrors: CommandResult[];
  tableXc: string;
  /** We want to save the state of the "hasFilter" checkbox so that toggling the header off (which
   * disable the filters), then toggling it back on doesn't change the "hasFilter" state*/
  filtersEnabledIfPossible: boolean;
}

css/* scss */ `
  .o-table-panel {
    .o-table-n-of-headers {
      width: 14px;
      color: #666666;
      line-height: 1;
      text-align: center;
      border: none;
      border-bottom: 1px solid #ccc;
      padding: 0px 2px;
      &:focus {
        outline: none;
      }
    }
  }
`;

export class TablePanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TablePanel";
  static components = { TableStylePicker, SelectionInput, ValidationMessages, Checkbox, Section };
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

  onChangeNumberOfHeaders(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const numberOfHeaders = parseInt(input.value);
    const result = this.updateNumberOfHeaders(numberOfHeaders);

    if (!result.isSuccessful) {
      input.value = this.props.table.config.numberOfHeaders.toString();
    }
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
    if (!ranges[0] || !ranges[0].match(rangeReference)) {
      this.state.tableZoneErrors = [CommandResult.InvalidRange];
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();

    this.state.tableXc = ranges[0];
    this.state.tableZoneErrors = this.env.model.canDispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: this.env.model.getters.getRangeDataFromXc(sheetId, this.state.tableXc),
    }).reasons;
  }

  onRangeConfirmed() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const newRange = this.env.model.getters.getRangeFromSheetXC(sheetId, this.state.tableXc);
    const result = this.env.model.dispatch("UPDATE_TABLE", {
      sheetId,
      zone: this.props.table.range.zone,
      newTableRange: newRange.rangeData,
    });

    if (result.isSuccessful) {
      const position = { col: newRange.zone.left, row: newRange.zone.top };
      this.env.model.selection.selectZone({
        zone: positionToZone(position),
        cell: position,
      });
    }
    this.state.tableZoneErrors = [];
    this.state.tableXc = result.isSuccessful
      ? this.state.tableXc
      : this.env.model.getters.getRangeString(this.props.table.range, sheetId);
  }

  deleteTable() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    this.env.model.dispatch("REMOVE_TABLE", { sheetId, target: [this.props.table.range.zone] });
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
}
