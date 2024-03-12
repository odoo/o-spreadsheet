import { Component, useExternalListener, useState } from "@odoo/owl";
import {
  TABLE_STYLES_TEMPLATES,
  TableStyleTemplate,
  generateTableColorSet,
} from "../../../helpers/table_presets";
import { Color, SpreadsheetChildEnv, TableConfig, TableStyle } from "../../../types";
import { ColorPickerWidget } from "../../color_picker/color_picker_widget";
import { css, cssPropertiesToCss } from "../../helpers";
import { TableStylePreview } from "../../tables/table_style_preview/table_style_preview";
import { Section } from "../components/section/section";

css/* scss */ `
  .o-table-style-editor-panel {
    .o-color-preview {
      width: 30px;
      height: 15px;
      margin-left: 2px;
      outline: 1px solid #3d85c6;
      outline-offset: 1px;
      margin-right: 10px;

      cursor: pointer;
    }

    .o-table-style-edit-grid {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-items: center;
      align-items: space-between;
    }

    .o-table-style-list-item {
      margin: 1px 3px;
      padding: 4px 7px;

      &.selected {
        padding: 3px 6px;
      }

      .o-table-style-edit-template-preview {
        width: 81px;
        height: 61px;
      }

      .o-table-style-edit-template-name {
        display: none;
        // color: #696969
      }
    }
  }
`;

interface Props {
  onCloseSidePanel: () => void;
  onConfirm?: () => void;
}

interface State {
  pickerOpened: boolean;
  primaryColor: Color;
  selectedTemplate: TableStyleTemplate;
  styleName: string;
}

export class TableStyleEditorPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-TableStyleEditorPanel";
  static components = { Section, ColorPickerWidget, TableStylePreview };
  static props = {
    onCloseSidePanel: Function,
    onConfirm: { type: Function, optional: true },
  };

  state = useState<State>({
    pickerOpened: false,
    primaryColor: "#f00",
    selectedTemplate: TABLE_STYLES_TEMPLATES[0],
    styleName: this.env.model.getters.getNewCustomTableStyleName(),
  });

  setup() {
    useExternalListener(window as any, "click", () => (this.state.pickerOpened = false));
  }

  togglePicker() {
    this.state.pickerOpened = !this.state.pickerOpened;
  }

  onColorPicked(color: Color) {
    this.state.primaryColor = color;
    this.state.pickerOpened = false;
  }

  onTemplatePicked(template: TableStyleTemplate) {
    this.state.selectedTemplate = template;
  }

  onUpdateName(ev: InputEvent) {
    const name = (ev.target as HTMLInputElement).value;
    this.state.styleName = name;
  }

  get colorPreviewStyle() {
    return cssPropertiesToCss({ background: this.state.primaryColor });
  }

  get tableTemplates() {
    return TABLE_STYLES_TEMPLATES;
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
    return this.computeTableStyle(this.state.selectedTemplate);
  }

  computeTableStyle(template: TableStyleTemplate): TableStyle {
    const colorSet = generateTableColorSet("", this.state.primaryColor);
    return template(colorSet);
  }
}
