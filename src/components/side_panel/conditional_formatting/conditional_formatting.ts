import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { localizeCFRule } from "../../../helpers/locale";
import type { ConditionalFormat, SpreadsheetChildEnv, UID, Zone } from "../../../types";
import { ConditionalFormattingEditor } from "./cf_editor/cf_editor";
import { ConditionalFormatPreviewList } from "./cf_preview_list/cf_preview_list";

interface Props {
  selection?: Zone[];
  onCloseSidePanel: () => void;
}

type Mode = "list" | "edit";

interface State {
  mode: Mode;
  editedCf?: ConditionalFormat;
}

export class ConditionalFormattingPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingPanel";
  static components = {
    ConditionalFormatPreviewList,
    ConditionalFormattingEditor,
  };

  private activeSheetId!: UID;
  private state = useState<State>({
    mode: "list",
  });

  setup() {
    this.activeSheetId = this.env.model.getters.getActiveSheetId();
    const sheetId = this.env.model.getters.getActiveSheetId();
    const rules = this.env.model.getters.getRulesSelection(sheetId, this.props.selection || []);
    if (rules.length === 1) {
      const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
      if (cf) {
        this.editConditionalFormat(cf);
      }
    }
    onWillUpdateProps((nextProps: Props) => {
      const newActiveSheetId = this.env.model.getters.getActiveSheetId();
      if (newActiveSheetId !== this.activeSheetId) {
        this.activeSheetId = newActiveSheetId;
        this.switchToList();
      } else if (nextProps.selection !== this.props.selection) {
        const sheetId = this.env.model.getters.getActiveSheetId();
        const rules = this.env.model.getters.getRulesSelection(sheetId, nextProps.selection || []);
        if (rules.length === 1) {
          const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
          if (cf) {
            this.editConditionalFormat(cf);
          }
        } else {
          this.switchToList();
        }
      }
    });
  }

  get conditionalFormats(): ConditionalFormat[] {
    const cfs = this.env.model.getters.getConditionalFormats(
      this.env.model.getters.getActiveSheetId()
    );
    return cfs.map((cf) => ({
      ...cf,
      rule: localizeCFRule(cf.rule, this.env.model.getters.getLocale()),
    }));
  }

  private switchToList() {
    this.state.mode = "list";
    this.state.editedCf = undefined;
  }

  addConditionalFormat() {
    this.state.mode = "edit";
  }

  editConditionalFormat(cf: ConditionalFormat) {
    this.state.mode = "edit";
    this.state.editedCf = cf;
  }
}

ConditionalFormattingPanel.props = {
  selection: { type: Object, optional: true },
  onCloseSidePanel: Function,
};
