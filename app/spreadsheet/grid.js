const { Component } = owl;
const { xml, css } = owl.tags;
const { useRef } = owl.hooks;

const HEADER_HEIGHT = 26;
const HEADER_WIDTH = 60;

function drawHeaderCells(ctx, state) {
    const { topRow, leftCol, rightCol, bottomRow, cols, rows } = state;

    ctx.fillStyle = '#f4f5f8';
    ctx.font = '500 12px Source Sans Pro';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // top left empty case
    ctx.fillRect(0, 0, HEADER_WIDTH, HEADER_HEIGHT);

    // column headers
    const offsetX = state.offsetX;
    for (let i = leftCol; i <= rightCol; i++) {
        const col = cols[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(col.left - offsetX, 0, col.right - offsetX, HEADER_HEIGHT);
        ctx.fillStyle = '#585757';
        ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, HEADER_HEIGHT / 2);
    }

    // row headers
    const offsetY = state.offsetY;
    for (let i = topRow; i <= bottomRow; i++) {
        const row = rows[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(0, row.top - offsetY, HEADER_WIDTH, row.bottom - offsetY);
        ctx.fillStyle = '#585757';
        ctx.fillText(row.name, HEADER_WIDTH / 2, (row.top + row.bottom) / 2 - offsetY);
    }
}

function vLine(ctx, x, height) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
}

function hLine(ctx, y, width) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
}

function drawBackgroundGrid(ctx, state, width, height) {
    const { leftCol, rightCol, topRow, bottomRow, cols, rows } = state;

    // header lines
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#555';
    vLine(ctx, HEADER_WIDTH, height)
    hLine(ctx, HEADER_HEIGHT, width);

    // vertical lines
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.33;
    const offsetX = state.offsetX;
    for (let i = leftCol; i <= rightCol; i++) {
        const col = cols[i];
        vLine(ctx, col.right - offsetX, height);
    }

    // horizontal lines
    const offsetY = state.offsetY;
    for (let i = topRow; i <= bottomRow; i++) {
        const row = rows[i];
        hLine(ctx, row.bottom - offsetY, width);
    }
}

function isCellVisible(col, row, state) {
    const { leftCol, topRow, rightCol, bottomRow } = state;
    return (col >= leftCol && col <= rightCol && row >= topRow && row <= bottomRow);
}

function drawCells(ctx, state) {
    const { offsetX, offsetY, rows, cols } = state;
    ctx.font = "500 10px Arial";
    ctx.fillStyle = "#000";

    for (let xc in state.cells) {
        // to do: skip many rows
        let cell = state.cells[xc];
        let col = cols[cell._col];
        let row = rows[cell._row];
        if (isCellVisible) {
            let x = (col.left + col.right) / 2 - offsetX;
            let y = (row.top + row.bottom) / 2 - offsetY;
            ctx.fillText(cell._value, x, y);
        }
    }
}

function drawSelectedCell(ctx, state) {
    const { cols, rows, selectedCol, selectedRow } = state;
    // check if selected cell is visible
    if (!isCellVisible(selectedCol, selectedRow, state)) {
        return;
    }
    const offsetX = state.offsetX;
    const offsetY = state.offsetY;
    ctx.fillStyle = 'red';
    const row = rows[selectedRow];
    const col = cols[selectedCol];
    ctx.fillRect(col.left - offsetX, row.top - offsetY, col.size, row.size);
}

function drawGrid(ctx, state, width, height) {
    console.log('drawing', state);
    ctx.clearRect(0, 0, width, height);

    drawHeaderCells(ctx, state);
    drawBackgroundGrid(ctx, state, width, height);
    drawCells(ctx, state)
    drawSelectedCell(ctx, state);
}



