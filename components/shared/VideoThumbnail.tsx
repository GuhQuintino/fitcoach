import React, { useState, useRef, useEffect } from 'react';

interface VideoThumbnailProps {
    src: string;
    alt?: string;
    className?: string;
}

// Global cache to prevent re-generating thumbnails during session
const thumbnailCache: Record<string, string> = {};

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ src, className }) => {
    const [thumbnail, setThumbnail] = useState<string | null>(thumbnailCache[src] || null);
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Normalize URL
    const videoUrl = src.startsWith('http') || src.startsWith('/') ? src : `/${src}`;

    useEffect(() => {
        if (thumbnail) return; // Already have it

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.disconnect(); // Only need to trigger once
            }
        }, { rootMargin: '200px' }); // Load ahead

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [thumbnail]);

    const handleLoadedData = () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            // Force seek to start just in case
            video.currentTime = 0.1;
        } catch (e) {
            console.error(e);
        }
    };

    const handleSeeked = () => {
        const video = videoRef.current;
        if (!video) return;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // Compress slightly
                thumbnailCache[src] = dataUrl;
                setThumbnail(dataUrl);
            }
        } catch (error) {
            console.error('Error generating thumbnail:', error);
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden ${className}`}
        >
            {thumbnail ? (
                // Generated Thumbnail
                <>
                    <img src={thumbnail} className="w-full h-full object-cover" alt="Thumbnail" />
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <span className="material-symbols-rounded text-white text-xl drop-shadow-md">play_circle</span>
                    </div>
                </>
            ) : isVisible ? (
                // Hidden Video for Capture
                <>
                    {/* Placeholder while generating */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-rounded text-slate-300 animate-pulse">image</span>
                    </div>

                    <video
                        ref={videoRef}
                        src={videoUrl + '#t=0.1'}
                        crossOrigin="anonymous"
                        className="invisible absolute pointer-events-none"
                        muted
                        preload="metadata"
                        width="1"
                        height="1" // Minimize rendering cost
                        onLoadedData={handleLoadedData}
                        onSeeked={handleSeeked}
                        onError={(e) => console.error('Thumb Video Error', e)}
                    />
                </>
            ) : (
                // Initial Placeholder (Off-screen)
                <span className="material-symbols-rounded text-slate-300 transform scale-75">movie</span>
            )}
        </div>
    );
};

export default VideoThumbnail;
