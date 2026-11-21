<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('point_settings')) {
            Schema::table('point_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('point_settings', 'lesson_review_points_enabled')) {
                    $table->boolean('lesson_review_points_enabled')->default(true);
                }
                if (! Schema::hasColumn('point_settings', 'points_per_lesson_review')) {
                    $table->integer('points_per_lesson_review')->default(10);
                }
            });
        }

        if (Schema::hasTable('lesson_reviews')) {
            Schema::table('lesson_reviews', function (Blueprint $table) {
                if (! Schema::hasColumn('lesson_reviews', 'points_awarded')) {
                    $table->integer('points_awarded')->default(0);
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('point_settings')) {
            Schema::table('point_settings', function (Blueprint $table) {
                if (Schema::hasColumn('point_settings', 'lesson_review_points_enabled')) {
                    $table->dropColumn('lesson_review_points_enabled');
                }
                if (Schema::hasColumn('point_settings', 'points_per_lesson_review')) {
                    $table->dropColumn('points_per_lesson_review');
                }
            });
        }

        if (Schema::hasTable('lesson_reviews')) {
            Schema::table('lesson_reviews', function (Blueprint $table) {
                if (Schema::hasColumn('lesson_reviews', 'points_awarded')) {
                    $table->dropColumn('points_awarded');
                }
            });
        }
    }
};
