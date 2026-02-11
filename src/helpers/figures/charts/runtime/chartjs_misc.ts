/**
 * Check if the even is a middle mouse click or ctrl+click
 *
 * ChartJS doesn't receive a click event when the user middle clicks on a chart, so we use the mouseup event instead.
 *
 */
export function isChartJSMiddleClick(event) {
  return (
    (event.type === "click" &&
      event.native.button === 0 &&
      (event.native.ctrlKey || event.native.metaKey)) ||
    (event.type === "mouseup" && event.native.button === 1)
  );
}
