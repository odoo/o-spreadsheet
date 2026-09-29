/**
 * The image provider need DOM methods that aren't implemented in JSDOM. This method mock them:
 * - Mocks the load event for images.
 * - Mocks the file picker input.
 */
export function mockJsDomForImageProvider() {
  // jsdom never dispatch a load event when setting the src on an image. Used by imageProvider.getImageOriginalSize
  jest
    .spyOn(HTMLImageElement.prototype, "src", "set")
    .mockImplementation(function (this: HTMLImageElement, src: string) {
      this.width = 200;
      this.height = 100;
      this.dispatchEvent(new Event("load"));
    });

  // no support for file picker in jsdom, mock the click event to get a change event. Used by imageProvider.userImageUpload
  jest
    .spyOn(HTMLInputElement.prototype, "click")
    .mockImplementationOnce(function (this: HTMLInputElement) {
      Object.defineProperty(this, "files", {
        value: [new File(["fake image content"], "ImageFromOs", { type: "image/png" })],
        configurable: true,
      });
      this.dispatchEvent(new Event("change"));
    });
}
