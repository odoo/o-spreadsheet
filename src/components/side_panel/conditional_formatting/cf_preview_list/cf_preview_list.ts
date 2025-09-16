import { localizeCFRule } from "@odoo/o-spreadsheet-engine/helpers/locale";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef } from "@odoo/owl";
import { zoneToXc } from "../../../../helpers";
import { ConditionalFormat, UID } from "../../../../types";
import { getBoundingRectAsPOJO } from "../../../helpers/dom_helpers";
import { useDragAndDropListItems } from "../../../helpers/drag_and_drop_dom_items_hook";
import { ConditionalFormatPreview } from "../cf_preview/cf_preview";

interface Props {
  onCloseSidePanel: () => void;
}

export class ConditionalFormatPreviewList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ConditionalFormatPreviewList";
  static props = {
    onCloseSidePanel: Function,
  };
  static components = { ConditionalFormatPreview };

  private dragAndDrop = useDragAndDropListItems();
  private cfListRef = useRef("cfList");

  get conditionalFormats(): ConditionalFormat[] {
    const cfs = this.env.model.getters.getConditionalFormats(
      this.env.model.getters.getActiveSheetId()
    );
    return cfs.map((cf) => ({
      ...cf,
      rule: localizeCFRule(cf.rule, this.env.model.getters.getLocale()),
    }));
  }

  getPreviewDivStyle(cf: ConditionalFormat): string {
    return this.dragAndDrop.itemsStyle[cf.id] || "";
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

  onAddConditionalFormat() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const zones = this.env.model.getters.getSelectedZones();
    const cf: Omit<ConditionalFormat, "ranges"> = {
      id: this.env.model.uuidGenerator.smallUuid(),
      rule: {
        type: "CellIsRule",
        operator: "isNotEmpty",
        style: { fillColor: "#b6d7a8" },
        values: [],
      },
    };
    this.env.model.dispatch("ADD_CONDITIONAL_FORMAT", {
      cf,
      ranges: zones.map((zone) => this.env.model.getters.getRangeDataFromZone(sheetId, zone)),
      sheetId,
    });
    return this.env.replaceSidePanel("ConditionalFormattingEditor", "ConditionalFormatting", {
      cf: {
        ...cf,
        ranges: zones.map((zone) =>
          zoneToXc(this.env.model.getters.getUnboundedZone(sheetId, zone))
        ),
      },
      isNewCf: true,
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
