import { useListener, useOnChange, useProps } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/misc";
import { provideAndUsePlugin } from "../../../../helpers/owl3_helpers";
import { useStore } from "../../../../store_engine/store_hooks";
import { _t } from "../../../../translation";
import { UID } from "../../../../types/misc";
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
  });

  private activeSheetId!: UID;
  private cfEditorPlugin = provideAndUsePlugin(ConditionalFormattingEditorPlugin, {
    cf: deepCopy(this.props.cf),
    isNewCf: this.props.isNewCf,
  });
  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.activeSheetId = this.model().getters.getActiveSheetId();
    this.sidePanelStore = useStore(SidePanelStore);
    useOnChange(
      () => [this.model().getters.getActiveSheetId(), this.isEditedCfRemoved],
      (sheetId, isCfRemoved) => {
        if (this.activeSheetId !== sheetId || isCfRemoved) {
          this.sidePanelStore.replace(
            "ConditionalFormatting",
            `ConditionalFormattingEditor_${this.props.cf.id}`
          );
        }
      }
    );
    useListener(window as any, "click", () => this.cfEditorPlugin.closeMenus());
  }

  get isEditedCfRemoved() {
    return !Boolean(
      this.model()
        .getters.getConditionalFormats(this.activeSheetId)
        .find((cf) => cf.id === this.props.cf.id)
    );
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
      this.sidePanelStore.replace(
        "ConditionalFormatting",
        `ConditionalFormattingEditor_${this.props.cf.id}`
      );
    }
  }

  onCancel() {
    if (this.cfEditorPlugin.state.hasEditedCf) {
      if (this.props.isNewCf) {
        this.model().dispatch("REMOVE_CONDITIONAL_FORMAT", {
          sheetId: this.activeSheetId,
          id: this.props.cf.id,
        });
      } else {
        this.model().dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: this.props.cf,
          ranges: this.props.cf.ranges.map((range) =>
            this.model().getters.getRangeDataFromXc(this.activeSheetId, range)
          ),
          sheetId: this.activeSheetId,
        });
      }
    }
    this.sidePanelStore.replace(
      "ConditionalFormatting",
      `ConditionalFormattingEditor_${this.props.cf.id}`
    );
  }
}
