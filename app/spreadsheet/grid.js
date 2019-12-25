export const HEADER_HEIGHT = 26;
export const HEADER_WIDTH = 60;

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

function drawSelectedCell(ctx, state) {
    const { cols, rows, leftCol, topRow, rightCol, bottomRow, selectedCol, selectedRow } = state;
    // check if selected cell is visible
    if (selectedCol < leftCol || selectedCol > rightCol ||  selectedRow < topRow || selectedRow > bottomRow) {
        return;
    }
    const offsetX = state.offsetX;
    const offsetY = state.offsetY;
    ctx.fillStyle = 'red';
    const row = rows[selectedRow];
    const col = cols[selectedCol];
    ctx.fillRect(col.left - offsetX, row.top - offsetY, col.size, row.size);
}

export function drawGrid(ctx, state, width, height) {
    console.log('drawing', state);
    ctx.clearRect(0, 0, width, height);

    drawHeaderCells(ctx, state);
    drawBackgroundGrid(ctx, state, width, height);
    drawSelectedCell(ctx, state);
}
