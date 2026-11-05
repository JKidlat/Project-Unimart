/**
 * ==============================================================================
 * RESILIENT IMAGE WITH FALLBACK (ImageWithFallback.tsx)
 * ==============================================================================
 * This component wraps the standard HTML `<img>` tag and provides automatic
 * fallback recovery if an image URL fails to load (HTTP 404, network error, or
 * invalid link).
 *
 * Why this is needed:
 * - User-generated product ads often contain remote image URLs from Unsplash,
 *   Imgur, or mobile uploads that may occasionally fail to load.
 * - Standard browsers display an ugly broken image placeholder icon.
 * - This component catches the `onError` event and gracefully renders a clean,
 *   subtle SVG placeholder graphic instead.
 * ==============================================================================
 */

import React, { useState } from 'react';

// Lightweight Base64-encoded SVG placeholder image
const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  // Track whether the image source failed to load
  const [didError, setDidError] = useState(false);

  // Triggered when browser fails to fetch or decode the image
  const handleError = () => {
    setDidError(true);
  };

  const { src, alt, style, className, ...rest } = props;

  // Render clean placeholder card on error
  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Image unavailable" {...rest} data-original-url={src} />
      </div>
    </div>
  ) : (
    // Render normal image with error listener
    <img src={src} alt={alt} className={className} style={style} {...rest} onError={handleError} />
  );
}
