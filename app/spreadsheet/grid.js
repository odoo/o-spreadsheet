export const ROW_HEADER_HEIGHT = 25;
export const COL_HEADER_WIDTH = 60;


function drawHeaderCells(ctx, state, width, height) {
    const { currentRow, currentCol, cols, rows } = state;

    ctx.fillStyle = '#f4f5f8';
    ctx.font = '500 12px Source Sans Pro';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // top left empty case
    ctx.fillRect(0, 0, COL_HEADER_WIDTH, ROW_HEADER_HEIGHT);

    // column headers
    const offsetX = cols[currentCol].left - COL_HEADER_WIDTH;
    for (let i = currentCol; i < cols.length; i++) {
        const col = cols[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(col.left - offsetX, 0, col.right - offsetX, ROW_HEADER_HEIGHT);
        ctx.fillStyle = '#585757';
        ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, ROW_HEADER_HEIGHT / 2);
        if (col.right - offsetX > width) {
            break;
        }
    }

    // row headers
    const offsetY = rows[currentRow].top - ROW_HEADER_HEIGHT;
    for (let i = currentRow; i < rows.length; i++) {
        const row = rows[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(0, row.top - offsetY, COL_HEADER_WIDTH, row.bottom - offsetY);
        ctx.fillStyle = '#585757';
        ctx.fillText(row.name, COL_HEADER_WIDTH / 2, (row.top + row.bottom) / 2 - offsetY);
        if (row.bottom - offsetY > height) {
            break;
        }
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
    const { currentRow, currentCol, cols, rows } = state;
    ctx.strokeStyle = '#999';

    // vertical lines
    ctx.lineWidth = 0.5;
    vLine(ctx, COL_HEADER_WIDTH, height)
    ctx.lineWidth = 0.33;
    const offsetX = cols[currentCol].left - COL_HEADER_WIDTH;
    for (let i = currentCol; i < cols.length; i++) {
        const col = state.cols[i];
        vLine(ctx, col.right - offsetX, height);
        if (col.right - offsetX > width) {
            break;
        }
    }

    // horizontal lines
    ctx.lineWidth = 0.5;
    hLine(ctx, ROW_HEADER_HEIGHT, width);
    ctx.lineWidth = 0.33;
    const offsetY = rows[currentRow].top - ROW_HEADER_HEIGHT;
    for (let i = currentRow; i < rows.length; i++) {
        const row = rows[i];
        hLine(ctx, row.bottom - offsetY, width);
        if (row.bottom - offsetY > height) {
            break;
        }
    }

}

function drawSelectedCell(ctx, state) {
    const { cols, rows, currentCol, currentRow, selectedCol, selectedRow } = state;
    // check if selected cell is visible
    if (selectedRow < currentRow || selectedCol < currentCol) {
        return;
    }
    const offsetX = cols[currentCol].left - COL_HEADER_WIDTH;
    const offsetY = rows[currentRow].top - ROW_HEADER_HEIGHT;
    ctx.fillStyle = 'red';
    const row = rows[selectedRow];
    const col = cols[selectedCol];
    ctx.fillRect(col.left - offsetX, row.top - offsetY, col.size, row.size);
}

export function drawGrid(ctx, state, width, height) {
    ctx.clearRect(0, 0, width, height);

    drawHeaderCells(ctx, state, width, height);
    drawBackgroundGrid(ctx, state, width, height);
    drawSelectedCell(ctx, state);
}
