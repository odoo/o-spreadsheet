import { Pixel } from "@odoo/o-spreadsheet-engine";
import { ComputedTableStyle, TableMetaData } from "@odoo/o-spreadsheet-engine/types/table";

interface DrawTableParams extends TableMetaData {
  colWidth: Pixel;
  rowHeight: Pixel;
}

export function drawPreviewTable(
  ctx: CanvasRenderingContext2D,
  tableStyle: ComputedTableStyle,
  params: DrawTableParams
) {
  ctx.resetTransform();
  drawBackgrounds(ctx, tableStyle, params);
  drawBorders(ctx, tableStyle, params);
  drawTexts(ctx, tableStyle, params);
}

function drawBackgrounds(
  ctx: CanvasRenderingContext2D,
  tableStyle: ComputedTableStyle,
  params: DrawTableParams
) {
  const { colWidth, rowHeight, numberOfCols, numberOfRows } = params;
  ctx.save();
  for (let col = 0; col < numberOfCols; col++) {
    for (let row = 0; row < numberOfRows; row++) {
      ctx.fillStyle = tableStyle.styles[col][row].fillColor || "#fff";

      // We also want to fill the last pixel corresponding to the outside border if there is no border
      const width = col === numberOfCols - 1 ? colWidth + 1 : colWidth;
      const height = row === numberOfRows - 1 ? rowHeight + 1 : rowHeight;
      ctx.fillRect(col * colWidth, row * rowHeight, width, height);
    }
  }
  ctx.restore();
}

function drawBorders(
  ctx: CanvasRenderingContext2D,
  tableStyle: ComputedTableStyle,
  params: DrawTableParams
) {
  const { colWidth, rowHeight, numberOfCols, numberOfRows } = params;
  ctx.save();
  ctx.translate(0, 0.5);
  ctx.lineWidth = 1;

  for (let col = 0; col < numberOfCols; col++) {
    for (let row = 0; row < numberOfRows; row++) {
      const borders = tableStyle.borders[col][row];
      if (borders.top) {
        ctx.strokeStyle = borders.top.color;
        ctx.beginPath();
        ctx.moveTo(col * colWidth, row * rowHeight);
        ctx.lineTo(col * colWidth + colWidth, row * rowHeight);
        ctx.stroke();
      }
      if (borders.bottom) {
        ctx.strokeStyle = borders.bottom.color;
        ctx.beginPath();
        ctx.moveTo(col * colWidth, row * rowHeight + rowHeight);
        ctx.lineTo(col * colWidth + colWidth, row * rowHeight + rowHeight);
        ctx.stroke();
      }
    }
  }

  ctx.resetTransform();
  ctx.translate(0.5, 0);

  for (let col = 0; col < numberOfCols; col++) {
    for (let row = 0; row < numberOfRows; row++) {
      const borders = tableStyle.borders[col][row];
      if (borders.left) {
        ctx.strokeStyle = borders.left.color;
        ctx.beginPath();
        ctx.moveTo(col * colWidth, row * rowHeight);
        ctx.lineTo(col * colWidth, row * rowHeight + rowHeight);
        ctx.stroke();
      }
      if (borders.right) {
        ctx.strokeStyle = borders.right.color;
        ctx.beginPath();
        ctx.moveTo(col * colWidth + colWidth, row * rowHeight);
        ctx.lineTo(col * colWidth + colWidth, row * rowHeight + rowHeight + 1); // +1 to draw on the bottom-right pixel of the table
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawTexts(
  ctx: CanvasRenderingContext2D,
  tableStyle: ComputedTableStyle,
  params: DrawTableParams
) {
  const { colWidth, rowHeight, numberOfCols, numberOfRows } = params;
  ctx.save();
  ctx.translate(0, 0.5);
  ctx.lineWidth = 1;
  const xPadding = Math.floor(colWidth / 4);
  const yPadding = Math.floor(rowHeight / 2);

  for (let col = 0; col < numberOfCols; col++) {
    for (let row = 0; row < numberOfRows; row++) {
      ctx.strokeStyle = tableStyle.styles[col][row].textColor || "#000";

      ctx.beginPath();
      ctx.moveTo(col * colWidth + xPadding + 1, row * rowHeight + yPadding);
      ctx.lineTo(col * colWidth + colWidth - xPadding, row * rowHeight + yPadding);
      ctx.stroke();
    }
  }

  ctx.restore();
}
