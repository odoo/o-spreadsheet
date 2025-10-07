import { getUniquePivotGroupName } from "@odoo/o-spreadsheet-engine/helpers/pivot/pivot_helpers";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { Component } from "@odoo/owl";
import { deepCopy } from "../../../../helpers";
import {
  PivotCoreDefinition,
  PivotCustomGroup,
  PivotCustomGroupedField,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types";
import { TextInput } from "../../../text_input/text_input";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";

export interface Props {
  pivotId: UID;
  customField: PivotCustomGroupedField;
  onCustomFieldUpdated: (definition: Partial<PivotCoreDefinition>) => void;
}

export class PivotCustomGroupsCollapsible extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotCustomGroupsCollapsible";
  static props = {
    pivotId: String,
    customField: Object,
    onCustomFieldUpdated: Function,
  };
  static components = { SidePanelCollapsible, TextInput, Checkbox };

  get groups() {
    return this.props.customField.groups.sort((a, b) => {
      if (!a.isOtherGroup && !b.isOtherGroup) {
        return 0;
      }
      return a.isOtherGroup ? 1 : -1;
    });
  }

  get hasOthersGroup() {
    return this.props.customField.groups.some((group) => group.isOtherGroup);
  }

  addOthersGroup() {
    if (this.hasOthersGroup) {
      return;
    }
    const newGroup: PivotCustomGroup = {
      name: getUniquePivotGroupName(_t("Others"), this.props.customField),
      values: [],
      isOtherGroup: true,
    };
    const groups = [...this.props.customField.groups, newGroup];
    this.updateCustomField({ ...this.props.customField, groups });
  }

  onDeleteGroup(groupIndex: number) {
    const groups = [...this.props.customField.groups];
    groups.splice(groupIndex, 1);
    this.updateCustomField({ ...this.props.customField, groups });
  }

  onRenameGroup(groupIndex: number, newName: string) {
    const groups = deepCopy(this.props.customField.groups);
    const group = groups[groupIndex];
    if (group) {
      group.name = getUniquePivotGroupName(newName, this.props.customField);
      this.updateCustomField({ ...this.props.customField, groups });
    }
  }

  private updateCustomField(customField: PivotCustomGroupedField) {
    const definition = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    this.props.onCustomFieldUpdated({
      customFields: { ...definition.customFields, [customField.name]: customField },
    });
  }
}
