<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class PointSetting extends Model
{
    use HasFactory;

    protected $table = 'point_settings';

    protected $fillable = [
        'purchase_points_enabled',
        'purchase_points_type',
        'points_per_course',
        'points_per_100_currency',
        'is_active',
    ];

    protected $casts = [
        'purchase_points_enabled' => 'boolean',
        'points_per_course' => 'integer',
        'points_per_100_currency' => 'integer',
        'is_active' => 'boolean',
    ];

    public static function ensureTableExists(): void
    {
        if (! Schema::hasTable('point_settings')) {
            try {
                Schema::create('point_settings', function (Blueprint $table) {
                    $table->id();
                    $table->boolean('purchase_points_enabled')->default(true);
                    $table->string('purchase_points_type')->default('fixed');
                    $table->integer('points_per_course')->default(50);
                    $table->integer('points_per_100_currency')->default(10);
                    $table->boolean('is_active')->default(true);
                    $table->timestamps();
                });
            } catch (\Throwable $e) {
                // Table already exists or no DDL permissions
            }
        }
    }

    public static function getSettings(): self
    {
        self::ensureTableExists();

        $settings = self::first();
        if (! $settings) {
            $settings = self::create([
                'purchase_points_enabled' => true,
                'purchase_points_type' => 'fixed',
                'points_per_course' => 50,
                'points_per_100_currency' => 10,
                'is_active' => true,
            ]);
        }

        return $settings;
    }
}
