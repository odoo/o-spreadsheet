import { ComponentConstructor } from "@odoo/owl";
import { Getters, Position } from "./index";
import { PropsOf } from "./misc";
import { DOMCoordinates } from "./rendering";

export type CellPopoverType = "ErrorToolTip" | "LinkDisplay" | "FilterMenu" | "LinkEditor";

type SizedComponentConstructor = ComponentConstructor & {
  size: { width: number; height: number };
};

/**
 * If the cell at the given position have an associated component (linkDisplay, errorTooltip, ...),
 * returns the parameters to display the component
 */
type CellPopoverBuilder = (
  position: Position,
  getters: Getters
) => CellPopoverComponent<SizedComponentConstructor>;

export interface PopoverBuilders {
  onOpen?: CellPopoverBuilder;
  onHover?: CellPopoverBuilder;
}

export interface ClosedCellPopover {
  isOpen: false;
}

/**
 * Description of a cell component.
 * i.e. which component class, which props and where to
 * display it relative to the cell
 */
type OpenCellPopover<C extends ComponentConstructor> = {
  isOpen: true;
  Component: C;
  props: PropsOf<C>;
  cellCorner: "TopRight" | "BottomLeft";
};

export type CellPopoverComponent<C extends SizedComponentConstructor = SizedComponentConstructor> =
  | ClosedCellPopover
  | OpenCellPopover<C>;

export type PositionedCellPopover<C extends SizedComponentConstructor = SizedComponentConstructor> =
  {
    isOpen: true;
    Component: C;
    props: PropsOf<C>;
    coordinates: DOMCoordinates;
    cellWidth: number;
    cellHeight: number;
  };
