import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Gem, Sparkles } from 'lucide-react';

interface PointRewardOptions {
    amount: number;
    title?: string;
    message?: string;
    fromX?: number;
    fromY?: number;
}

interface PointRewardContextType {
    triggerPointReward: (options: PointRewardOptions) => void;
    playRewardSound: () => void;
}

const PointRewardContext = createContext<PointRewardContextType | undefined>(undefined);

// Sound Synthesizer using Web Audio API (Zero external assets, 100% reliable)
function playHarmonicChime() {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Magical rising gem arpeggio: C6, E6, G6, C7
        const notes = [
            { freq: 1046.50, time: 0.00, dur: 0.35, gain: 0.18 },
            { freq: 1318.51, time: 0.08, dur: 0.35, gain: 0.20 },
            { freq: 1567.98, time: 0.16, dur: 0.35, gain: 0.22 },
            { freq: 2093.00, time: 0.24, dur: 0.55, gain: 0.25 },
        ];

        notes.forEach(({ freq, time, dur, gain }) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);
            osc.detune.setValueAtTime(4, now + time);

            gainNode.gain.setValueAtTime(0, now + time);
            gainNode.gain.linearRampToValueAtTime(gain, now + time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(now + time);
            osc.stop(now + time + dur);
        });

        // High crystal sparkle overtone
        const sparkle = ctx.createOscillator();
        const sparkleGain = ctx.createGain();
        sparkle.type = 'triangle';
        sparkle.frequency.setValueAtTime(3135.96, now + 0.24); // G7
        sparkleGain.gain.setValueAtTime(0, now + 0.24);
        sparkleGain.gain.linearRampToValueAtTime(0.08, now + 0.27);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        sparkle.connect(sparkleGain);
        sparkleGain.connect(ctx.destination);
        sparkle.start(now + 0.24);
        sparkle.stop(now + 0.65);
    } catch (e) {
        console.warn('Audio play failed', e);
    }
}

function playImpactCoinSound() {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1760, now); // A6
        osc.frequency.exponentialRampToValueAtTime(2637, now + 0.08); // E7

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    } catch (e) {
        // Ignore audio failures if browser blocked
    }
}

interface Particle {
    id: number;
    offsetX: number;
    offsetY: number;
    delay: number;
    scale: number;
}

