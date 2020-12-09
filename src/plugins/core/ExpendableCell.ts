import { CellData, Getters, Style } from "../../types";
import { Component } from "@odoo/owl";

interface ExtendableCell {
  type: string;
  getValue: (getters: Getters) => unknown;
  getContent: (getters: Getters) => string;
  render: (RenderingContext, getters: Getters) => undefined;
  editComponent: (XYposition, XCposition, cell, cellSizePX, getters) => Component;

  import: (cellData: CellData) => ExtendableCell;
  export: (cell: ExtendableCell) => unknown;

  canEdit: (/* ??? in which context can a cell be editable, what does it need to know to make this decision ???*/) => boolean;
  getStyle: () => Style;
}

/*
Aspect of a cell:

it is editable or not
it might change type based on
  user input
  user action (button, menu, etc.)
  result of a formula

it can be styled
it can have borders
it can be imported and exported
it can be rendered on screen

sometimes, its values are limited (data validation in excel)
sometimes, the way the content is input is not using the composer (data list, pivot filter, column filter)

 */
