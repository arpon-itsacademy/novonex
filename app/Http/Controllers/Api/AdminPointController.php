<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PointSetting;
use App\Models\PointTransaction;
use App\Models\RewardNoteSubmission;
use App\Models\User;
use App\Services\PointService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPointController extends Controller
{
    public function getSettings(): JsonResponse
    {
        PointSetting::ensureTableExists();
        PointTransaction::ensureTableExists();
        RewardNoteSubmission::ensureTableExists();

        $settings = PointSetting::getSettings();

        // Calculate summary stats
        $totalPointsAwarded = PointTransaction::where('amount', '>', 0)->sum('amount');
        $totalTransactions = PointTransaction::count();
        $totalApprovedNotes = RewardNoteSubmission::where('status', RewardNoteSubmission::STATUS_APPROVED)->count();
        $totalStudentsWithPoints = User::where('points', '>', 0)->count();

        return response()->json([
            'settings' => $settings,
            'stats' => [
                'total_points_awarded' => (int) $totalPointsAwarded,
                'total_transactions' => (int) $totalTransactions,
                'total_approved_notes' => (int) $totalApprovedNotes,
                'students_with_points' => (int) $totalStudentsWithPoints,
            ],
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        PointSetting::ensureTableExists();

        $validated = $request->validate([
            'purchase_points_enabled' => ['required', 'boolean'],
            'purchase_points_type' => ['required', 'string', 'in:fixed,per_amount'],
            'points_per_course' => ['required', 'integer', 'min:0', 'max:10000'],
            'points_per_100_currency' => ['required', 'integer', 'min:0', 'max:10000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $settings = PointSetting::getSettings();
        $settings->update($validated);

        return response()->json([
            'message' => 'Point settings updated successfully.',
            'settings' => $settings->fresh(),
        ]);
    }

    public function getTransactions(Request $request): JsonResponse
    {
        PointTransaction::ensureTableExists();

        $query = PointTransaction::with(['user:id,name,phone,email,points,registration_number'])
            ->latest('id');

        if ($request->filled('type') && $request->input('type') !== 'all') {
            $query->where('type', $request->input('type'));
        }

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('registration_number', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(10, (int) $request->input('per_page', 20)));
        $transactions = $query->paginate($perPage);

        return response()->json($transactions);
    }

    public function adjustPoints(Request $request, PointService $pointService): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'amount' => ['required', 'integer', 'not_in:0'],
            'description' => ['required', 'string', 'max:255'],
        ]);

        $adminId = auth()->id();
        $transaction = $pointService->adjustUserPoints(
            $validated['user_id'],
            $validated['amount'],
            $validated['description'],
            $adminId
        );

        if (! $transaction) {
            return response()->json(['message' => 'User not found or adjustment failed.'], 422);
        }

        $user = User::find($validated['user_id']);

        return response()->json([
            'message' => 'Points adjusted successfully.',
            'transaction' => $transaction,
            'user_points' => $user?->points ?? 0,
        ]);
    }
}
