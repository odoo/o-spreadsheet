import { Component, hooks, tags, useState } from "@odoo/owl";
import { Grid } from "../src/components/grid";
import { SidePanel } from "../src/components/side_panel/side_panel";
import { functionRegistry } from "../src/functions/index";
import * as h from "../src/helpers/index";
import { toCartesian, toXC } from "../src/helpers/index";
import { Model } from "../src/model";
import { Cell, GridRenderingContext, SpreadsheetEnv, Sheet } from "../src/types";
import "./canvas.mock";

const functions = functionRegistry.content;
const functionMap = functionRegistry.mapping;
const { xml } = tags;
const { useRef, useSubEnv } = hooks;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

export function nextMicroTick(): Promise<void> {
  return Promise.resolve();
}

const origSetTimeout = window.setTimeout;
export async function nextTick(): Promise<void> {
  return new Promise(function (resolve) {
    origSetTimeout(() => Component.scheduler.requestAnimationFrame(() => resolve()));
  });
}

export function makeTestFixture() {
  let fixture = document.createElement("div");
  document.body.appendChild(fixture);
  return fixture;
}

export class GridParent extends Component<any, SpreadsheetEnv> {
  static template = xml`
    <div class="parent">
      <Grid model="model" t-ref="grid"/>
      <SidePanel t-if="sidePanel.isOpen"
             t-on-close-side-panel="sidePanel.isOpen = false"
             model="model"
             component="sidePanel.component"
             panelProps="sidePanel.panelProps" />
    </div>`;

  static components = { Grid, SidePanel };
  model: Model;
  grid: any = useRef("grid");
  sidePanel = useState({ isOpen: false, panelProps: {} } as {
    isOpen: boolean;
    component?: string;
    panelProps: any;
  });

  constructor(model: Model) {
    super();
    useSubEnv({
      openSidePanel: (panel: string, panelProps: any = {}) => this.openSidePanel(panel, panelProps),
      dispatch: model.dispatch,
      getters: model.getters,
    });

    const drawGrid = model.drawGrid;
    model.drawGrid = function (context: GridRenderingContext) {
      context.viewport.width = 1000;
      context.viewport.height = 1000;
      drawGrid.call(this, context);
    };
    this.model = model;
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }

  openSidePanel(panel: string, panelProps: any) {
    this.sidePanel.component = panel;
    this.sidePanel.panelProps = panelProps;
    this.sidePanel.isOpen = true;
  }
}

type GridDescr = { [xc: string]: string };
type FormattedGridDescr = GridDescr;
type GridResult = { [xc: string]: any };

export function getGrid(model: Model): GridResult {
  const result = {};
  for (let xc in model["workbook"].cells) {
    const cell = model["workbook"].cells[xc];
    result[xc] = cell.value;
  }
  return result;
}

/**
 * Evaluate the final state of a grid according to the different values ​​and
 * different functions submitted in the grid cells
 *
 * Examples:
 *   {A1: "=sum(B2:B3)", B2: "2", B3: "3"} => {A1: 5, B2: 2, B3: 3}
 *   {B5: "5", D8: "2.6", W4: "=round(A2)"} => {B5: 5, D8: 2.6, W4: 3}
 */
export function evaluateGrid(grid: GridDescr): GridResult {
  const model = new Model();
  for (let xc in grid) {
    model.dispatch("SET_VALUE", { xc, text: grid[xc] });
  }
  const result = {};
  for (let xc in grid) {
    const cell = getCell(model, xc);
    result[xc] = cell ? cell.value : "";
  }
  return result;
}

export function evaluateGridText(grid: GridDescr): FormattedGridDescr {
  const model = new Model();
  for (let xc in grid) {
    model.dispatch("SET_VALUE", { xc, text: grid[xc] });
  }
  const result = {};
  for (let xc in grid) {
    const cell = getCell(model, xc);
    result[xc] = cell ? model.getters.getCellText(cell) : "";
  }
  return result;
}

/**
 * Evaluate the final state of a cell according to the different values ​​and
 * different functions submitted in a grid cells
 *
 * Examples:
 *   "A2", {A1: "41", A2: "42", A3: "43"} => 42
 *   "A1", {A1: "=sum(A2:A4)", A2: "2", A3: "3", "A4": "4"} => 9
 */
export function evaluateCell(xc: string, grid: GridDescr): any {
  const gridResult = evaluateGrid(grid);
  return gridResult[xc];
}

export function evaluateCellText(xc: string, grid: GridDescr): string {
  const gridResult = evaluateGridText(grid);
  return gridResult[xc];
}

//------------------------------------------------------------------------------
// DOM/Misc Mocks
//------------------------------------------------------------------------------

// modifies scheduler to make it faster to test components
Component.scheduler.requestAnimationFrame = function (callback: FrameRequestCallback) {
  origSetTimeout(callback, 1);
  return 1;
};

interface Deferred extends Promise<any> {
  resolve(val?: any): void;
  reject(): void;
}

export function makeDeferred(): Deferred {
  let resolve, reject;
  let def = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  (<Deferred>def).resolve = resolve;
  (<Deferred>def).reject = reject;
  return <Deferred>def;
}

interface PatchResult {
  calls: any[];
  resolveAll: () => void;
}
export function patchWaitFunction(): PatchResult {
  const result: PatchResult = {
    calls: [],
    resolveAll() {
      result.calls.forEach((c) => c.def.resolve(c.val));
      result.calls = [];
    },
  };
  functionMap["WAIT"] = (arg) => {
    const def = makeDeferred();
    const call = { def, val: arg };
    result.calls.push(call);
    return def;
  };
  return result;
}

export const patch = patchWaitFunction();

let timeHandlers: Function[] = [];
(window as any).setTimeout = (cb) => {
  timeHandlers.push(cb);
};

function clearTimers() {
  let handlers = timeHandlers.slice();
  timeHandlers = [];
  for (let cb of handlers) {
    cb();
  }
}

export async function waitForRecompute() {
  patch.resolveAll();
  await nextTick();
  clearTimers();
}
/*
 * Remove all functions from the internal function list.
 */
export function resetFunctions() {
  Object.keys(functionMap).forEach((k) => {
    delete functionMap[k];
  });

  Object.keys(functions).forEach((k) => {
    delete functions[k];
  });
}

export function mockUuidV4To(expectedId) {
  let n = expectedId;
  //@ts-ignore
  h.uuidv4 = jest.fn(() => String(n++));
}

export function getActiveXc(model: Model): string {
  return toXC(...model.getters.getPosition());
}

export function getCell(model: Model, xc: string): Cell | null {
  return model.getters.getCell(...toCartesian(xc));
}

export function getSheet(model: Model, index: number = 0): Sheet {
  const id = model["workbook"].visibleSheets[index];
  return model["workbook"].sheets[id];
}
