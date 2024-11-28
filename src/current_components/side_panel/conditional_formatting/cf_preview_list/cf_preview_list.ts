import { Component, onWillUpdateProps, useRef } from "@odoo/owl";
import { deepEquals } from "../../../../helpers";
import { ConditionalFormat, SpreadsheetChildEnv, UID } from "../../../../types";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../../helpers/drag_and_drop_hook";
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
  static components = { ConditionalFormatPreview };

  icons = ICONS;

  private dragAndDrop = useDragAndDropListItems();
  private cfListRef = useRef("cfList");

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(this.props.conditionalFormats, nextProps.conditionalFormats)) {
        this.dragAndDrop.cancel();
      }
    });
  }

  getPreviewDivStyle(cf: ConditionalFormat): string {
    return this.dragAndDrop.itemsStyle[cf.id] || "";
  }

  onPreviewMouseDown(cf: ConditionalFormat, event: MouseEvent) {
    if (event.button !== 0) return;
    const previewRects = Array.from(this.cfListRef.el!.children).map((previewEl) =>
      getBoundingRectAsPOJO(previewEl)
    );
    const items = this.props.conditionalFormats.map((cf, index) => ({
      id: cf.id,
      size: previewRects[index].height,
      position: previewRects[index].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: cf.id,
      initialMousePosition: event.clientY,
      items: items,
      containerEl: this.cfListRef.el!,
      onDragEnd: (cfId: UID, finalIndex: number) => this.onDragEnd(cfId, finalIndex),
    });
  }

  private onDragEnd(cfId: UID, finalIndex: number) {
    const originalIndex = this.props.conditionalFormats.findIndex((sheet) => sheet.id === cfId);
    const delta = originalIndex - finalIndex;
    if (delta !== 0) {
      this.env.model.dispatch("CHANGE_CONDITIONAL_FORMAT_PRIORITY", {
        cfId,
        delta,
        sheetId: this.env.model.getters.getActiveSheetId(),
      });
    }
  }
}
