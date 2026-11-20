import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
    Award,
    Sparkles,
    TrendingUp,
    FileText,
    Users,
    Settings,
    Search,
    Plus,
    Minus,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Filter
} from 'lucide-react';

interface PointSettings {
    id?: number;
    purchase_points_enabled: boolean;
    purchase_points_type: 'fixed' | 'per_amount';
    points_per_course: number;
    points_per_100_currency: number;
    is_active: boolean;
}

interface PointStats {
    total_points_awarded: number;
    total_transactions: number;
    total_approved_notes: number;
    students_with_points: number;
}

interface PointTransactionItem {
    id: number;
    user_id: number;
    amount: number;
    type: string;
    reference_id?: number | null;
    reference_type?: string | null;
    description: string;
    created_at: string;
    user?: {
        id: number;
        name: string;
        phone: string;
        email: string;
        points: number;
        registration_number?: string;
    };
}

export const AdminPointsPage: React.FC = () => {
    const [settings, setSettings] = useState<PointSettings>({
        purchase_points_enabled: true,
        purchase_points_type: 'fixed',
        points_per_course: 50,
        points_per_100_currency: 10,
        is_active: true,
    });
    const [stats, setStats] = useState<PointStats>({
        total_points_awarded: 0,
        total_transactions: 0,
        total_approved_notes: 0,
        students_with_points: 0,
    });
    const [transactions, setTransactions] = useState<PointTransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingSettings, setSavingSettings] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

    // Filters
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);

    // Adjust Points Modal
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustUserId, setAdjustUserId] = useState('');
    const [adjustAmount, setAdjustAmount] = useState('50');
    const [adjustDescription, setAdjustDescription] = useState('');
    const [adjustLoading, setAdjustLoading] = useState(false);
    const [adjustError, setAdjustError] = useState<string | null>(null);

    useEffect(() => {
        fetchSettingsAndStats();
    }, []);

    useEffect(() => {
        fetchTransactions(1);
    }, [typeFilter, searchTerm]);

    const fetchSettingsAndStats = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/admin/points/settings');
            if (res.data?.settings) {
                setSettings(res.data.settings);
            }
            if (res.data?.stats) {
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error('Failed to load point settings', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async (page = 1) => {
        try {
            const params: any = { page };
            if (typeFilter !== 'all') params.type = typeFilter;
            if (searchTerm.trim()) params.search = searchTerm.trim();

            const res = await apiClient.get('/admin/points/transactions', { params });
            const data = res.data;
            setTransactions(data.data || []);
            setCurrentPage(data.current_page || 1);
            setLastPage(data.last_page || 1);
            setTotalTransactions(data.total || 0);
        } catch (err) {
            console.error('Failed to load transactions', err);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingSettings(true);
            setSaveSuccessMsg(null);
            const res = await apiClient.put('/admin/points/settings', settings);
            setSettings(res.data.settings);
            setSaveSuccessMsg('Point settings have been updated successfully!');
            setTimeout(() => setSaveSuccessMsg(null), 4000);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save point settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleAdjustPoints = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseInt(adjustAmount, 10);
        if (!adjustUserId || isNaN(numAmount) || numAmount === 0) {
            setAdjustError('Please specify a valid student ID and non-zero point amount.');
            return;
        }
        if (!adjustDescription.trim()) {
            setAdjustError('Please enter a description / reason.');
            return;
        }

        try {
            setAdjustLoading(true);
            setAdjustError(null);
            await apiClient.post('/admin/points/adjust', {
                user_id: parseInt(adjustUserId, 10),
                amount: numAmount,
                description: adjustDescription.trim(),
            });

            setIsAdjustModalOpen(false);
            setAdjustUserId('');
            setAdjustAmount('50');
            setAdjustDescription('');
            fetchSettingsAndStats();
            fetchTransactions(1);
            alert('Points adjusted successfully!');
        } catch (err: any) {
            setAdjustError(err.response?.data?.message || 'Failed to adjust points.');
        } finally {
            setAdjustLoading(false);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'course_purchase':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                        Course Purchase
                    </span>
                );
            case 'note_reward':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Note Submission Reward
                    </span>
                );
            case 'manual_adjustment':
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        Admin Adjustment
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {type}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                        <Award className="w-7 h-7 text-amber-500" />
                        <span>Reward Points Management</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Configure course purchase reward rules, student note rewards, and review points history.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAdjustModalOpen(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition"
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Adjust Student Points</span>
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Total Points Awarded
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Sparkles className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {stats.total_points_awarded.toLocaleString()} <span className="text-xs font-semibold text-slate-400">Pts</span>
                    </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Total Transactions
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {stats.total_transactions.toLocaleString()}
                    </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Approved Notes
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {stats.total_approved_notes.toLocaleString()}
                    </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Students With Points
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {stats.students_with_points.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Course Purchase Points Configuration */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 sm:p-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <Settings className="w-5 h-5 text-amber-500" />
                    <div>
                        <h2 className="font-extrabold text-base text-slate-900 dark:text-white">
                            Course Purchase Point Rules
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Specify whether and how students receive points when they purchase or enroll in a course.
                        </p>
                    </div>
                </div>

                {saveSuccessMsg && (
                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{saveSuccessMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSaveSettings} className="mt-5 space-y-5">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                Enable Points on Course Purchase
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                When enabled, students automatically get points once their order payment is completed or approved.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.purchase_points_enabled}
                                onChange={(e) => setSettings({ ...settings, purchase_points_enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>

                    {settings.purchase_points_enabled && (
                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Point Calculation Mode
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Option 1: Fixed points per course */}
                                <div
                                    onClick={() => setSettings({ ...settings, purchase_points_type: 'fixed' })}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${settings.purchase_points_type === 'fixed'
                                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                            Fixed Points per Course
                                        </span>
                                        <input
                                            type="radio"
                                            name="purchase_type"
                                            checked={settings.purchase_points_type === 'fixed'}
                                            onChange={() => setSettings({ ...settings, purchase_points_type: 'fixed' })}
                                            className="text-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Awards a set number of points whenever a student enrolls in a course regardless of price.
                                    </p>
                                    <div className="mt-3">
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                            Points to Award:
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={settings.points_per_course}
                                            onChange={(e) => setSettings({ ...settings, points_per_course: parseInt(e.target.value, 10) || 0 })}
                                            className="mt-1 w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Option 2: Points per amount spent */}
                                <div
                                    onClick={() => setSettings({ ...settings, purchase_points_type: 'per_amount' })}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${settings.purchase_points_type === 'per_amount'
                                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                            Points per Amount Spent
                                        </span>
                                        <input
                                            type="radio"
                                            name="purchase_type"
                                            checked={settings.purchase_points_type === 'per_amount'}
                                            onChange={() => setSettings({ ...settings, purchase_points_type: 'per_amount' })}
                                            className="text-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Calculates points proportionally to the BDT amount paid by the student.
                                    </p>
                                    <div className="mt-3">
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                            Points per 100 BDT:
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={settings.points_per_100_currency}
                                            onChange={(e) => setSettings({ ...settings, points_per_100_currency: parseInt(e.target.value, 10) || 0 })}
                                            className="mt-1 w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={savingSettings}
                            className="px-5 py-2.5 bg-[#25a2ee] hover:bg-[#1f8ed1] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition disabled:opacity-50"
                        >
                            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Save Point Settings</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Transactions Ledger */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Point Transactions History</span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {totalTransactions}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Full audit log of points awarded, redeemed, or adjusted across the platform.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Type filter */}
                        <div className="relative">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 pr-8"
                            >
                                <option value="all">All Types</option>
                                <option value="course_purchase">Course Purchase</option>
                                <option value="note_reward">Note Submission Reward</option>
                                <option value="manual_adjustment">Admin Adjustment</option>
                            </select>
                        </div>

                        {/* Search input */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search student name/phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white w-48 sm:w-60 focus:outline-hidden focus:border-[#25a2ee]"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Student</th>
                                <th className="py-3 px-4">Points Change</th>
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Description</th>
                                <th className="py-3 px-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        No point transactions recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((t) => {
                                    const isPositive = t.amount >= 0;
                                    const formattedDate = new Date(t.created_at).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    });

                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                                            <td className="py-3 px-4">
                                                {t.user ? (
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 dark:text-white">
                                                            {t.user.name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                            {t.user.phone || t.user.email} {t.user.registration_number ? `(${t.user.registration_number})` : ''}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">User #{t.user_id}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-flex items-center gap-1 font-black text-sm ${isPositive
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : 'text-rose-600 dark:text-rose-400'
                                                        }`}
                                                >
                                                    {isPositive ? (
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    ) : (
                                                        <ArrowDownRight className="w-4 h-4" />
                                                    )}
                                                    {isPositive ? `+${t.amount}` : t.amount} Pts
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {getTypeBadge(t.type)}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs text-slate-700 dark:text-slate-300">
                                                {t.description}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                {formattedDate}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>Page {currentPage} of {lastPage}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => fetchTransactions(currentPage - 1)}
                                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <button
                                disabled={currentPage >= lastPage}
                                onClick={() => fetchTransactions(currentPage + 1)}
                                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Adjust Points Modal */}
            {isAdjustModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                <span>Adjust Student Points</span>
                            </h3>
                            <button
                                onClick={() => setIsAdjustModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {adjustError && (
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs font-bold text-rose-700 dark:text-rose-300 rounded-xl">
                                {adjustError}
                            </div>
                        )}

                        <form onSubmit={handleAdjustPoints} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Student User ID:
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter User ID (e.g. 5)"
                                    value={adjustUserId}
                                    onChange={(e) => setAdjustUserId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Points Amount (Positive to add, negative to deduct):
                                </label>
                                <input
                                    type="number"
                                    placeholder="e.g. 100 or -50"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Reason / Description:
                                </label>
                                <textarea
                                    placeholder="e.g. Special contest bonus award or manual correction..."
                                    value={adjustDescription}
                                    onChange={(e) => setAdjustDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAdjustModalOpen(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustLoading}
                                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {adjustLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Adjustment</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
