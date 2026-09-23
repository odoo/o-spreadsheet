import { useListener, useProps } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/misc";
import { splitReference } from "../../../../helpers/references";
import { useLayoutEffect } from "../../../../owl3_compatibility_layer";
import { useLocalStore, useStore } from "../../../../store_engine/store_hooks";
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
import { ConditionalFormattingEditorStore } from "./cf_editor_store";
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

  private store!: Store<ConditionalFormattingEditorStore>;
  private sidePanelStore!: Store<SidePanelStore>;

  setup() {
    this.store = useLocalStore(
      ConditionalFormattingEditorStore,
      deepCopy(this.props.cf),
      this.props.isNewCf,
      this.props.sheetId
    );
    this.sidePanelStore = useStore(SidePanelStore);
    useLayoutEffect(
      (isCfRemoved) => {
        if (isCfRemoved) {
          this.closeEditor();
        }
      },
      () => [this.store.isEditedCfRemoved]
    );
    useListener(window as any, "click", () => this.store.closeMenus());
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
    this.store.updateConditionalFormat({});
    const isSuccessful = this.store.state.errors.length === 0;
    if (isSuccessful) {
      this.closeEditor(this.store.switchBackOnSave);
    }
  }

  onCancel() {
    if (this.store.state.hasEditedCf) {
      const sheetIdsToRemove = [
        ...new Set(
          this.store.state.currentCF.ranges.map((xc) => {
            const { sheetName } = splitReference(xc);
            const sheetId = sheetName
              ? this.env.model.getters.getSheetIdByName(sheetName)
              : this.props.sheetId;
            return this.env.model.getters.getRangeDataFromXc(sheetId, xc)._sheetId;
          })
        ),
      ];
      if (this.props.isNewCf) {
        this.env.model.dispatch("UPDATE_CONDITIONAL_FORMATS", {
          cfId: this.store.state.currentCF.id,
          sheetIdsToRemove,
        });
      } else {
        this.env.model.dispatch("UPDATE_CONDITIONAL_FORMATS", {
          cfId: this.store.state.currentCF.id,
          sheetIdsToRemove: sheetIdsToRemove.filter((id) => id !== this.props.sheetId),
          rulesBySheetId: {
            [this.props.sheetId]: {
              cf: this.props.cf,
              ranges: this.props.cf.ranges.map((xc) =>
                this.env.model.getters.getRangeDataFromXc(this.props.sheetId, xc)
              ),
            },
          },
        });
      }
    }
    this.closeEditor();
  }

  closeEditor(switchBack: boolean = true) {
    if (switchBack) {
      this.env.model.dispatch("ACTIVATE_SHEET", {
        sheetIdTo: this.props.sheetId,
        sheetIdFrom: this.env.model.getters.getActiveSheetId(),
      });
    }
    this.sidePanelStore.replace(
      "ConditionalFormatting",
      `ConditionalFormattingEditor_${this.props.cf.id}`
    );
  }
}
