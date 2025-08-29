import { Component, useRef } from "@odoo/owl";
import { localizeCFRule } from "../../../../helpers/locale";
import { ConditionalFormat, SpreadsheetChildEnv, UID } from "../../../../types";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../../helpers/drag_and_drop_dom_items_hook";
import { ICONS } from "../../../icons/icons";
import { ConditionalFormatPreview } from "./cf_preview/cf_preview";

export class ConditionalFormatPreviewPanel extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreviewPanel";
  static components = { ConditionalFormatPreview };

  icons = ICONS;

  private activeSheetId!: UID;
  private dragAndDrop = useDragAndDropListItems();
  private cfListRef = useRef("cfPanel");

  setup() {
    this.activeSheetId = this.env.model.getters.getActiveSheetId();
  }

  getPreviewDivStyle(cf: ConditionalFormat): string {
    return this.dragAndDrop.itemsStyle[cf.id] || "";
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

  onPreviewMouseDown(cf: ConditionalFormat, event: MouseEvent) {
    if (event.button !== 0) return;
    const previewRects = Array.from(this.cfListRef.el!.children).map((previewEl) =>
      getBoundingRectAsPOJO(previewEl)
    );
    const items = this.conditionalFormats.map((cf, index) => ({
      id: cf.id,
      size: previewRects[index].height,
      position: previewRects[index].y,
    }));
    this.dragAndDrop.start("vertical", {
      draggedItemId: cf.id,
      initialMousePosition: event.clientY,
      items: items,
      scrollableContainerEl: this.cfListRef.el!,
      onDragEnd: (cfId: UID, finalIndex: number) => this.onDragEnd(cfId, finalIndex),
    });
  }

  onPreviewClick(cf: ConditionalFormat) {
    this.env.replaceSidePanel("ConditionalFormatEditorPanel", "ConditionalFormatPreviewPanel", {
      cfId: cf.id,
    });
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
    this.env.replaceSidePanel("ConditionalFormatEditorPanel", "ConditionalFormatPreviewPanel", {
      cfId,
    });
  }

  private onDragEnd(cfId: UID, finalIndex: number) {
    const originalIndex = this.conditionalFormats.findIndex((sheet) => sheet.id === cfId);
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
