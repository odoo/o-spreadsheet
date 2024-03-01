import { FIGURE_ID_SPLITTER } from "../../constants";
import { deepCopy, isDefined } from "../../helpers";
import { FileStore } from "../../types/files";
import { Image } from "../../types/image";
import {
  CommandResult,
  CoreCommand,
  DOMCoordinates,
  ExcelWorkbookData,
  Figure,
  FigureData,
  FigureSize,
  UID,
  WorkbookData,
} from "../../types/index";
import { CorePlugin, CorePluginConfig } from "../core_plugin";

interface ImageState {
  readonly images: Record<UID, Record<UID, Image | undefined> | undefined>;
}

export class ImagePlugin extends CorePlugin<ImageState> implements ImageState {
  static getters = ["getImage", "getImageSrc", "getImageSize"] as const;
  readonly fileStore?: FileStore;
  readonly images: Record<UID, Record<UID, Image | undefined> | undefined> = {};
  /**
   * sources of images synced with the file store server.
   */
  readonly syncedImages: Set<Image["src"]> = new Set();

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
        this.addImage(cmd.figureId, cmd.sheetId, cmd.position, cmd.size);
        this.history.update("images", cmd.sheetId, cmd.figureId, cmd.definition);
        this.syncedImages.add(cmd.definition.src);
        break;
      case "DUPLICATE_SHEET": {
        const sheetFiguresFrom = this.getters.getFigures(cmd.sheetId);
        for (const fig of sheetFiguresFrom) {
          if (fig.tag === "image") {
            const figureIdBase = fig.id.split(FIGURE_ID_SPLITTER).pop();
            const duplicatedFigureId = `${cmd.sheetIdTo}${FIGURE_ID_SPLITTER}${figureIdBase}`;
            const image = this.getImage(fig.id);
            if (image) {
              const size = { width: fig.width, height: fig.height };
              this.dispatch("CREATE_IMAGE", {
                sheetId: cmd.sheetIdTo,
                figureId: duplicatedFigureId,
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
    const images = new Set(this.getAllImages().map((image) => image.src));
    for (const src of this.syncedImages) {
      if (!images.has(src)) {
        this.fileStore?.delete(src);
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

  getImageSrc(figureId: UID): string {
    return this.getImage(figureId).src;
  }

  getImageSize(figureId: UID): FigureSize {
    return this.getImage(figureId).size;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private addImage(id: UID, sheetId: UID, position: DOMCoordinates, size: FigureSize) {
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
        this.history.update("images", sheet.id, image.id, image.data);
        this.syncedImages.add(image.data.src);
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

  exportForExcel(data: ExcelWorkbookData) {
    for (const sheet of data.sheets) {
      if (!sheet.images) {
        sheet.images = [];
      }
      const figures = this.getters.getFigures(sheet.id);
      const images: FigureData<Image>[] = [];
      for (const figure of figures) {
        if (figure?.tag === "image") {
          const image = this.getImage(figure.id);
          if (image) {
            images.push({
              ...figure,
              data: deepCopy(image),
            });
          }
        }
      }
      sheet.images = [...sheet.images, ...images];
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
