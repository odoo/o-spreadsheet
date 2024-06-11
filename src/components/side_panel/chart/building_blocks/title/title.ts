import { Component, useExternalListener, useState } from "@odoo/owl";
import { GRAY_300 } from "../../../../../constants";
import { _t } from "../../../../../translation";
import {
  ChartTitleType,
  Color,
  SpreadsheetChildEnv,
  Title,
  TitleDesign,
} from "../../../../../types";
import { ColorPickerWidget } from "../../../../color_picker/color_picker_widget";
import { css } from "../../../../helpers";
import { SelectionInput } from "../../../../selection_input/selection_input";
import { Checkbox } from "../../../components/checkbox/checkbox";
import { Section } from "../../../components/section/section";

css/* scss */ `
  .o-input-custom {
    padding: 1px 0;
    input {
      /* Matches the styling of the selection input */
      height: 31px !important;
      margin-bottom: 5px;
    }
  }

  .o-chart-title-designer {
    > span {
      height: 30px;
    }

    .o-divider {
      border-right: 1px solid ${GRAY_300};
      margin: 0px 4px;
      height: 14px;
    }

    .o-menu-item-button.active {
      background-color: #e6f4ea;
      color: #188038;
    }

    .o-dropdown-content {
      overflow-y: auto;
      overflow-x: hidden;
      padding: 2px;
      z-index: 100;
      box-shadow: 1px 2px 5px 2px rgba(51, 51, 51, 0.15);

      .o-dropdown-line {
        > span {
          padding: 4px;
        }
      }
    }
  }
`;

interface Props {
  title: Title | undefined;
  updateTitle: (title: string, type: ChartTitleType) => void;
  name?: string;
  toggleItalic?: () => void;
  toggleBold?: () => void;
  updateAlignment?: (string) => void;
  updateColor?: (Color) => void;
  style: TitleDesign;
}

export interface ChartTitleState {
  activeTool: string;
  titleReference: string;
}

export class ChartTitle extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet.ChartTitle";
  static components = { Section, ColorPickerWidget, Checkbox, SelectionInput };
  static props = {
    title: { type: Object, optional: true },
    updateTitle: Function,
    name: { type: String, optional: true },
    toggleItalic: { type: Function, optional: true },
    toggleBold: { type: Function, optional: true },
    updateAlignment: { type: Function, optional: true },
    updateColor: { type: Function, optional: true },
    style: { type: Object, optional: true },
  };

  openedEl: HTMLElement | null = null;

  setup() {
    useExternalListener(window, "click", this.onExternalClick);
  }

  state: ChartTitleState = useState({
    activeTool: "",
    titleReference: this.props.title?.type === "reference" ? this.props.title.text : "",
  });

  get title(): string {
    return _t(this.props.title?.text || "");
  }

  get type(): ChartTitleType {
    return this.props.title?.type || "string";
  }

  updateTitle(ev: InputEvent) {
    this.props.updateTitle((ev.target as HTMLInputElement).value, "string");
  }

  toggleDropdownTool(tool: string, ev: MouseEvent) {
    const isOpen = this.state.activeTool === tool;
    this.closeMenus();
    this.state.activeTool = isOpen ? "" : tool;
    this.openedEl = isOpen ? null : (ev.target as HTMLElement);
  }

  /**
   * TODO: This is clearly not a goot way to handle external click, but
   * we currently have no other way to do it ... Should be done in
   * another task to handle the fact we want only one menu opened at a
   * time with something like a menuStore ?
   */
  onExternalClick(ev: MouseEvent) {
    if (this.openedEl === ev.target) {
      return;
    }
    this.closeMenus();
  }

  onColorPicked(color: Color) {
    this.props.updateColor?.(color);
    this.closeMenus();
  }

  updateAlignment(aligment: "left" | "center" | "right") {
    this.props.updateAlignment?.(aligment);
    this.closeMenus();
  }

  closeMenus() {
    this.state.activeTool = "";
    this.openedEl = null;
  }

  handleTitleReferenceChange(ranges: string[]) {
    this.state.titleReference = ranges[0];
  }

  updateTitleReference() {
    this.props.updateTitle(this.state.titleReference, "reference");
  }

  useReferenceAsTitle(value: boolean) {
    const titleType = value ? "reference" : "string";
    let title: string = this.state.titleReference;

    if (titleType === "string") {
      const sheetId = this.env.model.getters.getActiveSheetId();
      const range = this.env.model.getters.getRangeDataFromXc(sheetId, title);
      title = this.env.model.getters.getCellText({
        col: range._zone.left,
        row: range._zone.top,
        sheetId: range._sheetId,
      });
    }

    this.props.updateTitle(title, titleType);
  }
}
