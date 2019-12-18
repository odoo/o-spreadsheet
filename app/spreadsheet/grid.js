export const ROW_HEADER_HEIGHT = 25;
export const COL_HEADER_WIDTH = 60;

export function drawGrid(ctx, state, width, height) {

    ctx.clearRect(0, 0, width, height);


    console.log(state);
    // =========================
    // Column
    // =========================

    ctx.fillStyle = '#f4f5f8';
    ctx.font = '500 11px Source Sans Pro';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // top left empty case
    ctx.fillRect(0, 0, COL_HEADER_WIDTH, ROW_HEADER_HEIGHT);

    // column headers
    const offsetX = state.cols[state.currentCol].left - COL_HEADER_WIDTH;
    for (let i = state.currentCol; i < state.cols.length; i++) {
        const col = state.cols[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(col.left - offsetX, 0, col.right - offsetX, ROW_HEADER_HEIGHT);
        ctx.fillStyle = 'black';
        ctx.fillText(col.name, (col.left + col.right) / 2 - offsetX, ROW_HEADER_HEIGHT / 2);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(col.left - offsetX + 0.5, 0);
        ctx.lineTo(col.left - offsetX + 0.5, height);
        ctx.stroke();
        debugger;
        // if (col.left - offsetX > width) {
        //   // debugger
        //   break;
        // }
    }


    // row headers
    const offsetY = state.rows[state.currentRow].top - ROW_HEADER_HEIGHT;
    for (let i = state.currentRow; i < state.rows.length; i++) {
        const row = state.rows[i];
        ctx.fillStyle = '#f4f5f8';
        ctx.fillRect(0, row.top - offsetY, COL_HEADER_WIDTH, row.bottom - offsetY);
        ctx.fillStyle = 'black';
        ctx.fillText(row.name, COL_HEADER_WIDTH / 2, (row.top + row.bottom) / 2 - offsetY);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, row.top - offsetY + 0.5);
        ctx.lineTo(width, row.top - offsetY + 0.5);
        ctx.stroke();

        debugger;
        // if (col.left - offsetX > this.props.width) {
        //   // debugger
        //   break;
        // }
    }

    // ctx.fillStyle = 'rgba(0, 0, 200, 0.5)';
    // ctx.fillRect(30, 30, 50, 50);

}
