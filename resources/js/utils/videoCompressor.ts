import {
    Input,
    Output,
    Mp4OutputFormat,
    BufferTarget,
    Conversion,
    ALL_FORMATS,
    BlobSource,
    Quality
} from 'mediabunny';

export interface CompressProgressCallback {
    (percent: number, processedSeconds: number): void;
}

export interface CompressVideoResult {
    file: Blob;
    originalSize: number;
    compressedSize: number;
    savedPercentage: number;
    durationSeconds: number;
    wasCompressed: boolean;
}

export type CompressionPreset = 'target_200mb' | '720p' | '1080p' | 'original';

export const isWebCodecsSupported = (): boolean => {
    return (
        typeof window !== 'undefined' &&
        typeof (window as any).VideoEncoder === 'function' &&
        typeof (window as any).VideoDecoder === 'function'
    );
};

export class VideoCompressionSession {
    private currentConversion: Conversion | null = null;
    private isCanceled = false;

    public async compress(
        file: File,
        preset: CompressionPreset = 'target_200mb',
        onProgress?: CompressProgressCallback
    ): Promise<CompressVideoResult> {
        this.isCanceled = false;
        const originalSize = file.size;

        if (preset === 'original' || !isWebCodecsSupported()) {
            return {
                file,
                originalSize,
                compressedSize: originalSize,
                savedPercentage: 0,
                durationSeconds: 0,
                wasCompressed: false
            };
        }

        const input = new Input({
            source: new BlobSource(file),
            formats: ALL_FORMATS
        });

        // Try getting duration for progress and bitrate calculation
        let duration = 0;
        try {
            duration = (await input.getDurationFromMetadata()) || 0;
        } catch (_) {}

        const output = new Output({
            format: new Mp4OutputFormat(),
            target: new BufferTarget()
        });

        let targetHeight = 720;
        let qualityObj: Quality;

        if (preset === 'target_200mb') {
            targetHeight = 720;
            // Target: under 200 MB (195 MB target with safety buffer)
            const targetBytes = 195 * 1024 * 1024;
            const targetBits = targetBytes * 8;

            let calculatedVideoBitrate = 450_000; // default ~450 kbps if duration unknown (~200MB/hr)
            if (duration && duration > 0) {
                const totalBitrate = targetBits / duration;
                // Reserve 64 kbps for AAC audio
                calculatedVideoBitrate = Math.max(220_000, Math.floor(totalBitrate - 64_000));
                // Cap at 1.8 Mbps if the video is short (e.g. 10 mins) so it doesn't inflate
                calculatedVideoBitrate = Math.min(1_800_000, calculatedVideoBitrate);
            }

            qualityObj = new Quality({
                bitrate: calculatedVideoBitrate,
                bitrateMode: 'variable'
            });
        } else if (preset === '720p') {
            targetHeight = 720;
            qualityObj = new Quality({
                bitrate: 750_000,
                bitrateMode: 'variable'
            });
        } else if (preset === '1080p') {
            targetHeight = 1080;
            qualityObj = new Quality({
                bitrate: 1_500_000,
                bitrateMode: 'variable'
            });
        } else {
            qualityObj = new Quality('medium');
        }

        // Check video track to avoid upscaling
        const videoOptions: any = {
            codec: 'avc',
            quality: qualityObj,
            height: targetHeight,
            frameRate: 30, // 30 fps cap eliminates bloated 60fps files
            fit: 'contain'
        };

        try {
            const videoTrack = await input.getPrimaryVideoTrack();
            if (videoTrack) {
                const origHeight = videoTrack.codedHeight || targetHeight;
                // Only downscale, never upscale
                if (origHeight < targetHeight) {
                    videoOptions.height = origHeight;
                }
            }
        } catch (_) {
            videoOptions.height = targetHeight;
        }

        // Check if there is an audio track
        let audioOptions: any = undefined;
        try {
            const audioTracks = await input.getAudioTracks();
            if (audioTracks && audioTracks.length > 0) {
                audioOptions = {
                    codec: 'aac',
                    quality: new Quality(64_000) // 64 kbps AAC speech-optimized
                };
            }
        } catch (_) {}

        const conversion = await Conversion.init({
            input,
            output,
            video: videoOptions,
            ...(audioOptions ? { audio: audioOptions } : {})
        });

        if (!conversion.isValid) {
            throw new Error('This video format is not supported for browser conversion.');
        }

        this.currentConversion = conversion;

        conversion.onProgress = (pct, processedTime) => {
            if (this.isCanceled) return;
            const cleanPercent = Math.min(100, Math.max(0, Math.round(pct * 100)));
            if (onProgress) {
                onProgress(cleanPercent, processedTime || 0);
            }
        };

        await conversion.execute();

        if (this.isCanceled) {
            throw new Error('Compression was cancelled.');
        }

        const buffer = output.target.buffer;
        if (!buffer || buffer.byteLength === 0) {
            throw new Error('Compression output not found.');
        }

        const compressedBlob = new Blob([buffer], { type: 'video/mp4' });
        const compressedSize = compressedBlob.size;

        // If compression resulted in larger file (e.g. on tiny clips), use original!
        const shouldUseCompressed = compressedSize < originalSize;
        const finalBlob = shouldUseCompressed ? compressedBlob : file;
        const finalSize = shouldUseCompressed ? compressedSize : originalSize;
        const savedPercentage = shouldUseCompressed
            ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
            : 0;

        return {
            file: finalBlob,
            originalSize,
            compressedSize: finalSize,
            savedPercentage,
            durationSeconds: duration,
            wasCompressed: shouldUseCompressed
        };
    }

    public async cancel() {
        this.isCanceled = true;
        if (this.currentConversion) {
            try {
                await this.currentConversion.cancel();
            } catch (_) {}
            this.currentConversion = null;
        }
    }
}

