import { _t } from "@odoo/o-spreadsheet-engine/translation";
import * as ACTION_DATA from "../../actions/data_actions";
import * as ACTION_EDIT from "../../actions/edit_actions";
import * as ACTION_FORMAT from "../../actions/format_actions";
import * as ACTION_INSERT from "../../actions/insert_actions";
import { formatNumberMenuItemSpec } from "../../registries/menus";
import { ToolBarRegistry } from "../../registries/toolbar_menu_registry";
import { ActionButton } from "../action_button/action_button";
import { BorderEditorWidget } from "../border_editor/border_editor_widget";
import { PaintFormatButton } from "../paint_format_button/paint_format_button";
import { TableDropdownButton } from "../tables/table_dropdown_button/table_dropdown_button";
import { TopBarColorEditor } from "./color_editor/color_editor";
import { DropdownAction } from "./dropdown_action/dropdown_action";
import { TopBarFontSizeEditor } from "./font_size_editor/font_size_editor";
import { MenuButtonTool } from "./menu_button_tool/menu_button_tool";
import { ToolBarZoom } from "./zoom_editor/zoom_editor";

export const topBarToolBarRegistry = new ToolBarRegistry();

topBarToolBarRegistry
  .add("edit")
  .addChild("edit", {
    id: "undo",
    component: ActionButton,
    props: {
      action: ACTION_EDIT.undo,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("edit", {
    id: "redo",
    component: ActionButton,
    props: {
      action: ACTION_EDIT.redo,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("edit", {
    id: "paint_format",
    component: PaintFormatButton,
    props: {
      class: "o-hoverable-button o-toolbar-button o-mobile-disabled",
    },
    sequence: 3,
  })
  .addChild("edit", {
    id: "clear_format",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.clearFormat,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 4,
  })
  .addChild("edit", {
    id: "zoom",
    component: ToolBarZoom,
    props: {
      class: "o-menu-item-button o-hoverable-button o-toolbar-button",
    },
    sequence: 5,
  })

  .add("numberFormat")
  .addChild("numberFormat", {
    id: "format_percent",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatPercent,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("numberFormat", {
    id: "format_decrease_decimal",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.decreaseDecimalPlaces,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("numberFormat", {
    id: "format_increase_decimal",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.increaseDecimalPlaces,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("numberFormat", {
    id: "format_number_menu",
    component: MenuButtonTool,
    props: {
      class: "o-menu-item-button o-hoverable-button o-toolbar-button",
      action: formatNumberMenuItemSpec,
    },
    sequence: 4,
  })
  .add("fontSize")
  .addChild("fontSize", {
    id: "font_size_editor",
    component: TopBarFontSizeEditor,
    props: {
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .add("textStyle")
  .addChild("textStyle", {
    id: "format_bold",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatBold,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 1,
  })
  .addChild("textStyle", {
    id: "format_italic",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatItalic,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("textStyle", {
    id: "format_strikethrough",
    component: ActionButton,
    props: {
      action: ACTION_FORMAT.formatStrikethrough,
      class: "o-hoverable-button o-toolbar-button",
    },
    sequence: 3,
  })
  .addChild("textStyle", {
    id: "text_color",
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
    id: "fill_color",
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
    id: "border_editor",
    component: BorderEditorWidget,
    props: {
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 2,
  })
  .addChild("cellStyle", {
    id: "merge_cells",
    component: ActionButton,
    props: {
      action: ACTION_EDIT.mergeCells,
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 3,
  })
  .add("alignment")
  .addChild("alignment", {
    id: "alignment_horizontal",
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
    id: "alignment_vertical",
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
    id: "alignment_wrapping",
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
  .addChild("alignment", {
    id: "alignment_rotation",
    component: DropdownAction,
    props: {
      parentAction: ACTION_FORMAT.formatRotation,
      childActions: [
        ACTION_FORMAT.formatNoRotation,
        ACTION_FORMAT.formatRotation45,
        ACTION_FORMAT.formatRotation90,
        ACTION_FORMAT.formatRotation270,
        ACTION_FORMAT.formatRotation315,
      ],
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
      childClass: "o-hoverable-button",
    },
    sequence: 4,
  })

  .add("insert")
  .addChild("insert", {
    id: "insert_chart",
    component: ActionButton,
    props: {
      action: { ...ACTION_INSERT.insertChart, name: _t("Insert chart") },
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 10,
  })
  .addChild("insert", {
    id: "insert_pivot",
    component: ActionButton,
    props: {
      action: { ...ACTION_INSERT.insertPivot, name: _t("Insert pivot table") },
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 20,
  })
  .addChild("insert", {
    id: "insert_function",
    component: MenuButtonTool,
    props: {
      class: "o-menu-item-button o-hoverable-button o-toolbar-button",
      action: { ...ACTION_INSERT.insertFunction, name: _t("Insert function") },
    },
    sequence: 30,
  })

  .add("misc")
  .addChild("misc", {
    id: "table_dropdown",
    component: TableDropdownButton,
    props: { class: "o-toolbar-button o-hoverable-button o-mobile-disabled" },
    sequence: 1,
  })
  .addChild("misc", {
    id: "add_filter",
    component: ActionButton,
    props: {
      action: ACTION_DATA.createRemoveFilterTool,
      class: "o-hoverable-button o-menu-item-button o-toolbar-button",
    },
    sequence: 2,
  });
