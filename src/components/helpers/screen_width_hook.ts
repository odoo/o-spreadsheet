import { MOBILE_WIDTH_BREAKPOINT } from "../../constants";
import { useSpreadsheetRect } from "./position_hook";

export function useScreenWidth() {
  const spreadsheetRect = useSpreadsheetRect();
  return {
    get isSmall() {
      return spreadsheetRect.width < MOBILE_WIDTH_BREAKPOINT;
    },
  };
}
