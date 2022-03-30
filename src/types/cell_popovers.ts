import { ComponentConstructor } from "@odoo/owl/dist/types/component/component";
import { Getters, Position } from "./index";
import { PropsOf } from "./misc";
import { DOMCoordinates } from "./rendering";

export type CellPopoverType = string;

type SizedComponentConstructor = ComponentConstructor & {
  size: { width: number; height: number };
};

export interface CellPopoverParameters {
  type: string;
}

/**
 * If the cell at the given position have an associated component (linkDisplay, errorTooltip, ...),
 * returns the parameters to display the component
 */
export type CellPopoverBuilder = (
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
