import React, { useState, useEffect } from 'react';
import { apiClient, getImageUrl } from '../../api/client';
import {
    Sparkles,
    CheckCircle2,
    Award,
    X,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    MessageSquareQuote
} from 'lucide-react';

interface ReviewItem {
    id: number | string;
    url: string;
    title?: string;
}

// Fallback items from uploaded media library
const DEFAULT_MEDIA_FILES: string[] = [
    'Dvf93tePcSijBdHF40XsNEz7NJyrjTwa4b9IWe4U.jpg',
    '2ilyybrdxRCRlPbt3MmmB1Sh8lU9AtqdRDNuVUHW.png',
    '4UmfhyGw1sj3ZVwvF9rkb30CcNCV1UtPpMo0sKGW.jpg',
    'EL8TVLqrMJ89kcmFr7GlKfLsRlrrzblLWKaCLsN5.jpg',
    'PPPG6tTHhd5vCH3wfdnsgZOKRM4LkCW5ozfiU6bi.jpg',
    'ODS6ANECxTOwCKIaERyYpa8lnmLp2EGoWdWOBKuO.jpg',
    'skWSTpZEpGJHY9eCUniUlxKeyU43qHvWl7JBBeAZ.jpg',
    'MNLrK2o5A58IAwdcAEz8j47ua2lpxMWqzuz3VIRn.jpg',
    'mbGCDMxphmWoPMAfUvCS0cPTdZeGPpIYh7cdx9m7.jpg',
    'vBQjKQOLWQWwdaqfSr023T7hHwOTTkYFjyFeDJhD.webp',
    'EuXBw1PwXkBh1lCTlQELz0P5GiQmixfWuGzie9Z1.jpg',
    'xvh6magzlWJrFcorpiGwV8AarUo8MlxsEhTUIfyg.jpg',
    'hbyBW1UxFgAYUsXJvOk5wqb9lMcIM7rlHuj0HvB3.jpg',
    'YOYfudQJw5V9SGDNEBXfbkw1ZgDJkZRWBtRMO2rO.jpg',
    'TybfpRohuU2RDZfyvecMseWCm1S6KiFSuuaUkhdT.jpg',
    'mqvJxX8ioUHejqiGGbYJP5QD8dgWdxsLnGsByCFT.jpg',
    'ac592Zz1cy1mg2CwHcQgpu4WYlTZ4T52ys9AxOYB.jpg',
    'odkbP92BZbNwyCDPAmvX4kik5w0Qr21NaMEcmX1r.jpg',
    'v7G85vfdx9I1nNKf2B84u3rFlg7PPA07XEGAJNSf.jpg',
    'IQMKuQQuylahu1luFE1gpDqmUlLdv5p9pIZFcQfV.jpg',
    'Ftr6fWQ4rTuWYMtPeSpEB2tAoOwp9x9Vy9R9vhqR.jpg',
    'sd3pZtDXOPidWHQQOoHC6vAsi7bdtw2S5EobOgHG.jpg',
    'x2jSZJyVRX3uIsXG4o0cK3Lb9Of8smGWuz65tguv.png',
    'Xcq0pGWrtES7yMRISv26aorb8t3QwxBg4SVV7ijF.jpg',
    'ftixuMACT0pcQcMlRz9sClJh0ZVWI6A15BLZf8Jm.jpg',
    'ovcSCZKWnILdR75Cj1j4zmriUogXoUK8sstKec4t.jpg',
    'swX0NlfXGZsREg0NCPxyN9ZZK68FYHfsBHXkHQnF.jpg',
    'BUVBAh4HSoiAnd3kXJ7amRtEvGksVDLcxmyszRWQ.jpg',
    'jxzi7lY7DkZrbTG4vbHwL3WKPUkvR51TpM2XkcQ5.jpg',
    'dfwgVqmGLcfXZiKfqNMda9AdqsG4WS1EoRQjlucK.jpg',
    'z4IaCXiY2tfjoPiLKzl359dJpmMSHbuIuraTHIQW.jpg',
    '9MbBCTpqrtmACIveX0xGhagoj0DI9grlO6t7YWxQ.jpg',
    'cF8W4phayJSdniEBZ6KQl9BB1d1HgQfgpdJyUj1B.jpg',
    'Rwx5T1qVHEp7I8FUhfUq10OkcxsX3uk9HUYGbrBy.jpg',
    'I9IZFMmNEIMXalyYoDD2ZASLYX0nHDCgeINXxyps.png',
    'd1R7oMGxQ1zop3bN4Pc9HCcZnQtoREbfZ0FF4l8s.jpg',
    'ZSGv2ScXAlEmegcHQqjkziWzieUZ8myXFmb7ctml.jpg',
    'e0aL4hf8HfzapahkpH8R3EDnDfZcfdUDm9nH8lpa.jpg',
    'pPVab8pTUmsypPhvLQ6GscabhFCGQdwG6vdVxeip.jpg',
    'KYeCSL2yzSPEymK9IN2Es125rsUg5LBRUfTzaQXk.jpg',
    'ZHlHXfoCPIeCfCruhF1l2YVE08MhT2nf2GrE9uzK.jpg',
    'PUCnyKXcKTfOBbBbKGM58kfKNWVGlQWK0V1brKZx.jpg',
    'XTBtoAeg5jcMJq3wtzt53a6mcSIcmKWPs7vjkAfG.jpg',
    'zdLPOlUZumkLOYZPysfUUP5KL4vXhwPYjjAs3LPV.jpg',
    'RD8vFy4NHrQ2FLVCOgAhCaUPy12jJvYMsfGxnFqn.png',
    'Fx8TBmXUMLnyJaP8hlzUcQvabRfzh7GAQW5Xftv7.jpg',
    '7gIffdItOscO9CVc6BQIMsUk1C0n9kukfvciKPGl.jpg',
    'ZaVB6WkP1yQLVRfS24LzmaLB7G6xHIoVt839Ajya.jpg',
    'x1PfQI4ivaXqcR4ZBQdGYAeFwKYnm7kKlaY9JFZ8.jpg',
    'gKjbQSp7VZaVKD5wQuZdfTpypjgXKeWJr5yIAtJi.jpg',
    'pmZQtkzTENMlusDl92m7QjEkZbCzXFoaBBtpGYGw.jpg',
    'iWiZEQ9f6L4bv9lRzBHHXTKUK3tL8ukiccHTDVaZ.jpg',
];

