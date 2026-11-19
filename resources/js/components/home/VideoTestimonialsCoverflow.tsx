import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../../api/client';
import {
    Play,
    ChevronLeft,
    ChevronRight,
    X,
    Sparkles,
    Video,
    User
} from 'lucide-react';

export interface VideoTestimonialItem {
    id: string;
    name: string;
    role?: string;
    videoUrl: string;
    thumbnailUrl?: string;
}

export interface VideoTestimonialsProps {
    settings?: {
        sectionTag?: string;
        sectionTitle?: string;
        sectionSub?: string;
        items?: VideoTestimonialItem[];
    };
    isBuilder?: boolean;
}

export const getYouTubeVideoId = (url?: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }
    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) return liveMatch[1];
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];
    const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    return null;
};

const DEFAULT_ITEMS: VideoTestimonialItem[] = [
    {
        id: '1',
        name: 'Farhan Islam',
        role: 'Student & Guardian',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: '',
    },
    {
        id: '2',
        name: 'Sadia Afrin',
        role: 'Varsity Admission Achiever',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnailUrl: '',
    },
];

export const VideoTestimonialsCoverflow: React.FC<VideoTestimonialsProps> = ({
    settings,
    isBuilder = false,
}) => {
    const sectionTag = settings?.sectionTag ?? 'Student Stories & Video Reviews';
    const sectionTitle = settings?.sectionTitle ?? 'What Our Students Say';
    const sectionSub = settings?.sectionSub ?? 'Real journeys, genuine experiences, and success stories shared on camera.';

    const rawItems = settings?.items;
    const items: VideoTestimonialItem[] = (Array.isArray(rawItems) && rawItems.length > 0)
        ? rawItems
        : DEFAULT_ITEMS;

    const [activeIndex, setActiveIndex] = useState(0);
    const [popupVideoId, setPopupVideoId] = useState<string | null>(null);

    // Keep activeIndex within bounds if items change
    useEffect(() => {
        if (activeIndex >= items.length) {
            setActiveIndex(Math.max(0, items.length - 1));
        }
    }, [items.length]);

    // Keyboard navigation and ESC modal close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (popupVideoId) {
                if (e.key === 'Escape') setPopupVideoId(null);
                return;
            }
            if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [popupVideoId, items.length]);

    const handlePrev = () => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    };

    const handleNext = () => {
        setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    };

    const activeItem = items[activeIndex] || items[0];

    const handlePlayItem = (item: VideoTestimonialItem) => {
        const videoId = getYouTubeVideoId(item.videoUrl);
        if (videoId) {
            setPopupVideoId(videoId);
        } else if (item.videoUrl) {
            window.open(item.videoUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Helper to calculate effective thumbnail
    const getItemThumbnail = (item: VideoTestimonialItem): string => {
        if (item.thumbnailUrl && item.thumbnailUrl.trim()) {
            return getImageUrl(item.thumbnailUrl.trim());
        }
        const videoId = getYouTubeVideoId(item.videoUrl);
        if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
        return 'https://placehold.co/640x360/0f172a/38bdf8?text=Video+Testimonial';
    };

    // Touch swipe support
    const touchStartX = useRef<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX.current - touchEndX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) handleNext();
            else handlePrev();
        }
        touchStartX.current = null;
    };

    return (
        <section className="relative py-16 sm:py-24 bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-white overflow-hidden transition-colors duration-150 border-b border-slate-200 dark:border-slate-800">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-sky-500/10 dark:bg-sky-500/15 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[250px] bg-[#CC1200]/5 dark:bg-[#CC1200]/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 space-y-3">
                    {sectionTag && (
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-[#CC1200] dark:text-rose-400 text-xs font-bold uppercase tracking-wider shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{sectionTag}</span>
                        </div>
                    )}

                    {sectionTitle && (
                        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                            <span className="text-[#CC1200]">{sectionTitle}</span>
                        </h2>
                    )}

                    {sectionSub && (
                        <p className="text-xs sm:text-sm lg:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            {sectionSub}
                        </p>
                    )}
                </div>

                {/* Coverflow Stage */}
                <div
                    className="relative w-full py-4 flex flex-col items-center justify-center select-none"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Navigation Buttons (Left & Right) */}
                    {items.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={handlePrev}
                                aria-label="Previous Video"
                                className="absolute left-2 sm:left-6 md:left-12 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>

                            <button
                                type="button"
                                onClick={handleNext}
                                aria-label="Next Video"
                                className="absolute right-2 sm:right-6 md:right-12 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-slate-800 hover:text-sky-600 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </>
                    )}

                    {/* Cards Visual Layer (3D perspective container) */}
                    <div className="relative w-full max-w-5xl h-[240px] sm:h-[340px] md:h-[400px] flex items-center justify-center overflow-visible">
                        {items.map((item, idx) => {
                            const total = items.length;
                            // Calculate signed distance from active index
                            let diff = idx - activeIndex;
                            if (total > 2) {
                                if (diff > total / 2) diff -= total;
                                if (diff < -total / 2) diff += total;
                            }

                            const isActive = diff === 0;
                            const isImmediateLeft = diff === -1 || (total === 2 && !isActive && activeIndex === 1);
                            const isImmediateRight = diff === 1 || (total === 2 && !isActive && activeIndex === 0);
                            const isFar = Math.abs(diff) > 1 && !(total === 2);

                            // Determine transform classes based on distance
                            let transformStyle: React.CSSProperties = {
                                transition: 'all 500ms cubic-bezier(0.25, 1, 0.5, 1)',
                            };

                            let cardClasses = 'absolute aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl cursor-pointer border ';

                            if (isActive) {
                                transformStyle = {
                                    ...transformStyle,
                                    transform: 'translateX(0%) scale(1)',
                                    zIndex: 25,
                                    opacity: 1,
                                    width: 'min(90vw, 560px)',
                                };
                                cardClasses += 'border-slate-800/80 shadow-2xl ring-4 ring-sky-500/20';
                            } else if (isImmediateLeft) {
                                transformStyle = {
                                    ...transformStyle,
                                    transform: 'translateX(-55%) sm:translateX(-58%) md:translateX(-62%) scale(0.82)',
                                    zIndex: 15,
                                    opacity: 0.7,
                                    width: 'min(90vw, 560px)',
                                    filter: 'brightness(0.65)',
                                };
                                cardClasses += 'border-slate-800/40 hover:opacity-90';
                            } else if (isImmediateRight) {
                                transformStyle = {
                                    ...transformStyle,
                                    transform: 'translateX(55%) sm:translateX(58%) md:translateX(62%) scale(0.82)',
                                    zIndex: 15,
                                    opacity: 0.7,
                                    width: 'min(90vw, 560px)',
                                    filter: 'brightness(0.65)',
                                };
                                cardClasses += 'border-slate-800/40 hover:opacity-90';
                            } else {
                                transformStyle = {
                                    ...transformStyle,
                                    transform: `translateX(${diff > 0 ? '110%' : '-110%'}) scale(0.65)`,
                                    zIndex: 5,
                                    opacity: 0.2,
                                    width: 'min(90vw, 560px)',
                                    pointerEvents: 'none',
                                };
                                cardClasses += 'border-transparent hidden sm:block';
                            }

                            const thumb = getItemThumbnail(item);

                            return (
                                <div
                                    key={item.id || idx}
                                    style={transformStyle}
                                    className={cardClasses}
                                    onClick={() => {
                                        if (isActive) {
                                            handlePlayItem(item);
                                        } else {
                                            setActiveIndex(idx);
                                        }
                                    }}
                                >
                                    {/* Video Thumbnail Image */}
                                    <img
                                        src={thumb}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = 'https://placehold.co/640x360/0f172a/38bdf8?text=Video+Review';
                                        }}
                                    />

                                    {/* Dark Gradient Overlay for Readability */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

                                    {/* Central Play Button (Only prominent on active card) */}
                                    {isActive ? (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="group/play w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/90 text-white flex items-center justify-center shadow-2xl hover:scale-115 hover:bg-sky-500 hover:border-sky-400 transition-all duration-300">
                                                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white text-white ml-1 group-hover/play:scale-110 transition-transform" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xs border border-white/50 text-white flex items-center justify-center">
                                                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Vertical text banner on inactive flankers (matching Bondi/AFS style) */}
                                    {!isActive && (
                                        <div className="absolute inset-y-0 inset-x-0 flex items-center justify-center p-2 pointer-events-none">
                                            <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide uppercase line-clamp-1 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                                                {item.name}
                                            </span>
                                        </div>
                                    )}

                                    {/* Bottom Captions on Active Card */}
                                    {isActive && (
                                        <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 text-left bg-gradient-to-t from-black/95 via-black/80 to-transparent">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-400 flex items-center justify-center shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-white font-extrabold text-sm sm:text-lg line-clamp-1">
                                                        {item.name}
                                                    </h3>
                                                    {item.role && (
                                                        <p className="text-slate-300 text-xs sm:text-sm line-clamp-1 font-medium">
                                                            {item.role}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination Indicator Dots */}
                    {items.length > 1 && (
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-6 sm:mt-8">
                            {items.map((_, dotIdx) => (
                                <button
                                    key={dotIdx}
                                    type="button"
                                    onClick={() => setActiveIndex(dotIdx)}
                                    aria-label={`Go to slide ${dotIdx + 1}`}
                                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                                        dotIdx === activeIndex
                                            ? 'w-6 sm:w-8 h-2 bg-sky-500 shadow-md shadow-sky-500/40'
                                            : 'w-2 h-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Video Lightbox Popup Modal */}
            {popupVideoId && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
                    onClick={() => setPopupVideoId(null)}
                >
                    <div
                        className="relative max-w-4xl w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={() => setPopupVideoId(null)}
                            aria-label="Close Video"
                            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer border border-white/20"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* YouTube Embed Iframe */}
                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube-nocookie.com/embed/${popupVideoId}?autoplay=1&rel=0&modestbranding=1`}
                            title="YouTube video testimonial"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                </div>
            )}
        </section>
    );
};
