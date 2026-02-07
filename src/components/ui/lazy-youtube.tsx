import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";

interface LazyYouTubeProps {
  videoId: string;
  title: string;
  isShort?: boolean;
  className?: string;
}

const LazyYouTube = ({ videoId, title, isShort = false, className }: LazyYouTubeProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlay = () => {
    setIsLoaded(true);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-muted/30 cursor-pointer group",
        isShort ? "aspect-[9/16] max-h-[400px] mx-auto" : "aspect-video",
        className
      )}
      onClick={!isLoaded ? handlePlay : undefined}
      role={!isLoaded ? "button" : undefined}
      aria-label={!isLoaded ? `Reproduzir ${title}` : undefined}
    >
      {isLoaded ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <>
          {/* Skeleton placeholder */}
          {!thumbnailLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted/30 via-muted/50 to-muted/30" />
          )}

          {/* Thumbnail */}
          {isInView && (
            <img
              src={thumbnailUrl}
              alt={title}
              loading="lazy"
              decoding="async"
              onLoad={() => setThumbnailLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                thumbnailLoaded ? "opacity-100" : "opacity-0",
                "group-hover:scale-105"
              )}
            />
          )}

          {/* Play button overlay */}
          {thumbnailLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors duration-300">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LazyYouTube;
