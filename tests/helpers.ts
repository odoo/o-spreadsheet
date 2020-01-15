import { Component, tags } from "@odoo/owl";
import { Grid } from "../src/components/grid";
import { GridModel } from "../src/grid_model";

const { xml } = tags;

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

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
  selector: string,
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
  document.querySelector(selector)!.dispatchEvent(ev);
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

if (!HTMLDivElement.prototype.hasOwnProperty("innerText")) {
  Object.defineProperty(HTMLDivElement.prototype, "innerText", {
    get() {
      return this.textContent;
    }
  });
}
let el;
window.document.createRange = () =>
  ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: "BODY",
      ownerDocument: document
    },
    selectNodeContents: _el => {
      el = _el;
    },
    collapse: () => {}
  } as any);

window.getSelection = (() => {
  return {
    removeAllRanges: () => {},
    addRange: () => {
      el.focus();
    }
  };
}) as any;
