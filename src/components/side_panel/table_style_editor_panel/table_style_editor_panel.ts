import { Component, useExternalListener, useState } from "@odoo/owl";
import { TABLE_STYLES_TEMPLATES, buildTableStyle } from "../../../helpers/table_presets";
import {
  Color,
  SpreadsheetChildEnv,
  TableConfig,
  TableStyle,
  TableStyleTemplateName,
} from "../../../types";
import { css, cssPropertiesToCss } from "../../helpers";
import { TableStylePreview } from "../../tables/table_style_preview/table_style_preview";
import { RoundColorPicker } from "../components/round_color_picker/round_color_picker";
import { Section } from "../components/section/section";

css/* scss */ `
  .o-table-style-editor-panel {
    .o-table-style-list-item {
      margin: 1px 3px;
      padding: 3px 6px;

      .o-table-style-edit-template-preview {
        width: 81px;
        height: 61px;
      }
    }

    .o-sidePanelButtons .o-delete:hover:enabled {
      color: #ffffff;
      background: #d94b4b;
    }
  }
`;

export interface TableStyleEditorPanelProps {
  onCloseSidePanel: () => void;
  styleId?: string;
  onStylePicked?: (styleId: string) => void;
}

interface State {
  pickerOpened: boolean;
  primaryColor: Color;
  selectedTemplateName: TableStyleTemplateName;
  styleName: string;
}

export class TableStyleEditorPanel extends Component<
  TableStyleEditorPanelProps,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-TableStyleEditorPanel";
  static components = { Section, RoundColorPicker, TableStylePreview };
  static props = {
    onCloseSidePanel: Function,
    onStylePicked: { type: Function, optional: true },
    styleId: { type: String, optional: true },
  };

  state = useState<State>(this.getInitialState());

  setup() {
    useExternalListener(window as any, "click", () => (this.state.pickerOpened = false));
  }

  getInitialState(): State {
    const editedStyle = this.props.styleId
      ? this.env.model.getters.getTableStyle(this.props.styleId)
      : null;
    return {
      pickerOpened: false,
      primaryColor: editedStyle?.primaryColor || "#3C78D8",
      selectedTemplateName: editedStyle?.templateName || "lightColoredText",
      styleName: editedStyle?.displayName || this.env.model.getters.getNewCustomTableStyleName(),
    };
  }

  togglePicker() {
    this.state.pickerOpened = !this.state.pickerOpened;
  }

  onColorPicked(color: Color) {
    this.state.primaryColor = color;
    this.state.pickerOpened = false;
  }

  onTemplatePicked(templateName: TableStyleTemplateName) {
    this.state.selectedTemplateName = templateName;
  }

  onConfirm() {
    const tableStyleId = this.props.styleId || this.env.model.uuidGenerator.uuidv4();
    this.env.model.dispatch("CREATE_TABLE_STYLE", {
      tableStyleId,
      tableStyleName: this.state.styleName,
      templateName: this.state.selectedTemplateName,
      primaryColor: this.state.primaryColor,
    });
    this.props.onStylePicked?.(tableStyleId);
    this.props.onCloseSidePanel();
  }

  onCancel() {
    this.props.onCloseSidePanel();
  }

  onDelete() {
    if (!this.props.styleId) {
      return;
    }
    this.env.model.dispatch("REMOVE_TABLE_STYLE", { tableStyleId: this.props.styleId });
    this.props.onCloseSidePanel();
  }

  get colorPreviewStyle() {
    return cssPropertiesToCss({ background: this.state.primaryColor });
  }

  get tableTemplates() {
    return Object.keys(TABLE_STYLES_TEMPLATES).filter((templateName) => templateName !== "none");
  }

  get previewTableConfig(): TableConfig {
    return {
      bandedColumns: false,
      bandedRows: true,
      firstColumn: false,
      lastColumn: false,
      numberOfHeaders: 1,
      totalRow: true,
      hasFilters: true,
      styleId: "",
    };
  }

  get selectedStyle() {
    return this.computeTableStyle(this.state.selectedTemplateName);
  }

  computeTableStyle(templateName: TableStyleTemplateName): TableStyle {
    return buildTableStyle(this.state.styleName, templateName, this.state.primaryColor);
  }
}
