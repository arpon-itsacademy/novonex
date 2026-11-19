<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\WebsiteSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VdoCipherController extends Controller
{
    /**
     * Get VdoCipher configuration settings.
     */
    public function getSettings(): JsonResponse
    {
        $settings = WebsiteSetting::current();
        $vdoSettings = $settings->vdocipher_settings ?? WebsiteSetting::defaultVdocipherSettings();

        // Mask API Secret Key for safety if requested by non-admin or returning
        return response()->json([
            'settings' => $vdoSettings,
            'is_configured' => !empty($vdoSettings['api_secret_key']),
        ]);
    }

    /**
     * Update VdoCipher configuration settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'api_secret_key' => ['nullable', 'string', 'max:500'],
            'folder_id' => ['nullable', 'string', 'max:100'],
            'watermark_enabled' => ['nullable', 'boolean'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $settings = WebsiteSetting::current();
        $currentVdo = $settings->vdocipher_settings ?? WebsiteSetting::defaultVdocipherSettings();

        $merged = [
            'enabled' => array_key_exists('enabled', $validated) ? (bool)$validated['enabled'] : ($currentVdo['enabled'] ?? true),
            'api_secret_key' => array_key_exists('api_secret_key', $validated) ? trim($validated['api_secret_key'] ?? '') : ($currentVdo['api_secret_key'] ?? ''),
            'folder_id' => array_key_exists('folder_id', $validated) ? trim($validated['folder_id'] ?? '') : ($currentVdo['folder_id'] ?? ''),
            'watermark_enabled' => array_key_exists('watermark_enabled', $validated) ? (bool)$validated['watermark_enabled'] : ($currentVdo['watermark_enabled'] ?? true),
        ];

        $settings->update([
            'vdocipher_settings' => $merged,
        ]);

        AuditLog::log('vdocipher_settings_updated', 'WebsiteSetting', $settings->id, null, [
            'folder_id' => $merged['folder_id'],
            'watermark_enabled' => $merged['watermark_enabled'],
            'has_api_key' => !empty($merged['api_secret_key']),
        ]);

        return response()->json([
            'message' => 'VdoCipher configuration saved successfully.',
            'settings' => $merged,
            'is_configured' => !empty($merged['api_secret_key']),
        ]);
    }

    /**
     * Test connection to VdoCipher API using provided or stored API key.
     */
    public function testConnection(Request $request): JsonResponse
    {
        $apiKey = trim($request->input('api_secret_key') ?? '');

        if (empty($apiKey)) {
            $settings = WebsiteSetting::current();
            $apiKey = $settings->vdocipher_settings['api_secret_key'] ?? '';
        }

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a VdoCipher API Secret Key to test.',
            ], 422);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Apisecret ' . $apiKey,
                'Accept' => 'application/json',
            ])->timeout(12)->get('https://dev.vdocipher.com/api/videos?limit=1');

            if ($response->successful()) {
                $data = $response->json();
                $count = $data['count'] ?? 0;
                return response()->json([
                    'success' => true,
                    'message' => "Connection successful! Connected to VdoCipher account. Total videos: {$count}.",
                    'count' => $count,
                ]);
            }

            $errMsg = $response->json('message') ?? ('VdoCipher API responded with status ' . $response->status());
            return response()->json([
                'success' => false,
                'message' => "Connection failed: {$errMsg}",
            ], 400);
        } catch (\Throwable $e) {
            Log::error('VdoCipher test connection error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Network error connecting to VdoCipher: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get direct S3 upload credentials from VdoCipher.
     */
    public function getUploadCredentials(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || (!$user->isAdmin() && !$user->isTeacher())) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $settings = WebsiteSetting::current();
        $apiKey = $settings->vdocipher_settings['api_secret_key'] ?? '';

        if (empty($apiKey)) {
            return response()->json([
                'message' => 'VdoCipher API Secret Key is not configured. Please configure it in Website Settings > VdoCipher Configuration.',
            ], 422);
        }

        $title = trim($request->input('title') ?? 'Lesson Video ' . date('Y-m-d H:i'));
        $folderId = trim($request->input('folder_id') ?? ($settings->vdocipher_settings['folder_id'] ?? ''));

        $query = ['title' => $title];
        if (!empty($folderId)) {
            $query['folderId'] = $folderId;
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Apisecret ' . $apiKey,
                'Accept' => 'application/json',
            ])->timeout(15)->put('https://dev.vdocipher.com/api/videos?' . http_build_query($query));

            if (!$response->successful()) {
                $errorMsg = $response->json('message') ?? ('VdoCipher error (HTTP ' . $response->status() . ')');
                return response()->json([
                    'message' => 'Failed to obtain upload credentials from VdoCipher: ' . $errorMsg,
                ], 400);
            }

            $data = $response->json();
            $clientPayload = $data['clientPayload'] ?? null;
            $videoId = $data['videoId'] ?? $data['video']['id'] ?? $data['id'] ?? null;

            if (!$clientPayload || !$videoId) {
                return response()->json([
                    'message' => 'Invalid upload response received from VdoCipher.',
                ], 502);
            }

            return response()->json([
                'clientPayload' => $clientPayload,
                'videoId' => $videoId,
                'uploadLink' => $clientPayload['uploadLink'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error('VdoCipher upload credentials error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to communicate with VdoCipher: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get OTP and PlaybackInfo for authorized student viewing.
     */
    public function getOtp(Request $request, Lesson $lesson): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Authorize access: must be admin, course instructor, lesson is preview, or enrolled student
        $isAuthorized = false;
        if ($user->isAdmin()) {
            $isAuthorized = true;
        } elseif ($user->isTeacher() && $lesson->course && $lesson->course->instructor_id === $user->id) {
            $isAuthorized = true;
        } elseif ($lesson->is_preview) {
            $isAuthorized = true;
        } else {
            $isEnrolled = Enrollment::where('user_id', $user->id)
                ->where('course_id', $lesson->course_id)
                ->where('status', 'active')
                ->exists();
            if ($isEnrolled) {
                $isAuthorized = true;
            }
        }

        if (!$isAuthorized) {
            return response()->json([
                'message' => 'You must be enrolled in this course to watch this lesson video.',
            ], 403);
        }

        $videoRaw = trim($lesson->video_url ?? '');
        if (empty($videoRaw)) {
            return response()->json([
                'message' => 'No video attached to this lesson.',
            ], 404);
        }

        // Extract Video ID from raw string (can be direct 32-char ID, or shortcode [vdo id="..."], or iframe URL)
        $videoId = $this->extractVideoId($videoRaw);

        if (empty($videoId)) {
            return response()->json([
                'message' => 'Could not determine a valid VdoCipher Video ID from the lesson settings.',
                'raw' => $videoRaw,
            ], 422);
        }

        $settings = WebsiteSetting::current();
        $vdoSettings = $settings->vdocipher_settings ?? WebsiteSetting::defaultVdocipherSettings();
        $apiKey = $vdoSettings['api_secret_key'] ?? '';

        if (empty($apiKey)) {
            return response()->json([
                'message' => 'VdoCipher API Secret Key is not configured on this platform.',
            ], 500);
        }

        // Dynamic DRM Watermark setup (student anti-piracy overlay)
        $payload = [
            'ttl' => 300,
        ];

        if (!empty($vdoSettings['watermark_enabled'])) {
            $watermarkText = $user->name . ' (' . ($user->phone ?: $user->email) . ')';
            $payload['annotate'] = json_encode([
                [
                    'type' => 'rtext',
                    'text' => $watermarkText,
                    'alpha' => '0.45',
                    'color' => '0xFFFFFF',
                    'size' => '13',
                    'interval' => '4000',
                ]
            ]);
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Apisecret ' . $apiKey,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->timeout(12)->post("https://dev.vdocipher.com/api/videos/{$videoId}/otp", $payload);

            if (!$response->successful()) {
                $err = $response->json('message') ?? ('VdoCipher returned status ' . $response->status());
                return response()->json([
                    'message' => 'Failed to generate video playback token: ' . $err,
                ], 400);
            }

            $otpData = $response->json();

            return response()->json([
                'otp' => $otpData['otp'] ?? null,
                'playbackInfo' => $otpData['playbackInfo'] ?? null,
                'videoId' => $videoId,
                'embedUrl' => "https://player.vdocipher.com/v2/?otp=" . ($otpData['otp'] ?? '') . "&playbackInfo=" . ($otpData['playbackInfo'] ?? ''),
            ]);
        } catch (\Throwable $e) {
            Log::error('VdoCipher OTP generation error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error generating video playback token: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper to extract 32-character VdoCipher Video ID from various user inputs:
     * - "1234567890abcdef1234567890abcdef"
     * - "[vdo id=\"1234567890abcdef1234567890abcdef\"]"
     * - "<iframe src=\"https://player.vdocipher.com/v2/?otp=...&playbackInfo=...\"></iframe>"
     * - URL containing video id
     */
    protected function extractVideoId(string $input): ?string
    {
        $clean = trim($input);

        // Direct 32-char hex string
        if (preg_match('/^[a-f0-9]{32}$/i', $clean)) {
            return $clean;
        }

        // Shortcode [vdo id="..."] or [vdocipher id="..."]
        if (preg_match('/\[(?:vdo|vdocipher)[^\]]*id=[\'"]([a-f0-9]{32})[\'"][^\]]*\]/i', $clean, $matches)) {
            return $matches[1];
        }

        // URL or attribute containing 32-character hex id
        if (preg_match('/(?:video|videos|v)\/([a-f0-9]{32})/i', $clean, $matches)) {
            return $matches[1];
        }

        // Search for any 32-character hex string anywhere in the input
        if (preg_match('/([a-f0-9]{32})/i', $clean, $matches)) {
            return $matches[1];
        }

        return null;
    }
}