export const PointRewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, refreshUser } = useAuth();

    const [active, setActive] = useState(false);
    const [rewardAmount, setRewardAmount] = useState(0);
    const [rewardTitle, setRewardTitle] = useState('');
    const [phase, setPhase] = useState<'pop' | 'flight' | 'impact' | 'idle'>('idle');

    const [startCoords, setStartCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [targetCoords, setTargetCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [particles, setParticles] = useState<Particle[]>([]);

    const animTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

    const clearTimeouts = () => {
        animTimeoutsRef.current.forEach(t => clearTimeout(t));
        animTimeoutsRef.current = [];
    };

    const triggerPointReward = useCallback((options: PointRewardOptions) => {
        if (!options.amount || options.amount <= 0) return;

        clearTimeouts();

        // 1. Calculate Start Coordinates (Center of viewport or custom fromX/Y)
        const sX = options.fromX ?? (window.innerWidth / 2);
        const sY = options.fromY ?? (window.innerHeight / 2 + 30);
        setStartCoords({ x: sX, y: sY });

        // 2. Set Destination Coordinates to Top Center of viewport
        const tX = window.innerWidth / 2;
        const tY = 36;
        setTargetCoords({ x: tX, y: tY });

        // 3. Generate mini particles constellation
        const parts: Particle[] = Array.from({ length: 6 }).map((_, i) => ({
            id: i,
            offsetX: (Math.random() - 0.5) * 80,
            offsetY: (Math.random() - 0.5) * 60,
            delay: i * 0.05,
            scale: 0.7 + Math.random() * 0.4,
        }));
        setParticles(parts);

        setRewardAmount(options.amount);
        setRewardTitle(options.title || 'Points Received!');
        setActive(true);
        setPhase('pop');

        // Play Initial Celebratory Chime
        playHarmonicChime();

        // Phase 2: Start Flight towards Top Center (at 750ms)
        const t1 = setTimeout(() => {
            setTargetCoords({ x: window.innerWidth / 2, y: 36 });
            setPhase('flight');
        }, 750);

        // Phase 3: Impact at Top Center (at 1650ms)
        const t2 = setTimeout(() => {
            setPhase('impact');
            playImpactCoinSound();

            // Trigger visual pulse on navbar badge
            const targetBadge = document.getElementById('navbar-points-badge') || document.getElementById('navbar-points-badge-mobile');
            if (targetBadge) {
                targetBadge.classList.add('point-pulse-active');
                setTimeout(() => {
                    targetBadge.classList.remove('point-pulse-active');
                }, 900);
            }

            // Sync fresh points into user state
            refreshUser();
        }, 1650);

        // Phase 4: Clean up (at 2400ms)
        const t3 = setTimeout(() => {
            setActive(false);
            setPhase('idle');
        }, 2400);

        animTimeoutsRef.current = [t1, t2, t3];
    }, [refreshUser]);

    // Track user points changes automatically
    useEffect(() => {
        if (!user || user.points === undefined || user.points === null) return;

        const storageKey = `last_seen_points_u${user.id}`;
        const prevPointsStr = localStorage.getItem(storageKey);
        const prevPoints = prevPointsStr !== null ? parseInt(prevPointsStr, 10) : null;

        if (prevPoints !== null && !isNaN(prevPoints) && user.points > prevPoints) {
            const diff = user.points - prevPoints;
            triggerPointReward({
                amount: diff,
                title: `+${diff} Points Received!`,
            });
        }

        localStorage.setItem(storageKey, user.points.toString());
    }, [user?.points, user?.id, triggerPointReward]);

    // Global Event Listener for custom dispatch
    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail?.amount) {
                triggerPointReward({
                    amount: e.detail.amount,
                    title: e.detail.title,
                    fromX: e.detail.fromX,
                    fromY: e.detail.fromY,
                });
            }
        };

        window.addEventListener('trigger-point-reward' as any, handler);
        return () => window.removeEventListener('trigger-point-reward' as any, handler);
    }, [triggerPointReward]);

    useEffect(() => {
        return () => clearTimeouts();
    }, []);

    // Delta travel vector from start to target
    const deltaX = targetCoords.x - startCoords.x;
    const deltaY = targetCoords.y - startCoords.y;

    return (
        <PointRewardContext.Provider value={{ triggerPointReward, playRewardSound: playHarmonicChime }}>
            {children}

            {/* CELEBRATION OVERLAY */}
            {active && (
                <div className="fixed inset-0 pointer-events-none z-[99999] overflow-hidden">
                    {/* Background celebratory subtle golden ambient glow */}
                    <div
                        className={`absolute inset-0 bg-amber-500/5 backdrop-blur-[1px] transition-opacity duration-500 ${
                            phase === 'pop' ? 'opacity-100' : 'opacity-0'
                        }`}
                    />

                    {/* MAIN FLYING DIAMOND PILL */}
                    <div
                        style={{
                            left: `${startCoords.x}px`,
                            top: `${startCoords.y}px`,
                            transform:
                                phase === 'pop'
                                    ? 'translate(-50%, -50%) scale(1)'
                                    : phase === 'flight' || phase === 'impact'
                                    ? `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.65)`
                                    : 'translate(-50%, -50%) scale(0)',
                            opacity: phase === 'impact' ? 0 : 1,
                            transition:
                                phase === 'flight'
                                    ? 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s cubic-bezier(0.8, 0, 1, 1)'
                                    : phase === 'pop'
                                    ? 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s'
                                    : 'opacity 0.2s',
                        }}
                        className="absolute will-change-transform z-20 flex flex-col items-center justify-center pointer-events-none"
                    >
                        {/* Glow halo */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 rounded-full blur-xl opacity-80 animate-pulse" />

                        {/* Celebratory Pill Badge */}
                        <div className="relative flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xl sm:text-2xl shadow-2xl shadow-amber-500/70 border-2 border-white/80 ring-4 ring-amber-400/50">
                            <Gem className="w-7 h-7 sm:w-8 sm:h-8 text-amber-950 fill-amber-950 animate-bounce drop-shadow-md" />
                            <span className="tracking-tight text-amber-950 drop-shadow-xs">
                                +{rewardAmount}
                            </span>
                            <Sparkles className="w-5 h-5 text-amber-900 animate-spin" />
                        </div>

                        {/* Title Caption (Fades out when flight starts) */}
                        <div
                            className={`mt-2 px-3 py-1 bg-slate-900/90 text-amber-300 rounded-full text-xs font-black uppercase tracking-wider border border-amber-500/40 shadow-lg transition-opacity duration-200 ${
                                phase === 'pop' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                            }`}
                        >
                            {rewardTitle}
                        </div>
                    </div>

                    {/* MINI SATELLITE FLYING PARTICLES */}
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            style={{
                                left: `${startCoords.x + p.offsetX}px`,
                                top: `${startCoords.y + p.offsetY}px`,
                                transform:
                                    phase === 'pop'
                                        ? `translate(-50%, -50%) scale(${p.scale})`
                                        : phase === 'flight' || phase === 'impact'
                                        ? `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.2)`
                                        : 'translate(-50%, -50%) scale(0)',
                                opacity: phase === 'impact' ? 0 : 1,
                                transition:
                                    phase === 'flight'
                                        ? `transform ${0.85 + p.delay}s cubic-bezier(0.18, 0.89, 0.32, 1.1), opacity 0.8s ease-in`
                                        : 'transform 0.4s ease-out, opacity 0.3s',
                            }}
                            className="absolute will-change-transform z-10 flex items-center justify-center text-amber-400 pointer-events-none drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                        >
                            <Gem className="w-5 h-5 fill-amber-400 text-amber-300 animate-pulse" />
                        </div>
                    ))}

                    {/* TOP CENTER IMPACT BURST RIPPLE */}
                    {phase === 'impact' && (
                        <div
                            style={{
                                left: `${targetCoords.x}px`,
                                top: `${targetCoords.y}px`,
                            }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center"
                        >
                            {/* Expanding Ring Ripple */}
                            <div className="w-20 h-20 rounded-full border-4 border-amber-400 bg-amber-400/30 animate-ping" />

                            {/* Floating Text at top center: +50 */}
                            <div className="absolute flex items-center gap-1.5 font-black text-sm sm:text-base text-amber-500 bg-amber-50 dark:bg-slate-900 px-4 py-1.5 rounded-full border-2 border-amber-400 shadow-xl shadow-amber-500/30 animate-bounce">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span>+{rewardAmount} 💎</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </PointRewardContext.Provider>
    );
};

export const usePointReward = () => {
    const context = useContext(PointRewardContext);
    if (!context) {
        throw new Error('usePointReward must be used within a PointRewardProvider');
    }
    return context;
};
