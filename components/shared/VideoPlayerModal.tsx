import React from 'react';

interface VideoPlayerModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    title?: string;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ isOpen, onClose, videoUrl, title }) => {
    if (!isOpen || !videoUrl) return null;

    // Helper to detect type
    const isYoutube = (url: string) => url.includes('youtube.com') || url.includes('youtu.be');

    // Get Embed URL for YouTube
    const getYoutubeEmbedUrl = (url: string) => {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('shorts/')[1].split('?')[0];
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1].split('?')[0];
        }

        // Autoplay param
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-fade-in p-4"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl relative animate-scale-up">

                {/* Header / Close Button */}
                <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
                    <button
                        onClick={onClose}
                        className="bg-black/50 text-white p-2 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                {isYoutube(videoUrl) ? (
                    <div className="relative pt-[56.25%] bg-black">
                        <iframe
                            src={getYoutubeEmbedUrl(videoUrl)}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={title || "Video"}
                        ></iframe>
                    </div>
                ) : (videoUrl.match(/\.mp4($|\?)/i)) ? (
                    <div className="w-full h-auto max-h-[80vh] flex items-center justify-center bg-black">
                        <video
                            src={videoUrl.startsWith('http') || videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="max-w-full max-h-[80vh]"
                            onError={(e) => console.error('Video Error:', e)}
                        />
                    </div>
                ) : (
                    <div className="w-full h-auto max-h-[80vh] flex items-center justify-center bg-black">
                        <img
                            src={videoUrl}
                            alt={title || "Exercise Preview"}
                            className="max-w-full max-h-[80vh] object-contain"
                        />
                    </div>
                )}

                {title && (
                    <div className="p-4 bg-slate-900 border-t border-slate-800">
                        <h3 className="font-bold text-white text-lg">{title}</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPlayerModal;
