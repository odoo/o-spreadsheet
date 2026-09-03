import { useProps } from "@odoo/owl";
import { colorNumberToHex } from "../../../../helpers/color";
import { OSComponent } from "../../../os_component";
import { types } from "../../../props_validation";
import { SelectionInput } from "../../../selection_input/selection_input";
import { RoundColorPicker } from "../../components/round_color_picker/round_color_picker";
import { ConditionalFormattingEditorStore } from "./cf_editor_store";

export class DataBarRuleEditor extends OSComponent {
  static template = "o-spreadsheet-DataBarRuleEditor";
  static components = {
    SelectionInput,
    RoundColorPicker,
  };
  protected props = useProps({
    store: types.Store<ConditionalFormattingEditorStore>(),
  });

  get rule() {
    return this.props.store.state.rules.dataBar;
  }

  colorNumberToHex = colorNumberToHex;
}
