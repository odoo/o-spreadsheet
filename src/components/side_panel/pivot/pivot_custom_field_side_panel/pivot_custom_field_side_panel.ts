import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { Action, createActions } from "../../../../actions/action";
import { deepCopy, deepEquals } from "../../../../helpers";
import { createPivotGroupName } from "../../../../helpers/pivot/pivot_helpers";
import { pivotSidePanelRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { _t } from "../../../../translation";
import {
  CellValue,
  PivotCustomGroup,
  PivotCustomGroupedField,
  SpreadsheetChildEnv,
  UID,
  ValueWithLabel,
} from "../../../../types";
import { TextInput } from "../../../text_input/text_input";
import { Section } from "../../components/section/section";
import { SelectMenu } from "../../select_menu/select_menu";

interface Props {
  pivotId: UID;
  customField?: PivotCustomGroupedField;
  onCloseSidePanel: () => void;
}

interface State {
  customField: PivotCustomGroupedField;
}

export class PivotCustomFieldPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotCustomFieldPanel";
  static props = {
    pivotId: String,
    onCloseSidePanel: Function,
    customField: { type: Object, optional: true },
  };
  static components = { Section, TextInput, SelectMenu };

  state = useState<State>({
    customField: this.getInitialCustomField(this.props),
  });

  setup(): void {
    onWillUpdateProps((nextProps) => {
      if (!deepEquals(nextProps.customField, this.props.customField)) {
        this.state.customField = this.getInitialCustomField(nextProps);
      }
    });
  }

  getInitialCustomField(props: Props): PivotCustomGroupedField {
    if (props.customField) {
      return deepCopy(props.customField);
    }
    return { parentField: "", groups: [], name: "" };
  }

  onValuesChanged(values: string[]) {
    console.log("Values changed:", values);
  }

  get pivot() {
    return this.env.model.getters.getPivot(this.props.pivotId);
  }

  get GroupEditorComponent() {
    return pivotSidePanelRegistry.get(this.pivot.type).fieldGroupEditor;
  }

  get parentField() {
    return this.state.customField.parentField;
  }

  get groups() {
    return this.customField?.groups || [];
  }

  get customField() {
    return this.state.customField;
  }

  updateCustomFieldName(newName: string) {
    this.state.customField.name = newName;
  }

  updateGroupName(group: PivotCustomGroup, newName: string) {
    const newGroup: PivotCustomGroup = { ...group, name: newName };
    this.updateGroup(group, newGroup);
  }

  onUpdateGroupValues(group: PivotCustomGroup, values: ValueWithLabel<CellValue>[]) {
    const newGroup: PivotCustomGroup = { ...group, values: values.map((v) => v.value) };
    if (this.doesGroupHaveDefaultName(group)) {
      newGroup.name = createPivotGroupName(newGroup.values);
    }

    this.updateGroup(group, newGroup);
  }

  private updateGroup(oldGroup: PivotCustomGroup | undefined, newGroup: PivotCustomGroup) {
    const customField = this.state.customField;
    const groupIndex = customField.groups.findIndex((g) => g.name === oldGroup?.name);
    if (groupIndex === -1) {
      customField.groups.push(newGroup);
    } else {
      customField.groups[groupIndex] = newGroup;
    }
  }

  deleteGroup(group: PivotCustomGroup) {
    const customField = this.state.customField;
    const groupIndex = customField.groups.findIndex((g) => g.name === group.name);
    if (groupIndex !== -1) {
      customField.groups.splice(groupIndex, 1);
    }
  }

  onSave() {
    console.log("onSave", this.state.customField);
    const definition = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    const customFields = { ...definition.customFields };
    const oldName = Object.keys(customFields).find(
      (name) => customFields[name].parentField === this.state.customField.parentField
    );
    if (oldName && oldName !== this.state.customField.name) {
      // ADRM TODO: also need to update pivot dimensions if the name changed
      delete customFields[oldName];
    }
    this.state.customField.groups = this.state.customField.groups.filter(
      (group) => group.values.length > 0
    );
    customFields[this.state.customField.name] = this.state.customField;
    this.env.model.dispatch("UPDATE_PIVOT", {
      pivotId: this.props.pivotId,
      pivot: {
        ...definition,
        customFields,
      },
    });
  }

  private doesGroupHaveDefaultName(group: PivotCustomGroup): boolean {
    return group.name === createPivotGroupName(group.values);
  }

  get parentFieldsMenuItems(): Action[] {
    const fields = this.pivot.getFields();
    return createActions(
      Object.keys(fields).map((fieldName) => ({
        name: fieldName,
        execute: () => {
          const definition = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
          const customFields = { ...definition.customFields };
          const customField = Object.values(customFields || {}).find(
            (customField) => customField.parentField === fieldName
          );
          if (customField) {
            this.state.customField = customField;
          } else {
            this.state.customField = {
              parentField: fieldName,
              groups: [],
              name: fieldName + "2",
            };
          }
        },
      }))
    );
  }

  addNewGroup() {
    const newGroup: PivotCustomGroup = {
      name: this.getUniquePivotGroupName(_t("Group"), this.state.customField),
      values: [],
    };
    this.updateGroup(undefined, newGroup);
  }

  private getUniquePivotGroupName(baseName: string, field: PivotCustomGroupedField) {
    const groupNames = field.groups.map((g) => g.name);
    let newName = baseName;
    let i = 1;
    while (groupNames.includes(newName)) {
      newName = `${baseName}${i}`;
      i++;
    }
    return newName;
  }

  onCancel() {
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }
}
