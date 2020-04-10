import { Component, hooks, tags, useState } from "@odoo/owl";
import { GridRenderingContext } from "../src/base_plugin";
import { Grid } from "../src/components/grid";
import { sidePanelRegistry } from "../src/components/index";
import { SidePanel } from "../src/components/side_panel/side_panel";
import { functionRegistry } from "../src/functions/index";
import * as h from "../src/helpers/index";
import { toXC } from "../src/helpers/index";
import { Model } from "../src/model";
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
  return new Promise(function(resolve) {
    origSetTimeout(() => Component.scheduler.requestAnimationFrame(() => resolve()));
  });
}

export function makeTestFixture() {
  let fixture = document.createElement("div");
  document.body.appendChild(fixture);
  return fixture;
}

export class GridParent extends Component<any> {
  static template = xml`
    <div class="parent">
      <Grid model="model" t-ref="grid"/>
      <SidePanel t-if="sidePanel.isOpen"
             t-on-close-side-panel="sidePanel.isOpen = false"
             model="model"
             title="sidePanel.title"
             Body="sidePanel.Body"
             Footer="sidePanel.Footer"/>
    </div>`;

  static components = { Grid, SidePanel };
  model: Model;
  grid: any = useRef("grid");
  sidePanel = useState({ isOpen: false } as {
    isOpen: boolean;
    title?: string;
    Body?: any;
    Footer?: any;
  });
  constructor(model: Model) {
    super();
    useSubEnv({
      spreadsheet: {
        openSidePanel: (panel: string) => this.openSidePanel(panel)
      }
    });

    const drawGrid = model.drawGrid;
    model.drawGrid = function(context: GridRenderingContext) {
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

  openSidePanel(panel: string) {
    const panelComponent = sidePanelRegistry.get(panel);
    this.sidePanel.title = panelComponent.title;
    this.sidePanel.Body = panelComponent.Body;
    this.sidePanel.Footer = panelComponent.Footer;
    this.sidePanel.isOpen = true;
  }
}

type GridDescr = { [xc: string]: string };
type GridResult = { [xc: string]: any };

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
    const cell = model.workbook.cells[xc];
    result[xc] = cell ? cell.value : "";
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

//------------------------------------------------------------------------------
// DOM/Misc Mocks
//------------------------------------------------------------------------------

// modifies scheduler to make it faster to test components
Component.scheduler.requestAnimationFrame = function(callback: FrameRequestCallback) {
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
      result.calls.forEach(c => c.def.resolve(c.val));
      result.calls = [];
    }
  };
  functionMap["WAIT"] = arg => {
    const def = makeDeferred();
    const call = { def, val: arg };
    result.calls.push(call);
    return def;
  };
  return result;
}

export const patch = patchWaitFunction();

let timeHandlers: Function[] = [];
(window as any).setTimeout = cb => {
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
  Object.keys(functionMap).forEach(k => {
    delete functionMap[k];
  });

  Object.keys(functions).forEach(k => {
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
