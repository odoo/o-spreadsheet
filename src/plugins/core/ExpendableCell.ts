import { CellData, Getters, Style } from "../../types";
import { Component } from "@odoo/owl";

interface ExtendableCell {
  type: string;
  getValue: (getters: Getters) => unknown;
  getContent: (getters: Getters) => string;
  render: (RenderingContext, getters: Getters) => undefined;
  editComponent: (XyPosition, XcPosition, cell, cellSizePX, getters) => Component;

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



Meeting 2020-12-09 (FLE, LAA, PRO, LUL, VSC)
--------------------------------------------
probably a good idea to start with formula and one other simple new cell type (data-validated list type, read-only type) to start with
using classes might not be a good idea: add or remove aspects (if they are implemented like a chain-of-responsibility patterns (or other) might be hard once the class is created.
probably a better idea to add flags to an object and if it has the flag, it has the aspect (at least at first)



meeting 2020-13-09 (VSC, GED)
-----------------------------
one to many entre la position et les different aspects de la cell

 */
