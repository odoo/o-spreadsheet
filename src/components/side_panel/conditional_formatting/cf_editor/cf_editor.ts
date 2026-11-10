import { useListener, useOnChange, useProps } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/misc";
import { provideAndUsePlugin } from "../../../../helpers/owl3_helpers";
import { getSheetIds } from "../../../../helpers/range";
import { useStore } from "../../../../store_engine/store_hooks";
import { _t } from "../../../../translation";
import { Store } from "../../../../types/store_engine";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { Section } from "../../components/section/section";
import { SidePanelStore } from "../../side_panel/side_panel_store";
import { CellIsRuleEditor } from "./cell_is_rule_editor";
import { ConditionalFormattingEditorPlugin } from "./cf_editor_owl_plugin";
import { ColorScaleRuleEditor } from "./color_scale_rule_editor";
import { DataBarRuleEditor } from "./data_bar_rule_editor";
import { IconSetRuleEditor } from "./icon_set_rule_editor";

export class ConditionalFormattingEditor extends OSComponent {
  static template = "o-spreadsheet-ConditionalFormattingEditor";
  static components = {
    SelectionInput,
    Section,
    BadgeSelection,
    ValidationMessages,
    CellIsRuleEditor,
    ColorScaleRuleEditor,
    IconSetRuleEditor,
    DataBarRuleEditor,
  };
  protected props = useProps({
    cf: types.ConditionalFormat(),
    isNewCf: types.boolean(),
    onCloseSidePanel: types.function(),
    sheetId: types.UID(),
  });

  private cfEditorPlugin = provideAndUsePlugin(ConditionalFormattingEditorPlugin, {
    cf: deepCopy(this.props.cf),
    isNewCf: this.props.isNewCf,
    sheetId: this.props.sheetId,
  });
  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.sidePanelStore = useStore(SidePanelStore);
    useOnChange(
      () => [this.cfEditorPlugin.isEditedCfRemoved],
      (isCfRemoved) => {
        if (isCfRemoved) {
          this.closeEditor();
        }
      }
    );
    useListener(window as any, "click", () => this.cfEditorPlugin.closeMenus());
  }

  get cfTypesValues() {
    return [
      { value: "CellIsRule", label: _t("Single color") },
      { value: "ColorScaleRule", label: _t("Color scale") },
      { value: "IconSetRule", label: _t("Icon set") },
      { value: "DataBarRule", label: _t("Data bar") },
    ];
  }

  onSave() {
    this.cfEditorPlugin.updateConditionalFormat({});
    const isSuccessful = this.cfEditorPlugin.state.errors.length === 0;
    if (isSuccessful) {
      this.closeEditor();
    }
  }

  onCancel() {
    if (this.cfEditorPlugin.state.hasEditedCf) {
      const sheetIdsToRemove = getSheetIds(
        this.model().getters,
        this.cfEditorPlugin.state.currentCF.ranges,
        this.props.sheetId
      );
      if (this.props.isNewCf) {
        this.model().dispatch("UPDATE_CONDITIONAL_FORMATS", {
          cfId: this.cfEditorPlugin.state.currentCF.id,
          sheetIdsToRemove,
        });
      } else {
        this.model().dispatch("UPDATE_CONDITIONAL_FORMATS", {
          cfId: this.cfEditorPlugin.state.currentCF.id,
          sheetIdsToRemove: sheetIdsToRemove.filter((id) => id !== this.props.sheetId),
          rulesBySheetId: {
            [this.props.sheetId]: {
              cf: this.props.cf,
              ranges: this.props.cf.ranges.map((xc) =>
                this.model().getters.getRangeDataFromXc(this.props.sheetId, xc)
              ),
            },
          },
        });
      }
    }
    this.closeEditor();
  }

  closeEditor() {
    this.sidePanelStore.replace(
      "ConditionalFormatting",
      `ConditionalFormattingEditor_${this.props.cf.id}`
    );
  }
}
