type ImagesConfig = {
  media: string;
  srcSet: string;
  type: string;
}[];

const AVIF_IMAGE_IN_BASE64 =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";

let avifDetectionPromise: Promise<boolean> | null = null;

export const createImage = (
  src: string,
  srcSet: string = "",
): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!window) {
      resolve(false);

      return;
    }

    const image = new Image();

    image.onload = image.onerror = () => {
      resolve(Boolean(image.height));
    };

    image.src = src;
    image.srcset = srcSet;
  });
};

const isAvifSupported = () => {
  if (!avifDetectionPromise) {
    avifDetectionPromise = createImage(AVIF_IMAGE_IN_BASE64);
  }

  return avifDetectionPromise;
};

const getSrcSet = (
  config: ImagesConfig,
  mediaTypes: string[],
): string | undefined => {
  for (const mediaType of mediaTypes) {
    const srcSet = config.find(
      ({ media, type }) =>
        type === mediaType && window.matchMedia(media).matches,
    )?.srcSet;

    if (srcSet) {
      return srcSet;
    }
  }

  return;
};

export const preloadImages = async (config: ImagesConfig) => {
  if (!window) {
    return;
  }

  let srcSet;

  try {
    const isAvif = await isAvifSupported();
    srcSet = getSrcSet(
      config,
      isAvif ? ["image/avif", "image/webp"] : ["image/webp"],
    );
  } catch (error) {
    return;
  }

  if (!srcSet) {
    return;
  }

  createImage("", srcSet);
};
