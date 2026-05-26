import { props } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/misc";
import { getUniquePivotGroupName } from "../../../../helpers/pivot/pivot_helpers";
import { Component } from "../../../../owl3_compatibility_layer";
import { _t } from "../../../../translation";
import {
  PivotCoreDefinition,
  PivotCustomGroup,
  PivotCustomGroupedField,
} from "../../../../types/pivot";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { types } from "../../../props_validation";
import { TextInput } from "../../../text_input/text_input";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";

export class PivotCustomGroupsCollapsible extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotCustomGroupsCollapsible";
  protected props = props({
    pivotId: types.UID(),
    customField: types.PivotCustomGroupedField(),
    onCustomFieldUpdated: types.function<[definition: Partial<PivotCoreDefinition>]>([
      types.object({}) as Partial<PivotCoreDefinition>,
    ]),
  });
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
