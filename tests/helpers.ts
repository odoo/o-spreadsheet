import { Component, tags, hooks } from "@odoo/owl";
import { compile } from "../src/formulas";
import { functionMap, functions } from "../src/functions/index";
import { GridModel } from "../src/model";
import { Grid } from "../src/ui/grid";
import { toCartesian, toXC } from "../src/helpers";

const { xml } = tags;
const { useRef } = hooks;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Evaluate a formula (as a string).
 *
 * This method mocks the evaluation process to make it easier to test the
 * functions/compiler/parser/... This method does not instantiate a GridModel
 * nor evaluate other cells. It only evaluates a single formula, and give it
 * values from its vars parameter, if needed.
 */
export function evaluate(str: string, vars = {}): any {
  const fn = compile(str);
  function getValue(v) {
    return vars[v];
  }

  function range(v1: string, v2: string): any[] {
    const [c1, r1] = toCartesian(v1);
    const [c2, r2] = toCartesian(v2);
    const result: any[] = [];
    for (let c = c1; c <= c2; c++) {
      for (let r = r1; r <= r2; r++) {
        result.push(getValue(toXC(c, r)));
      }
    }
    return result;
  }
  const functions = Object.assign({ range }, functionMap);

  return fn(getValue, functions);
}

export function nextMicroTick(): Promise<void> {
  return Promise.resolve();
}

export async function nextTick(): Promise<void> {
  return new Promise(function(resolve) {
    setTimeout(() => Component.scheduler.requestAnimationFrame(() => resolve()));
  });
}

export function makeTestFixture() {
  let fixture = document.createElement("div");
  document.body.appendChild(fixture);
  return fixture;
}

export function simulateClick(selector: string, x: number = 10, y: number = 10) {
  const target = document.querySelector(selector)! as HTMLElement;
  triggerMouseEvent(selector, "mousedown", x, y);
  target.focus();
  triggerMouseEvent(selector, "mouseup", x, y);
  triggerMouseEvent(selector, "click", x, y);
}

export function triggerMouseEvent(
  selector: string | any,
  type: string,
  x: number,
  y: number,
  extra = {}
) {
  const ev = new MouseEvent(type, {
    clientX: x,
    clientY: y,
    ...extra
  });
  (ev as any).offsetX = x;
  (ev as any).offsetY = y;
  if (typeof selector === "string") {
    document.querySelector(selector)!.dispatchEvent(ev);
  } else {
    selector!.dispatchEvent(ev);
  }
}

export class GridParent extends Component<any, any> {
  static template = xml`
    <div class="parent">
      <Grid model="model" t-ref="grid"/>
    </div>`;

  static components = { Grid };
  model: GridModel;
  grid: any = useRef("grid");
  constructor(model: GridModel) {
    super();

    const uvz = model.updateVisibleZone;
    model.updateVisibleZone = function(width?: number, height?: number) {
      // we simulate here a vizible zone of 1000x1000px
      if (width !== undefined) {
        uvz.call(this, 1000, 1000);
      } else {
        uvz.call(this);
      }
    };
    this.model = model;
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
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
  const model = new GridModel();
  for (let xc in grid) {
    model.setValue(xc, grid[xc]);
  }
  const result = {};
  for (let xc in grid) {
    result[xc] = model.state.cells[xc].value;
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
  setTimeout(callback, 1);
  return 1;
};

HTMLCanvasElement.prototype.getContext = jest.fn(function() {
  return {
    translate() {},
    scale() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillRect() {},
    strokeRect() {},
    fillText() {},
    save() {},
    rect() {},
    clip() {},
    restore() {},
    setLineDash() {},
    measureText() {
      return { width: 1 };
    }
  };
}) as any;
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
