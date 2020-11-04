import { Component, hooks, tags, useState } from "@odoo/owl";
import { Grid } from "../src/components/grid";
import { TopBar } from "../src/components/top_bar";
import { SidePanel } from "../src/components/side_panel/side_panel";
import { functionRegistry } from "../src/functions/index";
import { toCartesian, toXC } from "../src/helpers/index";
import { Model } from "../src/model";
import {
  Cell,
  GridRenderingContext,
  SpreadsheetEnv,
  Zone,
  Style,
  ConditionalFormat,
  ColorScaleThreshold,
  CommandTypes,
  Merge,
  UID,
  Sheet,
} from "../src/types";
import "./canvas.mock";
import { MergePlugin } from "../src/plugins/merge";
export { setNextId as mockUuidV4To } from "./__mocks__/uuid";

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

const t = (s: string): string => s;

export class MockClipboard {
  private content: string = "Some random clipboard content";

  readText(): Promise<string> {
    return Promise.resolve(this.content);
  }

  writeText(content: string): Promise<void> {
    this.content = content;
    return Promise.resolve();
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return false;
  }
}

export function testUndoRedo(model: Model, expect: jest.Expect, command: CommandTypes, args: any) {
  const before = model.exportData();
  model.dispatch(command, args);
  const after = model.exportData();
  model.dispatch("UNDO");
  expect(model.exportData()).toEqual(before);
  model.dispatch("REDO");
  expect(model.exportData()).toEqual(after);
}

export class GridParent extends Component<any, SpreadsheetEnv> {
  static template = xml`
    <div class="parent">
    <TopBar model="model" t-on-ask-confirmation="askConfirmation"/>
      <Grid model="model" t-ref="grid"/>
      <SidePanel t-if="sidePanel.isOpen"
             t-on-close-side-panel="sidePanel.isOpen = false"
             model="model"
             component="sidePanel.component"
             panelProps="sidePanel.panelProps" />
    </div>`;

  static _t = t;
  static components = { Grid, SidePanel, TopBar };
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
      _t: GridParent._t,
      clipboard: new MockClipboard(),
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
  for (let cellId in model.getters.getCells()) {
    const { col, row } = model.getters.getCellPosition(cellId);
    const cell = model.getters.getCell(col, row);
    result[toXC(col, row)] = cell ? cell.value : undefined;
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

export async function asyncComputations() {
  clearTimers();
  await nextTick();
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

export function getActiveXc(model: Model): string {
  return toXC(...model.getters.getPosition());
}

export function getCell(model: Model, xc: string, sheetId?: UID): Cell | null {
  let [col, row] = toCartesian(xc);
  if (sheetId) {
    const sheet = model.getters.getEvaluationSheets()[sheetId];
    return (sheet && sheet.rows[row].cells[col]) || null;
  }
  return model.getters.getCell(col, row);
}

export function getSheet(model: Model, index: number = 0): Sheet {
  return model.getters.getSheets()[index];
}

export function getMerges(model: Model): Record<number, Merge> {
  const mergePlugin = model["handlers"].find(
    (handler) => handler instanceof MergePlugin
  )! as MergePlugin;
  const sheetMerges = mergePlugin["merges"][model.getters.getActiveSheetId()];
  return sheetMerges
    ? (Object.fromEntries(
        Object.entries(sheetMerges).filter(([mergeId, merge]) => merge !== undefined)
      ) as Record<number, Merge>)
    : {};
}

export function getMergeCellMap(model: Model): Record<UID, number> {
  const mergePlugin = model["handlers"].find(
    (handler) => handler instanceof MergePlugin
  )! as MergePlugin;
  const sheetCellMap = mergePlugin["mergeCellMap"][model.getters.getActiveSheetId()];
  return sheetCellMap
    ? (Object.fromEntries(
        Object.entries(sheetCellMap).filter(([mergeId, merge]) => merge !== undefined)
      ) as Record<UID, number>)
    : {};
}

export function zone(str: string): Zone {
  let [tl, br] = str.split(":");
  if (!br) {
    br = tl;
  }
  const [left, top] = toCartesian(tl);
  const [right, bottom] = toCartesian(br);
  return { left, top, right, bottom };
}

export function target(str: string): Zone[] {
  return str.split(",").map(zone);
}

export function createEqualCF(
  ranges: string[],
  value: string,
  style: Style,
  id: string
): ConditionalFormat {
  return {
    ranges,
    id,
    rule: { values: [value], operator: "Equal", type: "CellIsRule", style },
  };
}

export function createColorScale(
  id: string,
  ranges: string[],
  min: ColorScaleThreshold,
  max: ColorScaleThreshold,
  mid?: ColorScaleThreshold
): ConditionalFormat {
  return {
    ranges,
    id,
    rule: { type: "ColorScaleRule", minimum: min, maximum: max, midpoint: mid },
  };
}

/**
 * The Touch API is currently experimental (mid 2020).
 * This implementation is used in test to easily trigger TouchEvents.
 * (TouchEvent is not experimental and supported by all major browsers.)
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Touch
 */
export class Touch {
  readonly altitudeAngle: number;
  readonly azimuthAngle: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly force: number;
  readonly identifier: number;
  readonly pageX: number;
  readonly pageY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotationAngle: number;
  readonly screenX: number;
  readonly screenY: number;
  readonly target: EventTarget;
  readonly touchType: TouchType;
  constructor(touchInitDict: TouchInit) {
    this.identifier = touchInitDict.identifier;
    this.target = touchInitDict.target;
    this.altitudeAngle = touchInitDict.altitudeAngle || 0;
    this.azimuthAngle = touchInitDict.azimuthAngle || 0;
    this.clientX = touchInitDict.clientX || 0;
    this.clientY = touchInitDict.clientY || 0;
    this.force = touchInitDict.force || 0;
    this.pageX = touchInitDict.pageX || 0;
    this.pageY = touchInitDict.pageY || 0;
    this.radiusX = touchInitDict.radiusX || 0;
    this.radiusY = touchInitDict.radiusY || 0;
    this.rotationAngle = touchInitDict.rotationAngle || 0;
    this.screenX = touchInitDict.screenX || 0;
    this.screenY = touchInitDict.screenY || 0;
    this.touchType = touchInitDict.touchType || "direct";
  }
}
