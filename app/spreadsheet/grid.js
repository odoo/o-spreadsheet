
function drawHeaderCells(ctx, state) {
    const { topRow, leftCol, rightCol, bottomRow, cols, rows, headerWidth, headerHeight } = state;

    ctx.fillStyle = '#f4f5f8';
    ctx.font = '500 12px Source Sans Pro';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // top left empty case
    ctx.fillRect(0, 0, headerWidth, headerHeight);

    // column headers
    const offsetX = state.offsetX - headerWidth;
    for (let i = leftCol; i <= rightCol; i++) {
        const col = cols[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(col.left - offsetX, 0, col.right - offsetX, headerHeight);
        ctx.fillStyle = '#585757';
        ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, headerHeight / 2);
    }

    // row headers
    const offsetY = state.offsetY - headerHeight;
    for (let i = topRow; i <= bottomRow; i++) {
        const row = rows[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(0, row.top - offsetY, headerWidth, row.bottom - offsetY);
        ctx.fillStyle = '#585757';
        ctx.fillText(row.name, headerWidth / 2, (row.top + row.bottom) / 2 - offsetY);
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
    const { leftCol, rightCol, topRow, bottomRow, cols, rows, headerWidth, headerHeight } = state;
    ctx.strokeStyle = '#999';

    // vertical lines
    ctx.lineWidth = 0.5;
    vLine(ctx, headerWidth, height)
    ctx.lineWidth = 0.33;
    const offsetX = state.offsetX - headerWidth;
    for (let i = leftCol; i <= rightCol; i++) {
        const col = cols[i];
        vLine(ctx, col.right - offsetX, height);
    }

    // horizontal lines
    ctx.lineWidth = 0.5;
    hLine(ctx, headerHeight, width);
    ctx.lineWidth = 0.33;
    const offsetY = state.offsetY - headerHeight;
    for (let i = topRow; i <= bottomRow; i++) {
        const row = rows[i];
        hLine(ctx, row.bottom - offsetY, width);
    }

}

function drawSelectedCell(ctx, state) {
    const { cols, rows, currentCol, currentRow, selectedCol, selectedRow, headerWidth, headerHeight } = state;
    // check if selected cell is visible
    if (selectedRow < currentRow || selectedCol < currentCol) {
        return;
    }
    const offsetX = cols[currentCol].left - headerWidth;
    const offsetY = rows[currentRow].top - headerHeight;
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
    // drawSelectedCell(ctx, state);
}