export const StudentReviewsMarquee: React.FC = () => {
    const [reviews, setReviews] = useState<ReviewItem[]>(() =>
        DEFAULT_MEDIA_FILES.map((fileName, idx) => ({
            id: `init_${idx}`,
            url: `/storage/media/${fileName}`,
            title: `Student Review ${idx + 1}`,
        }))
    );

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;
        apiClient
            .get('/testimonials/marquee')
            .then(({ data }) => {
                if (isMounted && data && Array.isArray(data.reviews) && data.reviews.length > 0) {
                    setReviews(data.reviews);
                }
            })
            .catch(() => {
                // Keep initial fallback on network error
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Split items into 2 rows for dual-direction marquee
    const half = Math.ceil(reviews.length / 2);
    const row1 = reviews.slice(0, half);
    const row2 = reviews.slice(half);

    // Duplicate arrays once to ensure seamless infinite loop
    const row1Duplicated = [...row1, ...row1];
    const row2Duplicated = [...row2, ...row2];

    // Lightbox keyboard controls
    useEffect(() => {
        if (lightboxIndex === null) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxIndex(null);
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : reviews.length - 1));
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev !== null && prev < reviews.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, reviews.length]);

    const activePreview = lightboxIndex !== null ? reviews[lightboxIndex] : null;

    return (
        <section className="relative py-16 sm:py-24 bg-slate-950 text-white overflow-hidden border-y border-slate-800/80">
            {/* Background Radial Glow */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#25a2ee]/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Edge Fade Gradients for Seamless Look */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-36 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-36 bg-gradient-to-l from-slate-950 via-slate-950/80 to-transparent z-10" />

            {/* Section Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 mb-12 sm:mb-16 relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/15 to-sky-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold shadow-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Real Feedback & Success Stories</span>
                </div>

                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                    Loved by Thousands of Learners <br className="hidden sm:inline" />
                    <span className="bg-gradient-to-r from-[#25a2ee] via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                        Across Bangladesh
                    </span>
                </h2>

                <p className="text-xs sm:text-sm lg:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Swipe through genuine screenshots and student reviews from our academic, admission, and skill batches.
                </p>
            </div>

            {/* Marquee Group */}
            <div className="space-y-6 sm:space-y-8 marquee-group">
                {/* Row 1: Scrolling Right-to-Left */}
                <div className="space-y-2.5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Academic & Admission Feedback</span>
                        </div>
                        <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
                            Hover to pause • Click to zoom
                        </span>
                    </div>

                    <div className="overflow-hidden py-1">
                        <div className="animate-marquee-left flex gap-4 sm:gap-6">
                            {row1Duplicated.map((item, idx) => {
                                const realIdx = idx % row1.length;
                                return (
                                    <div
                                        key={`r1_${item.id}_${idx}`}
                                        onClick={() => setLightboxIndex(realIdx)}
                                        className="group relative w-[260px] sm:w-[330px] h-[175px] sm:h-[210px] rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-[#25a2ee]/60 p-2.5 sm:p-3 shadow-md hover:shadow-2xl hover:shadow-[#25a2ee]/15 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer shrink-0 flex flex-col justify-between overflow-hidden"
                                    >
                                        <div className="relative w-full flex-1 rounded-xl sm:rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center p-1">
                                            <img
                                                src={getImageUrl(item.url)}
                                                alt={item.title || 'Student Review'}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 rounded-lg"
                                                loading="lazy"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = 'https://placehold.co/600x400/0f172a/38bdf8?text=Review+Screenshot';
                                                }}
                                            />

                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-2xs">
                                                <Maximize2 className="w-4 h-4 text-[#25a2ee]" />
                                                <span>Click to Zoom</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1 font-semibold text-emerald-400">
                                                <CheckCircle2 className="w-3 h-3" />
                                                <span>Verified Student</span>
                                            </span>
                                            <span className="text-[10px] text-slate-500">NovoNex Community</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Row 2: Scrolling Left-to-Right */}
                <div className="space-y-2.5 pt-2">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
                            <Award className="w-3.5 h-3.5" />
                            <span>Exam Ranks & Placement Stories</span>
                        </div>
                        <span className="text-[11px] text-slate-500 hidden sm:inline font-medium">
                            Hover to pause • Click to zoom
                        </span>
                    </div>

                    <div className="overflow-hidden py-1">
                        <div className="animate-marquee-right flex gap-4 sm:gap-6">
                            {row2Duplicated.map((item, idx) => {
                                const realIdx = half + (idx % row2.length);
                                return (
                                    <div
                                        key={`r2_${item.id}_${idx}`}
                                        onClick={() => setLightboxIndex(realIdx)}
                                        className="group relative w-[260px] sm:w-[330px] h-[175px] sm:h-[210px] rounded-2xl sm:rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 p-2.5 sm:p-3 shadow-md hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer shrink-0 flex flex-col justify-between overflow-hidden"
                                    >
                                        <div className="relative w-full flex-1 rounded-xl sm:rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center p-1">
                                            <img
                                                src={getImageUrl(item.url)}
                                                alt={item.title || 'Student Review'}
                                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 rounded-lg"
                                                loading="lazy"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.src = 'https://placehold.co/600x400/0f172a/10b981?text=Review+Screenshot';
                                                }}
                                            />

                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-2xs">
                                                <Maximize2 className="w-4 h-4 text-emerald-400" />
                                                <span>Click to Zoom</span>
                                            </div>
                                        </div>

                                        <div className="pt-2 px-1 flex items-center justify-between text-[11px] text-slate-400">
                                            <span className="flex items-center gap-1 font-semibold text-sky-400">
                                                <Award className="w-3 h-3" />
                                                <span>Top Performance</span>
                                            </span>
                                            <span className="text-[10px] text-slate-500">Live Feedback</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Preview Modal */}
            {activePreview && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
                    onClick={() => setLightboxIndex(null)}
                >
                    <div
                        className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top Bar */}
                        <div className="w-full flex items-center justify-between text-white pb-3 px-1">
                            <div className="flex items-center gap-2">
                                <MessageSquareQuote className="w-5 h-5 text-[#25a2ee]" />
                                <span className="text-xs sm:text-sm font-bold">
                                    Student Review ({(lightboxIndex ?? 0) + 1} of {reviews.length})
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLightboxIndex(null)}
                                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shadow-md"
                                title="Close (Esc)"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image Viewer */}
                        <div className="relative w-full max-h-[78vh] flex items-center justify-center bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 overflow-hidden shadow-2xl p-2 sm:p-4">
                            <img
                                src={getImageUrl(activePreview.url)}
                                alt={activePreview.title || 'Student Review Fullscreen'}
                                className="max-w-full max-h-[74vh] object-contain rounded-xl drop-shadow-xl"
                            />

                            {/* Previous Button */}
                            <button
                                type="button"
                                onClick={() =>
                                    setLightboxIndex((prev) =>
                                        prev !== null && prev > 0 ? prev - 1 : reviews.length - 1
                                    )
                                }
                                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-[#25a2ee] text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-lg"
                                title="Previous"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            {/* Next Button */}
                            <button
                                type="button"
                                onClick={() =>
                                    setLightboxIndex((prev) =>
                                        prev !== null && prev < reviews.length - 1 ? prev + 1 : 0
                                    )
                                }
                                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 hover:bg-[#25a2ee] text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/20 shadow-lg"
                                title="Next"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Bottom Help Text */}
                        <div className="pt-3 text-center text-xs text-slate-400">
                            Use arrow keys or buttons to navigate • Press Esc to close
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
