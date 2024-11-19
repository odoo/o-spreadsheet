import { Component } from "@odoo/owl";
import { ConditionalFormat, SpreadsheetChildEnv, UID } from "../../../../types";
import { DragAndDropListItems } from "../../../drag_and_drop_list/drag_and_drop_list";
import { ICONS } from "../../../icons/icons";
import { ConditionalFormatPreview } from "../cf_preview/cf_preview";

interface Props {
  conditionalFormats: ConditionalFormat[];
  onPreviewClick: (cf: ConditionalFormat) => void;
  onAddConditionalFormat: () => void;
}

export class ConditionalFormatPreviewList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreviewList";
  static props = {
    conditionalFormats: Array,
    onPreviewClick: Function,
    onAddConditionalFormat: Function,
  };
  static components = { ConditionalFormatPreview, DragAndDropListItems };

  icons = ICONS;

  onDragEnd(cfId: UID, originalIndex: number, finalIndex: number) {
    const delta = originalIndex - finalIndex;
    this.env.model.dispatch("CHANGE_CONDITIONAL_FORMAT_PRIORITY", {
      cfId,
      delta,
      sheetId: this.env.model.getters.getActiveSheetId(),
    });
  }
}
