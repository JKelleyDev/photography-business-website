import { ImgHTMLAttributes, useState } from 'react';

/** Image that sits on a skeleton tile and fades in once decoded, so frames never pop in. */
export default function FadeImage({ className = '', onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      loading="lazy"
      decoding="async"
      {...props}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={`transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
    />
  );
}
