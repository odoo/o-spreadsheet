export async function convertImageToPng(imageUrl: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(image, 0, 0);
      canvas.toBlob(resolve, "image/png");
    });
    image.addEventListener("error", reject);
    image.src = imageUrl;
  });
}
