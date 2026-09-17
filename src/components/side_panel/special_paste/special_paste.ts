import { proxy, types, useProps } from "@odoo/owl";
import { paste } from "../../../actions/menu_items_actions";
import { Component } from "../../../owl3_compatibility_layer";
import { ClipboardPasteOptions } from "../../../types/clipboard";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Checkbox } from "../components/checkbox/checkbox";
import { Section } from "../components/section/section";

// "asValue" and "onlyFormula" are mutually exclusive: a cell can't be pasted both as a
// static value and as a live formula. "all" means the content is pasted normally.
type ContentOption = Extract<ClipboardPasteOptions, "asValue" | "onlyFormula">;

interface SpecialPasteState {
  contentOption: ContentOption | "all";
  // Independent from contentOption: e.g. "asValue" + format pastes the value together with
  // the source formatting, without the formula.
  format: boolean;
  transpose: boolean;
}

export class SpecialPastePanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-SpecialPastePanel";
  static components = { Section, Checkbox };
  protected props = useProps({
    onCloseSidePanel: types.function(),
  });

  state!: SpecialPasteState;

  setup() {
    this.state = proxy({ contentOption: "all", format: false, transpose: false });
  }

  isContentOptionChecked(option: ContentOption): boolean {
    return this.state.contentOption === option;
  }

  setContentOption(option: ContentOption, checked: boolean) {
    this.state.contentOption = checked ? option : "all";
  }

  setFormat(format: boolean) {
    this.state.format = format;
  }

  setTranspose(transpose: boolean) {
    this.state.transpose = transpose;
  }

  onCancel() {
    this.props.onCloseSidePanel();
  }

  async onConfirm() {
    const pasteOptions: ClipboardPasteOptions[] = [];
    if (this.state.contentOption !== "all") {
      pasteOptions.push(this.state.contentOption);
    }
    if (this.state.format) {
      pasteOptions.push("onlyFormat");
    }
    if (this.state.transpose) {
      pasteOptions.push("transpose");
    }
    await paste(this.env, pasteOptions);
    this.props.onCloseSidePanel();
  }
}
