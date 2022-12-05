import { ImageFigure } from "../../components/figures/figure_image/figure_image";
import { deepCopy } from "../../helpers";
import { figureRegistry } from "../../registries";
import { Image } from "../../types/image";
import { CommandResult, CoreCommand, Figure, FigureSize, Pixel, UID } from "../../types/index";
import { CorePlugin } from "../core_plugin";

interface ImageState {
  readonly images: Record<UID, Record<UID, Image | undefined> | undefined>;
  readonly nextId: number;
}

export class ImagePlugin extends CorePlugin<ImageState> implements ImageState {
  static getters = ["getImage", "getImagePath", "getImageSize"] as const;

  readonly images: Record<UID, Record<UID, Image | undefined> | undefined> = {};
  readonly nextId = 1;

  // ---------------------------------------------------------------------------
  // Command Handling
  // ---------------------------------------------------------------------------

  allowDispatch(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_IMAGE":
        if (this.getters.getFigure(cmd.sheetId, cmd.figureId)) {
          return CommandResult.InvalidFigureId;
        }
        return CommandResult.Success;
      default:
        return CommandResult.Success;
    }
  }

  handle(cmd: CoreCommand) {
    switch (cmd.type) {
      case "CREATE_IMAGE":
        this.addFigure(cmd.figureId, cmd.sheetId, cmd.position, cmd.size);
        this.history.update("images", cmd.sheetId, cmd.figureId, cmd.definition);
        break;
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "image") {
            const id = `image-${this.nextId}`;
            this.history.update("nextId", this.nextId + 1);
            const image = this.getImage(fig.id);
            if (image) {
              const size = { width: fig.width, height: fig.height };
              this.dispatch("CREATE_IMAGE", {
                sheetId: cmd.sheetIdTo,
                figureId: id,
                position: { x: fig.x, y: fig.y },
                size,
                definition: deepCopy(image),
              });
            }
          }
        }
        break;
      }
      case "DELETE_FIGURE":
        this.history.update("images", cmd.sheetId, cmd.id, undefined);
        break;
      case "DELETE_SHEET":
        this.history.update("images", cmd.sheetId, undefined);
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getImage(figureId: UID): Image {
    for (const sheet of Object.values(this.images)) {
      if (sheet && sheet[figureId]) {
        return sheet[figureId]!;
      }
    }
    throw new Error(`There is no image with the given figureId: ${figureId}`);
  }

  getImagePath(figureId: UID): string {
    return this.getImage(figureId).path;
  }

  getImageSize(figureId: UID): FigureSize {
    return this.getImage(figureId).size;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private addFigure(id: UID, sheetId: UID, position: { x: Pixel; y: Pixel }, size: FigureSize) {
    const figure: Figure = {
      id,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      tag: "image",
    };
    this.dispatch("CREATE_FIGURE", { sheetId, figure });
  }
}

figureRegistry.add("image", {
  Component: ImageFigure,
  keepRatio: true,
  minFigSize: 20,
  borderWidth: 0,
});
