import { _t } from "@odoo/o-spreadsheet-engine/translation";
import * as ACTION_DATA from "../../actions/data_actions";
import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
import { ToolBarRegistry } from "../../registries/toolbar_menu_registry";
import { ActionButton } from "../action_button/action_button";
import { BorderEditorWidget } from "../border_editor/border_editor_widget";
import { PaintFormatButton } from "../paint_format_button/paint_format_button";
import { TableDropdownButton } from "../tables/table_dropdown_button/table_dropdown_button";
import { TopBarColorEditor } from "./color_editor/color_editor";
import { DropdownAction } from "./dropdown_action/dropdown_action";
import { TopBarFontSizeEditor } from "./font_size_editor/font_size_editor";
import { NumberFormatsTool } from "./number_formats_tool/number_formats_tool";

export const topBarToolBarRegistry = new ToolBarRegistry();

topBarToolBarRegistry
  .add("edit")
  .addChild("edit", {
    component: ActionButton,
    props: {
      action: ACTION_EDIT.undo,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("edit", {
    component: ActionButton,
    props: {
      action: ACTION_EDIT.redo,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("edit", {
    component: PaintFormatButton,
    props: {
      class: "o-hoverable-button o-toolbar-button o-mobile-disabled",
    },
    sequence: 3,
  })
  .addChild("edit", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.clearFormat,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 4,
  })

  .add("numberFormat")
  .addChild("numberFormat", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatPercent,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("numberFormat", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.decreaseDecimalPlaces,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("numberFormat", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.increaseDecimalPlaces,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("numberFormat", {
    component: NumberFormatsTool,
    props: {
      class: "o-menu-item-button o-hoverable-button o-toolbar-button",
    },
    sequence: 4,
  })
  .add("fontSize")
  .addChild("fontSize", {
    component: TopBarFontSizeEditor,
    props: {
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .add("textStyle")
  .addChild("textStyle", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatBold,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("textStyle", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatItalic,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("textStyle", {
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatStrikethrough,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("textStyle", {
    component: TopBarColorEditor,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      style: "textColor",
      icon: "o-spreadsheet-Icon.TEXT_COLOR",
      title: _t("Text Color"),
    },
    sequence: 4,
  })
  .add("cellStyle")
  .addChild("cellStyle", {
    component: TopBarColorEditor,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      style: "fillColor",
      icon: "o-spreadsheet-Icon.FILL_COLOR",
      title: _t("Fill Color"),
    },
    sequence: 1,
  })
  .addChild("cellStyle", {
    component: BorderEditorWidget,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("cellStyle", {
    component: ActionButton,
    props: {
      action: ACTION_EDIT.mergeCells,
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 3,
  })
  .add("alignment")
  .addChild("alignment", {
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatAlignmentHorizontal,
      childActions: [
        ACTION_FORMAT.formatAlignmentLeft,
        ACTION_FORMAT.formatAlignmentCenter,
        ACTION_FORMAT.formatAlignmentRight,
      ],
      class: "o-hoverable-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 1,
  })
  .addChild("alignment", {
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatAlignmentVertical,
      childActions: [
        ACTION_FORMAT.formatAlignmentTop,
        ACTION_FORMAT.formatAlignmentMiddle,
        ACTION_FORMAT.formatAlignmentBottom,
      ],
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 2,
  })
  .addChild("alignment", {
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatWrapping,
      childActions: [
        ACTION_FORMAT.formatWrappingOverflow,
        ACTION_FORMAT.formatWrappingWrap,
        ACTION_FORMAT.formatWrappingClip,
      ],
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 3,
  })
  .add("misc")
  .addChild("misc", {
    component: TableDropdownButton,
    props: { class: "o-toolbar-button o-hoverable-button o-menu-item-button o-mobile-disabled" },
    sequence: 1,
  })
  .addChild("misc", {
    component: ActionButton,
    props: {
      action: ACTION_DATA.createRemoveFilterTool,
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 2,
  });
