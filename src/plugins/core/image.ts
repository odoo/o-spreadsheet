import { ImageFigure } from "../../components/figures/figure_image/figure_image";
import { deepCopy, isDefined } from "../../helpers";
import { figureRegistry } from "../../registries";
import { FileStore } from "../../types/files";
import { Image } from "../../types/image";
import {
  CommandResult,
  CoreCommand,
  Figure,
  FigureSize,
  Pixel,
  UID,
  WorkbookData,
} from "../../types/index";
import { CorePlugin, CorePluginConfig } from "../core_plugin";

interface ImageState {
  readonly images: Record<UID, Record<UID, Image | undefined> | undefined>;
  readonly nextId: number;
}

export class ImagePlugin extends CorePlugin<ImageState> implements ImageState {
  static getters = ["getImage", "getImagePath", "getImageSize"] as const;
  readonly fileStore?: FileStore;
  readonly images: Record<UID, Record<UID, Image | undefined> | undefined> = {};
  /**
   * paths of images synced with the file store server.
   */
  readonly syncedImages: Set<Image["path"]> = new Set();
  readonly nextId = 1;

  constructor(config: CorePluginConfig) {
    super(config);
    this.fileStore = config.external.fileStore;
  }

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
        this.syncedImages.add(cmd.definition.path);
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

  /**
   * Delete unused images from the file store
   */
  garbageCollectExternalResources() {
    const images = new Set(this.getAllImages().map((image) => image.path));
    for (const path of this.syncedImages) {
      if (!images.has(path)) {
        this.fileStore?.delete(path);
      }
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

  import(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const images = (sheet.figures || []).filter((figure) => figure.tag === "image");
      for (const image of images) {
        this.history.update("nextId", this.nextId + 1);
        this.history.update("images", sheet.id, image.id, image.data);
        this.syncedImages.add(image.data.path);
      }
    }
  }

  export(data: WorkbookData) {
    for (const sheet of data.sheets) {
      const images = sheet.figures.filter((figure) => figure.tag === "image");
      for (const image of images) {
        image.data = this.images[sheet.id]?.[image.id];
      }
    }
  }

  private getAllImages(): Image[] {
    const images: Image[] = [];
    for (const sheetId in this.images) {
      images.push(...Object.values(this.images[sheetId] || {}).filter(isDefined));
    }
    return images;
  }
}

figureRegistry.add("image", {
  Component: ImageFigure,
  keepRatio: true,
  minFigSize: 20,
  borderWidth: 0,
});
