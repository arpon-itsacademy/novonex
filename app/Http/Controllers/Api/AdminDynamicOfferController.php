<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Course;
use App\Models\DynamicOffer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminDynamicOfferController extends Controller
{
    /**
     * List all dynamic offers with statistics.
     */
    public function index(Request $request): JsonResponse
    {
        if (!Schema::hasTable('dynamic_offers')) {
            return response()->json([
                'offers' => [
                    'data' => [],
                    'total' => 0,
                    'current_page' => 1,
                    'last_page' => 1,
                ],
                'stats' => [
                    'total_offers' => 0,
                    'active_offers' => 0,
                    'global_offers' => 0,
                ],
            ]);
        }

        $query = DynamicOffer::query()->latest('id');

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('banner_text', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        if ($request->filled('scope_type')) {
            $query->where('scope_type', $request->scope_type);
        }

        $offers = $query->paginate($request->integer('per_page', 15));

        $stats = [
            'total_offers' => DynamicOffer::count(),
            'active_offers' => DynamicOffer::where('is_active', true)->count(),
            'global_offers' => DynamicOffer::where('scope_type', 'all')->count(),
        ];

        return response()->json([
            'offers' => $offers,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a newly created dynamic offer.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'banner_text' => ['nullable', 'string', 'max:500'],
            'scope_type' => ['required', 'in:all,category,course'],
            'applicable_categories' => ['nullable', 'array'],
            'applicable_categories.*' => ['integer'],
            'applicable_courses' => ['nullable', 'array'],
            'applicable_courses.*' => ['integer'],
            'tiers' => ['required', 'array', 'min:1'],
            'tiers.*.min_qty' => ['required', 'integer', 'min:1'],
            'tiers.*.discount_type' => ['required', 'in:percentage,fixed'],
            'tiers.*.discount_value' => ['required', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active' => ['boolean'],
            'priority' => ['nullable', 'integer'],
        ]);

        $validated['created_by'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['priority'] = $validated['priority'] ?? 0;

        $offer = DynamicOffer::create($validated);

        AuditLog::log('dynamic_offer_created', 'DynamicOffer', $offer->id, null, [
            'title' => $offer->title,
            'scope_type' => $offer->scope_type,
            'tiers_count' => count($offer->tiers ?? []),
        ]);

        return response()->json([
            'message' => 'Dynamic offer created successfully.',
            'offer' => $offer,
        ], 201);
    }

    /**
     * Display the specified dynamic offer.
     */
    public function show(int $id): JsonResponse
    {
        $offer = DynamicOffer::findOrFail($id);

        return response()->json([
            'offer' => $offer,
        ]);
    }

    /**
     * Update the specified dynamic offer.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $offer = DynamicOffer::findOrFail($id);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'banner_text' => ['nullable', 'string', 'max:500'],
            'scope_type' => ['required', 'in:all,category,course'],
            'applicable_categories' => ['nullable', 'array'],
            'applicable_categories.*' => ['integer'],
            'applicable_courses' => ['nullable', 'array'],
            'applicable_courses.*' => ['integer'],
            'tiers' => ['required', 'array', 'min:1'],
            'tiers.*.min_qty' => ['required', 'integer', 'min:1'],
            'tiers.*.discount_type' => ['required', 'in:percentage,fixed'],
            'tiers.*.discount_value' => ['required', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active' => ['boolean'],
            'priority' => ['nullable', 'integer'],
        ]);

        $offer->update($validated);

        AuditLog::log('dynamic_offer_updated', 'DynamicOffer', $offer->id, null, [
            'title' => $offer->title,
            'scope_type' => $offer->scope_type,
        ]);

        return response()->json([
            'message' => 'Dynamic offer updated successfully.',
            'offer' => $offer->fresh(),
        ]);
    }

    /**
     * Remove the specified dynamic offer.
     */
    public function destroy(int $id): JsonResponse
    {
        $offer = DynamicOffer::findOrFail($id);
        $title = $offer->title;
        $offer->delete();

        AuditLog::log('dynamic_offer_deleted', 'DynamicOffer', $id, null, ['title' => $title]);

        return response()->json([
            'message' => 'Dynamic offer deleted successfully.',
        ]);
    }

    /**
     * Toggle active/inactive status.
     */
    public function toggleStatus(int $id): JsonResponse
    {
        $offer = DynamicOffer::findOrFail($id);
        $offer->is_active = !$offer->is_active;
        $offer->save();

        AuditLog::log('dynamic_offer_status_toggled', 'DynamicOffer', $offer->id, null, [
            'is_active' => $offer->is_active,
        ]);

        return response()->json([
            'message' => $offer->is_active ? 'Dynamic offer activated.' : 'Dynamic offer deactivated.',
            'offer' => $offer,
        ]);
    }

    /**
     * Fetch all published courses and categories for multi-select pickers in modal.
     */
    public function getCoursesAndCategories(): JsonResponse
    {
        $courses = Course::select(['id', 'title', 'price', 'sale_price', 'category_id'])
            ->where('status', Course::STATUS_PUBLISHED)
            ->latest('id')
            ->get();

        $categories = Category::select(['id', 'name', 'slug'])
            ->withCount('courses')
            ->get();

        return response()->json([
            'courses' => $courses,
            'categories' => $categories,
        ]);
    }
}
