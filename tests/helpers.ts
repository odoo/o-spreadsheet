import { Component, tags } from "@odoo/owl";
import { compile } from "../src/formulas";
import { functionMap } from "../src/functions/index";
import { GridModel } from "../src/model";
import { Grid } from "../src/ui/grid";
import { toCartesian, toXC } from "../src/helpers";

const { xml } = tags;

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

export async function triggerColResizer(x: number, delta: number, model: GridModel, width: number) {
  triggerMouseEvent(".o-resizer .o-col-resizer", "mousemove", x, 10);
  await nextTick();
  model.state.clientWidth = width;
  triggerMouseEvent(".o-resizer .o-col-resizer .o-handle", "mousedown", x, 10);
  triggerMouseEvent(window, "mousemove", x + delta, 10);
  triggerMouseEvent(window, "mouseup", x + delta, 10);
  await nextTick();
  model.state.clientWidth = width;
}

export async function triggerRowResizer(
  y: number,
  delta: number,
  model: GridModel,
  height: number
) {
  triggerMouseEvent(".o-resizer .o-row-resizer", "mousemove", 10, y);
  await nextTick();
  model.state.clientHeight = height;
  triggerMouseEvent(".o-resizer .o-row-resizer .o-handle", "mousedown", 10, y);
  triggerMouseEvent(window, "mousemove", 10, y + delta);
  triggerMouseEvent(window, "mouseup", 10, y + delta);
  await nextTick();
  model.state.clientHeight = height;
}

export class GridParent extends Component<any, any> {
  static template = xml`
    <div class="parent">
      <Grid model="model"/>
    </div>`;

  static components = { Grid };
  model: GridModel;
  constructor(model: GridModel) {
    super();
    this.model = model;
  }

  mounted() {
    this.model.on("update", this, this.render);
  }

  willUnmount() {
    this.model.off("update", this);
  }
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
    restore() {}
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
