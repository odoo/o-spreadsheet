import { localizeCFRule } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { ConditionalFormat, UID, Zone } from "../../../types";
import { Section } from "../components/section/section";
import { ConditionalFormattingEditor } from "./cf_editor/cf_editor";
import { ConditionalFormatPreviewList } from "./cf_preview_list/cf_preview_list";

interface Props {
  selection?: Zone[];
  onCloseSidePanel: () => void;
}

type Mode = "list" | "edit";

interface State {
  mode: Mode;
  editedCfId?: UID;
}

export class ConditionalFormattingPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormattingPanel";
  static props = {
    selection: { type: Object, optional: true },
    onCloseSidePanel: Function,
  };
  static components = {
    ConditionalFormatPreviewList,
    ConditionalFormattingEditor,
    Section,
  };

  private activeSheetId!: UID;
  private originalEditedCf: ConditionalFormat | undefined = undefined;
  private state = useState<State>({
    mode: "list",
  });

  setup() {
    this.activeSheetId = this.env.model.getters.getActiveSheetId();
    const sheetId = this.activeSheetId;
    const rules = this.env.model.getters.getRulesSelection(sheetId, this.props.selection || []);
    if (rules.length === 1) {
      const cf = this.conditionalFormats.find((c) => c.id === rules[0]);
      if (cf) {
        this.editConditionalFormat(cf);
      }
    }
    onWillUpdateProps((nextProps: Props) => {
      if (this.state.mode === "list") {
        this.activeSheetId = this.env.model.getters.getActiveSheetId();
      }
      if (nextProps.selection !== this.props.selection) {
        const rules = this.env.model.getters.getRulesSelection(
          this.activeSheetId,
          nextProps.selection || []
        );
        const cf =
          rules.length === 1 ? this.conditionalFormats.find((c) => c.id === rules[0]) : undefined;
        if (cf) {
          this.editConditionalFormat(cf);
        } else {
          this.switchToList();
        }
      } else if (!this.editedCF) {
        this.switchToList();
      }
    });
  }

  get conditionalFormats(): ConditionalFormat[] {
    const cfs = this.env.model.getters.getConditionalFormats(this.activeSheetId);
    return cfs.map((cf) => ({
      ...cf,
      rule: localizeCFRule(cf.rule, this.env.model.getters.getLocale()),
    }));
  }

  private switchToList() {
    this.activeSheetId = this.env.model.getters.getActiveSheetId();
    this.state.mode = "list";
    this.state.editedCfId = undefined;
    this.originalEditedCf = undefined;
  }

  addConditionalFormat() {
    const cfId = this.env.model.uuidGenerator.smallUuid();
    this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      sheetId: this.activeSheetId,
      ranges: this.env.model.getters
        .getSelectedZones()
        .map((zone) => this.env.model.getters.getRangeDataFromZone(this.activeSheetId, zone)),
      cf: {
        id: cfId,
        rule: {
          type: "CellIsRule",
          operator: "isNotEmpty",
          style: { fillColor: "#b6d7a8" },
          values: [],
        },
      },
    });
    this.state.editedCfId = cfId;
    this.state.mode = "edit";
    this.originalEditedCf = undefined;
  }

  editConditionalFormat(cf: ConditionalFormat) {
    this.state.mode = "edit";
    this.state.editedCfId = cf.id;
    this.originalEditedCf = cf;
  }

  cancelEdition() {
    if (this.originalEditedCf) {
      this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
        sheetId: this.activeSheetId,
        ranges: this.originalEditedCf.ranges.map((range) =>
          this.env.model.getters.getRangeDataFromXc(this.activeSheetId, range)
        ),
        cf: this.originalEditedCf,
      });
    } else if (this.state.editedCfId) {
      this.env.model.dispatch("REMOVE_CONDITIONAL_FORMAT", {
        sheetId: this.activeSheetId,
        id: this.state.editedCfId,
      });
    }
    this.switchToList();
  }

  get editedCF() {
    return this.conditionalFormats.find((cf) => cf.id === this.state.editedCfId);
  }
}
