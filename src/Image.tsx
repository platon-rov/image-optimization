import React from "react";

export interface ImageSource {
  media?: string;
  srcSet: string;
  type: string;
  width?: number;
  height?: number;
}

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  sources: Array<ImageSource> | null;
  display?: "initial" | "inline" | "block" | "flex";
  imgClassName?: string;
}

const Image = ({
  className,
  imgClassName,
  sources,
  alt,
  loading = "lazy",
  display = "inline",
  src,
  srcSet,
  ...other
}: ImageProps) => {
  /**
   * Workaround for https://github.com/facebook/react/issues/20682
   * To prevent loading images twice in Safari let's add src & srcSet attributes after img element creation
   */
  const refCallback = React.useCallback<React.RefCallback<HTMLImageElement>>(
    (node) => {
      if (!node) {
        return;
      }

      if (src) {
        node.src = src;
      }

      if (srcSet) {
        node.srcset = srcSet;
      }
    },
    [src, srcSet],
  );

  if (!sources) {
    return null;
  }

  return (
    <picture className={className}>
      {sources.map(({ srcSet, ...rest }) => {
        return <source key={srcSet} srcSet={srcSet} {...rest} />;
      })}

      <img
        ref={refCallback}
        alt={alt}
        loading={loading}
        className={imgClassName}
        style={{ display: display }}
        {...other}
      />
    </picture>
  );
};

export { Image };
