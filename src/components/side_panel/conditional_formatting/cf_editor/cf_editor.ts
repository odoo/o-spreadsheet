import { Component, useEffect, useExternalListener } from "@odoo/owl";
import { deepCopy } from "../../../../helpers/misc";
import { useLocalStore } from "../../../../store_engine/store_hooks";
import { _t } from "../../../../translation";
import { ConditionalFormat } from "../../../../types/conditional_formatting";
import { UID } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Store } from "../../../../types/store_engine";
import { SelectionInput } from "../../../selection_input/selection_input";
import { ValidationMessages } from "../../../validation_messages/validation_messages";
import { BadgeSelection } from "../../components/badge_selection/badge_selection";
import { Section } from "../../components/section/section";
import { CellIsRuleEditor } from "./cell_is_rule_editor";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";
import { ColorScaleRuleEditor } from "./color_scale_rule_editor";
import { DataBarRuleEditor } from "./data_bar_rule_editor";
import { IconSetRuleEditor } from "./icon_set_rule_editor";

interface Props {
  cf: ConditionalFormat;
  isNewCf: boolean;
  onCloseSidePanel: () => void;
  sheetId: UID;
}

export class ConditionalFormattingEditor extends Component<Props, SpreadsheetChildEnv> {
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
  static props = { cf: Object, isNewCf: Boolean, onCloseSidePanel: Function, sheetId: String };

  private store!: Store<ConditionalFormattingEditorStore>;

  setup() {
    this.store = useLocalStore(
      ConditionalFormattingEditorStore,
      deepCopy(this.props.cf),
      this.props.isNewCf,
      this.props.sheetId
    );
    useEffect(
      (isCfRemoved) => {
        if (isCfRemoved) {
          this.closeSidePanel();
        }
      },
      () => [this.isEditedCfRemoved]
    );
    useExternalListener(window as any, "click", () => this.store.closeMenus());
  }

  get isEditedCfRemoved() {
    return !Boolean(
      this.env.model.getters
        .getConditionalFormats(this.props.sheetId)
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

  get rangeTitle(): string {
    if (this.env.model.getters.getActiveSheetId() !== this.props.sheetId) {
      return _t(
        "Apply to ranges: (on %s)",
        this.env.model.getters.getSheetName(this.props.sheetId)
      );
    }
    return _t("Apply to ranges:");
  }

  onSave() {
    this.store.updateConditionalFormat({});
    const isSuccessful = this.store.state.errors.length === 0;
    if (isSuccessful) {
      this.closeSidePanel();
    }
  }

  onCancel() {
    if (this.store.state.hasEditedCf) {
      if (this.props.isNewCf) {
        this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
          sheetId: this.props.sheetId,
          id: this.props.cf.id,
        });
      } else {
        this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
          cf: this.props.cf,
          ranges: this.props.cf.ranges.map((range) =>
            this.env.model.getters.getRangeDataFromXc(this.props.sheetId, range)
          ),
          sheetId: this.props.sheetId,
        });
      }
    }
    this.closeSidePanel();
  }

  closeSidePanel() {
    this.env.model.dispatch("ACTIVATE_SHEET", {
      sheetIdTo: this.props.sheetId,
      sheetIdFrom: this.env.model.getters.getActiveSheetId(),
    });
    this.env.replaceSidePanel(
      "ConditionalFormatting",
      `ConditionalFormattingEditor_${this.props.cf.id}`
    );
  }
}
