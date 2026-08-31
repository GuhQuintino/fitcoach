import React, { useState } from 'react';

interface VideoThumbnailProps {
    src: string;
    alt?: string;
    className?: string;
}

const VideoThumbnail: React.FC<VideoThumbnailProps> = ({ src, alt = 'Thumbnail de vídeo', className }) => {
    const [hasError, setHasError] = useState(false);

    if (!src) {
        return (
            <div className={`w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 ${className || ''}`}>
                <span className="material-symbols-rounded text-lg sm:text-xl" aria-hidden="true">fitness_center</span>
            </div>
        );
    }

    // Normalize URL for local public assets or remote URLs
    const videoUrl = src.startsWith('http') || src.startsWith('/') ? src : `/${src}`;

    if (hasError) {
        return (
            <div className={`w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 ${className || ''}`}>
                <span className="material-symbols-rounded text-lg sm:text-xl" aria-hidden="true">fitness_center</span>
            </div>
        );
    }

    return (
        <div className={`relative w-full h-full bg-slate-900/10 dark:bg-slate-800 flex items-center justify-center overflow-hidden ${className || ''}`}>
            <video
                src={videoUrl + '#t=0.1'}
                className="w-full h-full object-cover pointer-events-none"
                muted
                playsInline
                preload="metadata"
                onError={() => setHasError(true)}
            />
            {/* Play Icon Overlay */}
            <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
                <span className="material-symbols-rounded text-white text-lg drop-shadow-md" aria-hidden="true">play_circle</span>
            </div>
        </div>
    );
};

export default VideoThumbnail;
