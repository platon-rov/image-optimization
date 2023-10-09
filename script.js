import { execSync } from "child_process";
import fs from "fs";
import path from "path";

import { stripIndent } from "common-tags";
import sharp from "sharp";

// Image name format: file-name-mq-density.format

const MEDIA_QUERIES = {
  sm: "",
  md: "(min-width: 375px)",
  lg: "(min-width: 768px)",
  xl: "(min-width: 1440px)",
};

function getImages() {
  try {
    return (
      execSync(
        `git ls-files --modified --others --exclude-standard | grep -E '.jpe?g$|.png$'`,
      )
        .toString()
        .split("\n")
        .filter((sourcePath) => sourcePath && fs.existsSync(sourcePath))
        .map((sourcePath) => {
          let [filename, format] = sourcePath.split("/").pop().split(".");
          const filenameArray = filename.split("-");
          const density = filenameArray.pop();
          const possibleMq = filenameArray[filenameArray.length - 1];
          const mq = Object.keys(MEDIA_QUERIES).includes(possibleMq)
            ? filenameArray.pop()
            : "";
          filename = filenameArray.join("-");

          return {
            sourcePath: sourcePath.split("/").slice(0, -1).join("/"),
            filename,
            mq,
            density,
            format,
          };
        })
        // Do not process previously generated 1x images if there any
        .filter(({ density }) => density === "2x")
    );
  } catch (e) {
    console.log(
      "❗️Warning: No new images found. Unstage images to generate variants.",
    );

    return [];
  }
}

function getFilename(image) {
  return `${image.filename}-${image.mq ? image.mq + "-" : ""}${image.density}.${
    image.format
  }`;
}

async function generateOptimizedImageVariants(image) {
  const result = [];

  const { sourcePath, format } = image;
  const optimizationOptions =
    format === "png" ? { palette: true } : { mozjpeg: true };
  const sharpImage = sharp(path.join(sourcePath, getFilename(image)));
  const imageMeta = await sharpImage.metadata();
  const imageBuffer = await sharpImage.toBuffer();

  for (const outputFormat of ["avif", "webp", format]) {
    // Generate 2x
    const outputPath2x = path.join(
      sourcePath,
      getFilename({ ...image, format: outputFormat }),
    );
    const buffer2x = await sharp(imageBuffer)
      .toFormat(outputFormat, optimizationOptions)
      .toBuffer();

    await fs.promises.writeFile(outputPath2x, buffer2x);

    result.push({
      ...image,
      format: outputFormat,
      height: Math.floor(imageMeta.height / 2),
      width: Math.floor(imageMeta.width / 2),
    });

    // Generate 1x
    const outputPath1x = path.join(
      sourcePath,
      getFilename({ ...image, format: outputFormat, density: "1x" }),
    );
    const buffer1x = await sharp(imageBuffer)
      .resize(Math.floor(imageMeta.width / 2), Math.floor(imageMeta.height / 2))
      .toFormat(outputFormat, optimizationOptions)
      .toBuffer();

    await fs.promises.writeFile(outputPath1x, buffer1x);

    result.push({
      ...image,
      format: outputFormat,
      density: "1x",
      height: imageMeta.height,
      width: imageMeta.width,
    });
  }

  return result;
}

const SORTED_MQS = ["xl", "lg", "md", "sm", ""];

const getLargestImageMq = (images) => {
  for (const mq of SORTED_MQS) {
    const image = images.find((image) => image.mq === mq);
    if (image) {
      return mq;
    }
  }

  return "";
};

const generateCode = (
  images,
  fallbackMq = getLargestImageMq(images),
  fallbackDensity = "2x",
) => {
  let fallbackImage = "";
  const fileImports = [];
  const imageSources = [];
  const imagesGroupedByMq = images.reduce((acc, image) => {
    acc[image.mq] ? acc[image.mq].push(image) : (acc[image.mq] = [image]);

    return acc;
  }, {});
  const sortedImagesGroupedByMq = SORTED_MQS.reduce((acc, mq) => {
    if (imagesGroupedByMq[mq]) acc[mq] = imagesGroupedByMq[mq];

    return acc;
  }, {});

  for (const images of Object.values(sortedImagesGroupedByMq)) {
    const importsList = images.map((image) => {
      const { filename, format, density, mq } = image;

      return stripIndent`
          import ${filename.replaceAll("-", "_")}_${
            mq ? mq + "_" : ""
          }${density}_${format} from './${getFilename(image)}'
        `;
    });

    fileImports.push(...importsList);

    const imageList = images.reduce(
      (acc, { filename, format, density, mq, height, width }) => {
        const variableName = `${filename.replaceAll("-", "_")}_${
          mq ? mq + "_" : ""
        }${density}_${format}`;

        if (mq === fallbackMq && density === fallbackDensity) {
          fallbackImage = variableName;
        }

        if (acc[format]) {
          acc[format].srcSet.push(`$\{${variableName}} ${density}`);
        } else {
          acc[format] = {
            media: MEDIA_QUERIES[mq] ?? "",
            srcSet: [`$\{${variableName}} ${density}`],
            type: `image/${format}`,
            height,
            width,
          };
        }

        return acc;
      },
      {},
    );

    imageSources.push(...Object.values(imageList));
  }

  const code = [
    "export const config = [",
    imageSources
      .map(
        ({ media, srcSet, type, width, height }) => stripIndent`
            {
              media: '${media}',
              srcSet: \`${srcSet.join(", ")}\`,
              type: '${type.replace("jpg", "jpeg")}',
              width: ${width},
              height: ${height},
            }
          `,
      )
      .join(",\n"),
    "]",
  ].join("\n");

  const headerCode = stripIndent`
    /* eslint-disable */
    // @generated
    // This file was automatically generated and should not be edited.
  `;
  const fallbackCode = stripIndent`
    export const fallbackImageUrl = ${fallbackImage ?? "''"}
  `;
  const preloadCode = {
    import: "\n\n" + `import { preloadImages } from '../preload-images'`,
    fn: "\n\n" + "preloadImages(config)",
  };

  return (
    headerCode +
    "\n\n" +
    fileImports.join("\n") +
    preloadCode.import +
    "\n\n" +
    code +
    "\n\n" +
    fallbackCode +
    preloadCode.fn
  );
};

async function generate() {
  const originalImages = getImages();
  // Group media query based image variants by folder to generate single index.ts for each folder
  const originalImagesGroupedByFolder = originalImages.reduce((acc, image) => {
    if (acc[image.sourcePath]) {
      acc[image.sourcePath].push(image);
    } else {
      acc[image.sourcePath] = [image];
    }

    return acc;
  }, {});

  for (const [sourcePath, images] of Object.entries(
    originalImagesGroupedByFolder,
  )) {
    const outputImages = await Promise.all(
      images.map((image) => generateOptimizedImageVariants(image)),
    );
    const code = generateCode(outputImages.flat(2));

    await fs.promises.writeFile(`${sourcePath}/index.ts`, code);
  }
}

generate();
