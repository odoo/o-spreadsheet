import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { deepCopy, deepEquals } from "../../../../helpers";
import {
  getUniquePivotFieldName,
  getUniquePivotGroupName,
  updatePivotDefinitionForCustomFieldNameChange,
} from "../../../../helpers/pivot/pivot_helpers";
import { pivotRegistry } from "../../../../helpers/pivot/pivot_registry";
import { pivotComponentsRegistry } from "../../../../helpers/pivot/pivot_side_panel_registry";
import { _t } from "../../../../translation";
import {
  CellValue,
  PivotCustomGroup,
  PivotCustomGroupedField,
  PivotField,
  SpreadsheetChildEnv,
  UID,
  ValueAndLabel,
} from "../../../../types";
import { TextInput } from "../../../text_input/text_input";
import { AutocompletePopover } from "../../autocomplete_popover/autocomplete_popover";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";

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
  static components = { Section, TextInput, AutocompletePopover, Checkbox };

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

  get possibleFields(): ValueAndLabel[] {
    return Object.values(this.pivot.getFields())
      .filter(this.canFieldHaveCustomGroup.bind(this))
      .map((field) => ({
        value: field.name,
        label: field.string || field.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get pivot() {
    return this.env.model.getters.getPivot(this.props.pivotId);
  }

  get GroupEditorComponent() {
    return pivotComponentsRegistry.get(this.pivot.type).fieldGroupEditor;
  }

  get parentField() {
    return this.state.customField.parentField;
  }

  get groups() {
    return (this.customField?.groups || []).sort((a, b) => {
      if (!a.isOtherGroup && !b.isOtherGroup) {
        return 0;
      }
      return a.isOtherGroup ? 1 : -1;
    });
  }

  get customField() {
    return this.state.customField;
  }

  get hasOthersGroup() {
    return this.customField.groups.some((group) => group.isOtherGroup);
  }

  updateCustomFieldName(newName: string) {
    if (this.state.customField.name === newName) {
      return;
    }
    const fields = this.pivot.getFields();
    this.state.customField.name = getUniquePivotFieldName(newName, fields);
  }

  onUpdateGroupName(groupIndex: number, newName: string) {
    const group = this.state.customField.groups[groupIndex];
    const newGroup: PivotCustomGroup = {
      ...group,
      name: getUniquePivotGroupName(newName, this.state.customField),
    };
    this.updateGroup(group, newGroup);
  }

  onUpdateGroupValues(groupIndex: number, values: ValueAndLabel<CellValue>[]) {
    const group = this.state.customField.groups[groupIndex];
    const newGroup: PivotCustomGroup = { ...group, values: values.map((v) => v.value) };
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

  onDeleteGroup(groupIndex: number) {
    this.state.customField.groups.splice(groupIndex, 1);
  }

  onSave() {
    // ADRM TODO: also add the field to the pivot dimension
    let definition = deepCopy(this.env.model.getters.getPivotCoreDefinition(this.props.pivotId));
    const oldName = Object.keys(definition.customFields || {}).find(
      (name) => definition.customFields?.[name].parentField === this.state.customField.parentField
    );
    const newName = this.state.customField.name;
    if (oldName && oldName !== newName) {
      definition = updatePivotDefinitionForCustomFieldNameChange(definition, oldName, newName);
    }
    console.log(definition);
    this.state.customField.groups = this.state.customField.groups.filter(
      (group) => group.values.length > 0 || group.isOtherGroup
    );
    if (!definition.customFields) {
      definition.customFields = {};
    }
    definition.customFields[this.state.customField.name] = this.state.customField;
    this.env.model.dispatch("UPDATE_PIVOT", {
      pivotId: this.props.pivotId,
      pivot: definition,
    });
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }

  canFieldHaveCustomGroup(field: PivotField | undefined): field is PivotField {
    return !!field && pivotRegistry.get(this.pivot.type).canHaveCustomGroup(field);
  }

  onUpdateParentField(fieldName: string) {
    const definition = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    const fields = this.pivot.getFields();
    const parentField = fields[fieldName];
    if (!parentField) {
      return;
    }

    const customField = Object.values(definition.customFields || {}).find(
      (customField) => customField.parentField === fieldName
    );
    if (customField) {
      this.state.customField = customField;
    } else {
      this.state.customField = {
        parentField: parentField.name,
        groups: [],
        name: getUniquePivotFieldName(parentField.string, fields),
      };
    }
  }

  addNewGroup() {
    const newGroup: PivotCustomGroup = {
      name: getUniquePivotGroupName(_t("Group"), this.state.customField),
      values: [],
    };
    this.updateGroup(undefined, newGroup);
  }

  toggleOthersGroup() {
    if (!this.hasOthersGroup) {
      const newGroup: PivotCustomGroup = {
        name: getUniquePivotGroupName(_t("Others"), this.state.customField),
        values: [],
        isOtherGroup: true,
      };
      this.updateGroup(undefined, newGroup);
    } else {
      const othersGroupIndex = this.state.customField.groups.findIndex(
        (group) => group.isOtherGroup
      );
      if (othersGroupIndex !== -1) {
        this.onDeleteGroup(othersGroupIndex);
      }
    }
  }

  onCancel() {
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }

  getUsedValuesInOtherGroups(groupIndex: number): CellValue[] {
    const usedValues: CellValue[] = [];
    this.state.customField.groups.forEach((group, index) => {
      if (index !== groupIndex) {
        usedValues.push(...group.values);
      }
    });
    return usedValues;
  }

  onDelete() {
    const definition = this.env.model.getters.getPivotCoreDefinition(this.props.pivotId);
    const customFields = { ...definition.customFields };
    const oldCustomFieldName = Object.keys(customFields).find(
      (name) => customFields[name].parentField === this.state.customField.parentField
    );
    if (oldCustomFieldName) {
      delete customFields[oldCustomFieldName];
      this.env.model.dispatch("UPDATE_PIVOT", {
        pivotId: this.props.pivotId,
        pivot: { ...definition, customFields },
      });
    }
    this.env.openSidePanel("PivotSidePanel", { pivotId: this.props.pivotId });
  }
}
