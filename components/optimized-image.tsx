'use client';

import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  fallback?: string;
  webpSupport?: boolean;
  lazyLoad?: boolean;
  compressionLevel?: 'low' | 'medium' | 'high';
}

// WebP support detection
const supportsWebP = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp', 0.1).indexOf('data:image/webp') === 0;
};

// Generate optimized image URL
const getOptimizedImageUrl = (
  src: string, 
  width: number, 
  quality: number = 75,
  format: string = 'webp'
): string => {
  // If it's already optimized or external URL, return as is
  if (src.startsWith('http') || src.includes('/_next/image')) {
    return src;
  }

  // For local images, use Next.js Image Optimization API
  const params = new URLSearchParams({
    url: src,
    w: width.toString(),
    q: quality.toString(),
  });

  return `/_next/image?${params.toString()}`;
};

// Generate placeholder for better UX
const generatePlaceholder = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Create gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

// Image compression utility
const compressImage = (
  file: File, 
  quality: number = 0.8,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        },
        'image/webp', // Use WebP for better compression
        quality
      );
    };

    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
};

export default function OptimizedImage({
  src,
  alt,
  width = 300,
  height = 200,
  className = '',
  priority = false,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  fill = false,
  style,
  onLoad,
  onError,
  fallback = '/placeholder.svg',
  webpSupport = true,
  lazyLoad = true,
  compressionLevel = 'medium',
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(!lazyLoad);
  const imgRef = useRef<HTMLDivElement>(null);

  // Compression level mapping
  const compressionQuality = {
    low: 90,
    medium: 75,
    high: 60,
  };

  const finalQuality = compressionQuality[compressionLevel] || quality;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoad || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoad, isVisible]);

  // WebP support check
  useEffect(() => {
    if (webpSupport && supportsWebP() && !imageSrc.includes('.webp')) {
      // Try to convert to WebP URL if supported
      const webpSrc = imageSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      
      // Test if WebP version exists
      const testImg = new Image();
      testImg.onload = () => setImageSrc(webpSrc);
      testImg.onerror = () => {
        // Keep original format if WebP version doesn't exist
        logger.debug('WebP version not available, using original format');
      };
      testImg.src = webpSrc;
    }
  }, [src, webpSupport, imageSrc]);

  // Generate blur placeholder if not provided
  const generatedBlurDataURL = blurDataURL || 
    (placeholder === 'blur' ? generatePlaceholder(width, height) : undefined);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
    logger.debug(`Image loaded: ${imageSrc}`);
  };

  const handleError = () => {
    setImageError(true);
    setIsLoading(false);
    
    if (imageSrc !== fallback) {
      setImageSrc(fallback);
      logger.warn(`Image failed to load, using fallback: ${src}`);
    }
    
    onError?.();
  };

  // Don't render anything if lazy loading and not visible
  if (lazyLoad && !isVisible) {
    return (
      <div 
        ref={imgRef}
        className={`${className} bg-gray-200 animate-pulse`}
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height,
          ...style 
        }}
      />
    );
  }

  // Render loading state
  if (isLoading && !imageError) {
    return (
      <div 
        className={`${className} bg-gray-200 animate-pulse flex items-center justify-center`}
        style={{ 
          width: fill ? '100%' : width, 
          height: fill ? '100%' : height,
          ...style 
        }}
      >
        <svg 
          className="w-8 h-8 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  const imageProps = {
    src: imageSrc,
    alt,
    quality: finalQuality,
    priority,
    className,
    style,
    onLoad: handleLoad,
    onError: handleError,
    placeholder: placeholder as any,
    blurDataURL: generatedBlurDataURL,
    sizes: sizes || `(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw`,
  };

  if (fill) {
    return (
      <div ref={imgRef} className="relative">
        <Image
          {...imageProps}
          fill
          sizes={sizes || "100vw"}
        />
      </div>
    );
  }

  return (
    <div ref={imgRef}>
      <Image
        {...imageProps}
        width={width}
        height={height}
      />
    </div>
  );
}

// Image optimization utilities
export const ImageOptimizer = {
  // Compress image file
  compressImage,

  // Generate responsive image sizes
  generateSizes: (breakpoints: { mobile?: number; tablet?: number; desktop?: number }) => {
    const { mobile = 100, tablet = 50, desktop = 33 } = breakpoints;
    return `(max-width: 768px) ${mobile}vw, (max-width: 1200px) ${tablet}vw, ${desktop}vw`;
  },

  // Preload critical images
  preloadImage: (src: string, sizes?: string) => {
    if (typeof window === 'undefined') return;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    
    if (sizes) {
      link.setAttribute('imagesizes', sizes);
    }

    document.head.appendChild(link);
  },

  // Convert image to WebP if supported
  convertToWebP: async (file: File): Promise<Blob> => {
    if (!supportsWebP()) {
      throw new Error('WebP not supported');
    }

    return compressImage(file, 0.8);
  },

  // Get optimal image format
  getOptimalFormat: (): string => {
    if (supportsWebP()) return 'webp';
    return 'jpeg';
  },

  // Calculate image dimensions for responsive design
  calculateDimensions: (
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight?: number
  ) => {
    const aspectRatio = originalWidth / originalHeight;
    let width = Math.min(originalWidth, maxWidth);
    let height = width / aspectRatio;

    if (maxHeight && height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
  },
};

// Hook for image optimization
export function useImageOptimization() {
  const [webpSupported, setWebpSupported] = useState(false);
  const [compressionSupported, setCompressionSupported] = useState(false);

  useEffect(() => {
    setWebpSupported(supportsWebP());
    setCompressionSupported('HTMLCanvasElement' in window);
  }, []);

  return {
    webpSupported,
    compressionSupported,
    preloadImage: ImageOptimizer.preloadImage,
    compressImage: ImageOptimizer.compressImage,
    getOptimalFormat: ImageOptimizer.getOptimalFormat,
    calculateDimensions: ImageOptimizer.calculateDimensions,
  };
}