const TEMPLATE = xml /* xml */`
  <div class="o-spreadsheet-sheet">
    <canvas t-ref="canvas"
      t-on-mousewheel="onMouseWheel" />
    <div class="o-scrollbar vertical" t-on-scroll="onScroll" t-ref="vscrollbar">
      <div t-attf-style="width:1px;height:{{props.state.height}}px"/>
    </div>
    <div class="o-scrollbar horizontal" t-on-scroll="onScroll" t-ref="hscrollbar">
      <div t-attf-style="height:1px;width:{{props.state.width}}px"/>
    </div>
  </div>`;

const CSS = css /* scss */`
  .o-spreadsheet-sheet {
    position: relative;
    overflow: hidden;

    .o-scrollbar {
      position: absolute;
      overflow: auto;
    }
    .o-scrollbar.vertical {
      right: 0;
      top: ${HEADER_HEIGHT}px;
      bottom: 15px;
    }
    .o-scrollbar.horizontal {
      bottom: 0;
      right: 15px;
      left: ${HEADER_WIDTH}px;
    }
  }`;

export class Grid extends Component {
    static template = TEMPLATE;
    static style = CSS;

    vScrollbar = useRef('vscrollbar');
    hScrollbar = useRef('hscrollbar');
    canvas = useRef('canvas');
    context = null;

    mounted() {
        // Get the device pixel ratio, falling back to 1.
        // const dpr = window.devicePixelRatio || 1;
        // // Get the size of the canvas in CSS pixels.
        // const rect = canvas.getBoundingClientRect();
        // // Give the canvas pixel dimensions of their CSS
        // // size * the device pixel ratio.
        // canvas.width = rect.width * dpr;
        // canvas.height = rect.height * dpr;
        const ctx = this.canvas.el.getContext('2d');
        // Scale all drawing operations by the dpr, so you
        // don't have to worry about the difference.
        // ctx.scale(this.dpr, this.dpr);
        this.context = ctx; // this.canvas.el.getContext('2d');
        this.updateVisibleZone();
        this.drawGrid();
    }

    patched() {
        this.updateVisibleZone();
        this.drawGrid();
    }

    updateVisibleZone() {
        const state = this.props.state;
        const { rows, cols } = state;

        const offsetY = this.vScrollbar.el ? this.vScrollbar.el.scrollTop : 0;
        const offsetX = this.hScrollbar.el ? this.hScrollbar.el.scrollLeft : 0;

        state.bottomRow = rows.length - 1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].top <= offsetY) {
                state.topRow = i;
            }
            if (offsetY + this.props.height - 40 < rows[i].bottom) {
                state.bottomRow = i;
                break;
            }
        }
        state.rightCol = cols.length - 1;
        for (let i = 0; i < cols.length; i++) {
            if (cols[i].left <= offsetX) {
                state.leftCol = i;
            }
            if (offsetX + this.props.width < cols[i].right) {
                state.rightCol = i;
                break;
            }
        }
        state.offsetX = cols[state.leftCol].left - HEADER_WIDTH;
        state.offsetY = rows[state.topRow].top - HEADER_HEIGHT;
    }


    onScroll() {
        const state = this.props.state;
        const { offsetX, offsetY } = state;
        this.updateVisibleZone();
        if (offsetX !== state.offsetX || offsetY !== state.offsetY) {
            this.drawGrid();
        }
    }
    drawGrid() {
        // whenever the dimensions are changed, we need to reset the width/height
        // of the canvas manually, and reset its scaling.
        const dpr = window.devicePixelRatio || 1;
        const width = this.el.clientWidth;
        const height = this.el.clientHeight;
        const canvas = this.canvas.el;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.setAttribute('style', `width:${width}px;height:${height}px;`)
        this.context.scale(dpr, dpr);
        drawGrid(this.context, this.props.state, width, height)
    }

    onMouseWheel(ev) {
        const vScrollbar = this.vScrollbar.el;
        vScrollbar.scrollTop = vScrollbar.scrollTop + ev.deltaY;
        const hScrollbar = this.hScrollbar.el;
        hScrollbar.scrollLeft = hScrollbar.scrollLeft + ev.deltaX;
    }
}

