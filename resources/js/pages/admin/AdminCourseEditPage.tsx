import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Category, User } from '../../types';
import { MediaPickerModal } from '../../components/shared/MediaPickerModal';
import { WordMathEditor } from '../../components/exam/WordMathEditor';
import {
    ArrowLeft,
    Save,
    Layers,
    AlertCircle,
    CheckCircle2,
    BookOpen,
    UploadCloud,
    Image as ImageIcon,
    Trash2,
    Loader2,
    ExternalLink,
    Plus,
    FileText,
    Calendar,
    GraduationCap,
    Users,
    Upload,
    Tag,
    Clock,
    Sparkles,
    PlayCircle,
    Key,
    KeyRound,
    MessageCircle
} from 'lucide-react';

const DEFAULT_FEATURES = [
    'Full HD video lectures & live discussions',
    'Downloadable practice sheets & lecture notes',
    'Direct Q&A doubt-solving support with instructors',
    'Lifetime course access from any device',
];

export interface CourseActionButton {
    id: string;
    label: string;
    type: 'file' | 'link';
    url: string;
    file_name?: string;
}

export interface EnrolledActionButton {
    id: string;
    label: string;
    url: string;
    requires_access_key: boolean;
}

export const AdminCourseEditPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [shortDescription, setShortDescription] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0');
    const [salePrice, setSalePrice] = useState('');
    const [thumbnail, setThumbnail] = useState('');
    const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
    const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);

    // New Course Badges, Features & Action Buttons
    const [features, setFeatures] = useState<string[]>(DEFAULT_FEATURES);
    const [newFeatureText, setNewFeatureText] = useState('');
    const [fakeEnrollmentCount, setFakeEnrollmentCount] = useState<string>('0');
    const [classStartsAt, setClassStartsAt] = useState<string>('');
    const [actionButtons, setActionButtons] = useState<CourseActionButton[]>([
        { id: 'btn-outline', label: 'Course Outline', type: 'link', url: '' }
    ]);
    const [enrolledButtons, setEnrolledButtons] = useState<EnrolledActionButton[]>([]);
    const [uploadingButtonFileId, setUploadingButtonFileId] = useState<string | null>(null);

    // Coupon, Countdown & How-to-Buy
    const [couponCode, setCouponCode] = useState<string>('');
    const [couponDiscountText, setCouponDiscountText] = useState<string>('');
    const [discountDeadline, setDiscountDeadline] = useState<string>('');
    const [howToBuyUrl, setHowToBuyUrl] = useState<string>('');

    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [allTeachers, setAllTeachers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedCourseId, setSavedCourseId] = useState<number | null>(null);
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const thumbFileInputRef = useRef<HTMLInputElement>(null);

    const handleThumbDirectUpload = async (file: File) => {
        setUploadingThumb(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await apiClient.post('/admin/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data && res.data.media) {
                setThumbnail(res.data.media.url);
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to upload thumbnail.');
        } finally {
            setUploadingThumb(false);
            if (thumbFileInputRef.current) thumbFileInputRef.current.value = '';
        }
    };

    /* Feature handlers */
    const handleAddFeature = () => {
        if (!newFeatureText.trim()) return;
        setFeatures([...features, newFeatureText.trim()]);
        setNewFeatureText('');
    };

    const handleRemoveFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handleFeatureChange = (index: number, val: string) => {
        const updated = [...features];
        updated[index] = val;
        setFeatures(updated);
    };

    /* Action Buttons handlers (Course Outline, etc.) */
    const handleAddActionButton = () => {
        const newBtn: CourseActionButton = {
            id: 'btn-' + Date.now(),
            label: 'Course Outline',
            type: 'link',
            url: '',
        };
        setActionButtons([...actionButtons, newBtn]);
    };

    const handleRemoveActionButton = (id: string) => {
        setActionButtons(actionButtons.filter((b) => b.id !== id));
    };

    const handleUpdateButton = (id: string, updates: Partial<CourseActionButton>) => {
        setActionButtons(actionButtons.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    };

    /* Enrolled Students Action Buttons (Community, Facebook Group, etc.) */
    const handleAddEnrolledButton = () => {
        const newBtn: EnrolledActionButton = {
            id: 'ebtn-' + Date.now(),
            label: 'Join our Facebook Discussion Group',
            url: '',
            requires_access_key: true,
        };
        setEnrolledButtons([...enrolledButtons, newBtn]);
    };

    const handleRemoveEnrolledButton = (id: string) => {
        setEnrolledButtons(enrolledButtons.filter((b) => b.id !== id));
    };

    const handleUpdateEnrolledButton = (id: string, updates: Partial<EnrolledActionButton>) => {
        setEnrolledButtons(enrolledButtons.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    };

    const handleUploadButtonFile = async (e: React.ChangeEvent<HTMLInputElement>, btnId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingButtonFileId(btnId);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await apiClient.post('/admin/media', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data && res.data.media) {
                handleUpdateButton(btnId, {
                    url: res.data.media.url,
                    file_name: file.name,
                });
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to upload file.');
        } finally {
            setUploadingButtonFileId(null);
            e.target.value = '';
        }
    };

    useEffect(() => {
        fetchMetadata();
        if (isEdit) {
            fetchCourse();
        }
    }, [id]);

    const fetchMetadata = async () => {
        try {
            const [catsRes, teachersRes] = await Promise.all([
                apiClient.get('/admin/categories').catch(() => apiClient.get('/categories')),
                apiClient.get('/admin/teachers-list'),
            ]);
            setAllCategories(catsRes.data || []);
            setAllTeachers(teachersRes.data || []);
        } catch { }
    };

    const fetchCourse = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get(`/admin/courses/${id}`);
            const c = data.course;
            setTitle(c.title);
            setSlug(c.slug);
            setShortDescription(c.short_description || '');
            setDescription(c.description || '');
            setPrice(String(c.price));
            setSalePrice(c.sale_price ? String(c.sale_price) : '');
            setThumbnail(c.thumbnail || '');
            setStatus(c.status);
            setSelectedCategoryIds(c.categories?.map((cat: any) => cat.id) || []);
            setSelectedTeacherIds(c.instructors?.map((t: any) => t.id) || []);
            setSavedCourseId(c.id);

            // Load features, fake enroll count, class starts date, and custom buttons
            if (c.features && Array.isArray(c.features) && c.features.length > 0) {
                setFeatures(c.features);
            }
            setFakeEnrollmentCount(c.fake_enrollment_count ? String(c.fake_enrollment_count) : '0');
            setClassStartsAt(c.class_starts_at || '');
            if (c.action_buttons && Array.isArray(c.action_buttons) && c.action_buttons.length > 0) {
                setActionButtons(c.action_buttons);
            }
            if (c.enrolled_action_buttons && Array.isArray(c.enrolled_action_buttons) && c.enrolled_action_buttons.length > 0) {
                setEnrolledButtons(c.enrolled_action_buttons);
            }
            setCouponCode(c.coupon_code || '');
            setCouponDiscountText(c.coupon_discount_text || '');
            setDiscountDeadline(c.discount_deadline ? c.discount_deadline.substring(0, 16) : '');
            setHowToBuyUrl(c.how_to_buy_url || '');
        } catch {
            navigate('/admin/courses');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const numPrice = parseFloat(price) || 0;
        const numSale = salePrice ? parseFloat(salePrice) : null;

        if (numSale !== null && numSale > numPrice) {
            setError('Sale Price must be less than or equal to Regular Price.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title,
                slug,
                short_description: shortDescription,
                description,
                price: numPrice,
                sale_price: numSale,
                thumbnail,
                status,
                category_ids: selectedCategoryIds,
                instructor_ids: selectedTeacherIds,
                features: features.filter((f) => f.trim().length > 0),
                fake_enrollment_count: parseInt(fakeEnrollmentCount, 10) || 0,
                class_starts_at: classStartsAt.trim() || null,
                action_buttons: actionButtons.filter((b) => b.label.trim().length > 0 && b.url.trim().length > 0),
                enrolled_action_buttons: enrolledButtons.filter((b) => b.label.trim().length > 0 && b.url.trim().length > 0),
                coupon_code: couponCode.trim() ? couponCode.trim().toUpperCase() : null,
                coupon_discount_text: couponDiscountText.trim() || null,
                discount_deadline: discountDeadline.trim() || null,
                how_to_buy_url: howToBuyUrl.trim() || null,
            };

            let targetId = savedCourseId;
            if (isEdit) {
                await apiClient.put(`/admin/courses/${id}`, payload);
            } else {
                const { data } = await apiClient.post('/admin/courses', payload);
                targetId = data.course.id;
                setSavedCourseId(targetId);
            }

            alert('Course saved successfully!');
            if (!isEdit && targetId) {
                navigate(`/admin/courses/${targetId}/builder`);
            } else {
                navigate('/admin/courses');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save course.');
        } finally {
            setSaving(false);
        }
    };

    const toggleTeacher = (teacherId: number) => {
        setSelectedTeacherIds(prev =>
            prev.includes(teacherId) ? prev.filter(t => t !== teacherId) : [...prev, teacherId]
        );
    };

    const toggleCategory = (catId: number) => {
        setSelectedCategoryIds(prev =>
            prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
        );
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-400">Loading details...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            <div className="flex items-center justify-between">
                <Link
                    to="/admin/courses"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Courses List</span>
                </Link>

                {savedCourseId && (
                    <Link
                        to={`/admin/courses/${savedCourseId}/builder`}
                        className="px-4 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-sky-200"
                    >
                        <Layers className="w-4 h-4" />
                        <span>Open Visual Curriculum Builder</span>
                    </Link>
                )}
            </div>

            <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xs space-y-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {isEdit ? 'Edit Course Details' : 'Create New Course'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Configure basic information, pricing, categories, and assign instructors
                    </p>
                </div>

                {error && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Course Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. HSC Physics 1st Paper Complete Course"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Course Slug (URL)
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="e.g. hsc-physics-1st-paper"
                            className="w-full px-4 py-3 font-mono bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                        />
                    </div>

                    {/* Short Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Short Description
                        </label>
                        <input
                            type="text"
                            value={shortDescription}
                            onChange={(e) => setShortDescription(e.target.value)}
                            placeholder="Brief one or two line description for cards"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                        />
                    </div>

                    {/* Full Description with Microsoft Word Math Style Editor */}
                    <div>
                        <WordMathEditor
                            value={description}
                            onChange={setDescription}
                            label="Course Full Description (Microsoft Word Style Editor)"
                            placeholder="Write detailed course overview, syllabus, rich text or equations here..."
                            minHeight="220px"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Use Word-like formatting: bold, italic, underline, headings, lists, tables, and mathematical formulas.
                        </p>
                    </div>

                    {/* Thumbnail URL with Direct Upload & Media Library */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700">
                                Course Thumbnail
                            </label>
                            <span className="text-[11px] text-slate-400">Choose a 16:9 ratio image</span>
                        </div>

                        {/* Hidden input for direct upload */}
                        <input
                            ref={thumbFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleThumbDirectUpload(e.target.files[0]);
                                }
                            }}
                        />

                        {/* Action buttons: Direct upload and Media Library browse */}
                        <div className="flex flex-wrap gap-2.5">
                            <button
                                type="button"
                                disabled={uploadingThumb}
                                onClick={() => thumbFileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl text-xs font-semibold border border-sky-200 transition disabled:opacity-50"
                            >
                                {uploadingThumb ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                                        <span>Uploading image...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-4 h-4 text-sky-600" />
                                        <span>Upload from device</span>
                                    </>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsMediaModalOpen(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold border border-slate-200 transition"
                            >
                                <ImageIcon className="w-4 h-4 text-slate-600" />
                                <span>Browse Media Library</span>
                            </button>
                        </div>

                        {/* Manual URL input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={thumbnail}
                                onChange={(e) => setThumbnail(e.target.value)}
                                placeholder="Or paste direct image URL (e.g. https://...)"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                            />
                            {thumbnail && (
                                <button
                                    type="button"
                                    onClick={() => setThumbnail('')}
                                    className="absolute right-2.5 top-2.5 text-xs text-rose-500 hover:text-rose-700 font-semibold px-1.5 py-0.5 rounded bg-rose-50"
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        {/* Live Image Preview */}
                        {thumbnail && (
                            <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 max-w-sm overflow-hidden group">
                                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-200 relative">
                                    <img
                                        src={thumbnail}
                                        alt="Thumbnail Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            if (!target.dataset.fallback && thumbnail.includes('/storage/')) {
                                                target.dataset.fallback = 'true';
                                                const path = thumbnail.substring(thumbnail.indexOf('/storage/'));
                                                target.src = path;
                                                return;
                                            }
                                            target.style.display = 'none';
                                        }}
                                    />
                                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                        <a
                                            href={thumbnail}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 bg-white/90 hover:bg-white rounded-lg text-slate-700 shadow-sm transition"
                                            title="Open in new tab"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setThumbnail('')}
                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 shadow-sm transition"
                                            title="Delete thumbnail"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1.5 text-center truncate px-2 font-mono">
                                    {thumbnail}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Regular Price (Tk) - Enter 0 for Free
                            </label>
                            <input
                                type="number"
                                min={0}
                                required
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Sale Price (Tk) - Optional
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={salePrice}
                                onChange={(e) => setSalePrice(e.target.value)}
                                placeholder="Discounted price (must be less than regular price)"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Admission Count & Class Start Date */}
                    <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-800">
                                    Badges & Schedule (Enrolled Count & Start Date)
                                </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                                Course Page Badge
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Enrolled Count (Base / Offset Count)</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={fakeEnrollmentCount}
                                    onChange={(e) => setFakeEnrollmentCount(e.target.value)}
                                    placeholder="e.g. 150 (added to real enrollments)"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    This number will be displayed as total enrolled students on the course card.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Class Starts (Date or Status)</span>
                                </label>
                                <input
                                    type="text"
                                    value={classStartsAt}
                                    onChange={(e) => setClassStartsAt(e.target.value)}
                                    placeholder="e.g. Nov 09, 2026 or Admission Ongoing"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Displays in the calendar badge on the course card.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Coupon, Countdown & How to Buy Video (Matches user reference card) */}
                    <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Tag className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-800">
                                    Coupon Promotion & Countdown Timer
                                </h3>
                            </div>
                            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full">
                                Course Sidebar Promo
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Coupon Code</span>
                                </label>
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. NOVONEX500"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Students can click 'Apply' in the sidebar to auto-apply this coupon at checkout.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Discount Text</span>
                                </label>
                                <input
                                    type="text"
                                    value={couponDiscountText}
                                    onChange={(e) => setCouponDiscountText(e.target.value)}
                                    placeholder="e.g. Tk 500 Discount"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Displays next to the coupon code badge.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Offer Expiry Date & Time (Countdown Timer)</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={discountDeadline}
                                    onChange={(e) => setDiscountDeadline(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Set the deadline for the live days/hours/minutes countdown banner.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                                    <PlayCircle className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>'How to Enroll' Video URL</span>
                                </label>
                                <input
                                    type="text"
                                    value={howToBuyUrl}
                                    onChange={(e) => setHowToBuyUrl(e.target.value)}
                                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Opens in a video modal popup when clicked by students.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Course Outline & Custom Action Buttons */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-sky-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Course Outline & Custom Buttons
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        These buttons appear below the 'Enroll' button on the course details sidebar.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddActionButton}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Add New Button</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {actionButtons.map((btn) => (
                                <div
                                    key={btn.id}
                                    className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs"
                                >
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        {/* Button Label */}
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                Button Name (e.g. Course Outline / How to Enroll)
                                            </label>
                                            <input
                                                type="text"
                                                value={btn.label}
                                                onChange={(e) => handleUpdateButton(btn.id, { label: e.target.value })}
                                                placeholder="Enter button label"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                                            />
                                        </div>

                                        {/* Type Selector: File Upload vs Link */}
                                        <div className="w-full sm:w-48">
                                            <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                                Type
                                            </label>
                                            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 w-full">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateButton(btn.id, { type: 'file' })}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${btn.type === 'file'
                                                        ? 'bg-white text-sky-700 shadow-2xs'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                >
                                                    File Upload
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateButton(btn.id, { type: 'link' })}
                                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${btn.type === 'link'
                                                        ? 'bg-white text-sky-700 shadow-2xs'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                        }`}
                                                >
                                                    Link
                                                </button>
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <div className="sm:pt-5 flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveActionButton(btn.id)}
                                                className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                                                title="Remove button"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content based on type */}
                                    {btn.type === 'file' ? (
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 border-t border-slate-100">
                                            <input
                                                type="file"
                                                id={`file-btn-${btn.id}`}
                                                className="hidden"
                                                onChange={(e) => handleUploadButtonFile(e, btn.id)}
                                            />
                                            <label
                                                htmlFor={`file-btn-${btn.id}`}
                                                className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition shrink-0"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>
                                                    {uploadingButtonFileId === btn.id ? 'Uploading...' : 'Upload File (PDF/Doc/Image)'}
                                                </span>
                                            </label>

                                            {btn.url ? (
                                                <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                                                    <span className="font-medium text-emerald-800 truncate max-w-xs">
                                                        {btn.file_name || btn.url}
                                                    </span>
                                                    <a
                                                        href={btn.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-1 ml-2"
                                                    >
                                                        View <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">No file uploaded yet</span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="pt-1 border-t border-slate-100">
                                            <input
                                                type="url"
                                                value={btn.url}
                                                onChange={(e) => handleUpdateButton(btn.id, { url: e.target.value })}
                                                placeholder="https://drive.google.com/... or enter URL"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {actionButtons.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-3 bg-white rounded-xl border border-dashed border-slate-200">
                                    No action buttons created yet. Click "+ Add New Button" above.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Enrolled Students Action Buttons & Community Groups */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 border border-indigo-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-700 shrink-0">
                                    <KeyRound className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                        <span>Enrolled Students Action Buttons & Access Keys</span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                            Private / Dashboard
                                        </span>
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        After enrolling, students can see these buttons and their unique access key on their dashboard (e.g. Join our Facebook Discussion Group).
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddEnrolledButton}
                                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                <span>+ Add Group Button</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {enrolledButtons.map((btn) => (
                                <div
                                    key={btn.id}
                                    className="p-4 bg-white rounded-xl border border-indigo-150 space-y-3 shadow-2xs"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                                Button Name (e.g. Join our Facebook Discussion Group / Telegram Group)
                                            </label>
                                            <input
                                                type="text"
                                                value={btn.label}
                                                onChange={(e) => handleUpdateEnrolledButton(btn.id, { label: e.target.value })}
                                                placeholder="Enter button label"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveEnrolledButton(btn.id)}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0 mt-5"
                                            title="Delete button"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* URL Input */}
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                            Community or Group URL (Facebook / Telegram / Discord / WhatsApp)
                                        </label>
                                        <input
                                            type="url"
                                            value={btn.url}
                                            onChange={(e) => handleUpdateEnrolledButton(btn.id, { url: e.target.value })}
                                            placeholder="https://facebook.com/groups/your-group-name"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                                        />
                                    </div>

                                    {/* Access Key Toggle */}
                                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/70 p-2.5 rounded-lg">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(btn.requires_access_key)}
                                                onChange={(e) => handleUpdateEnrolledButton(btn.id, { requires_access_key: e.target.checked })}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <Key className="w-3.5 h-3.5 text-amber-500" />
                                                <span>Does this button require a Student Access Key?</span>
                                            </span>
                                        </label>
                                        {btn.requires_access_key ? (
                                            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                                                🔑 Verification Key Active
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-slate-400">
                                                Direct access without verification key
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {enrolledButtons.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4 bg-white rounded-xl border border-dashed border-indigo-200">
                                    No private community or enrolled buttons added yet. Click "+ Add Group Button" above.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Course Features Checklist */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Course Features
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        These features will be displayed as a checklist on the course page sidebar.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFeatures(DEFAULT_FEATURES)}
                                className="text-xs text-sky-600 hover:text-sky-700 font-semibold hover:underline cursor-pointer"
                            >
                                Restore Default Features
                            </button>
                        </div>

                        {/* List of features */}
                        <div className="space-y-2">
                            {features.map((feat, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    <input
                                        type="text"
                                        value={feat}
                                        onChange={(e) => handleFeatureChange(idx, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFeature(idx)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                        title="Delete feature"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            {/* Add new feature input */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="text"
                                    value={newFeatureText}
                                    onChange={(e) => setNewFeatureText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddFeature();
                                        }
                                    }}
                                    placeholder="Add new feature (e.g. 24/7 Live Support & Doubt Solving)..."
                                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddFeature}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Multi-Teacher Assignment */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                            Assign Instructors (Select one or more teachers) *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            {allTeachers.map((teacher) => {
                                const isSelected = selectedTeacherIds.includes(teacher.id);
                                return (
                                    <div
                                        key={teacher.id}
                                        onClick={() => toggleTeacher(teacher.id)}
                                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${isSelected
                                            ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="text-xs truncate mr-2">
                                            <div>{teacher.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">{teacher.phone}</div>
                                        </div>
                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700">
                                Select Course Categories (Select one or more categories)
                            </label>
                            <Link
                                to="/admin/courses/categories"
                                target="_blank"
                                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
                            >
                                + Create New Category
                            </Link>
                        </div>
                        {allCategories.length === 0 ? (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                                No categories found. Please create categories from the{' '}
                                <Link to="/admin/courses/categories" className="text-sky-600 font-bold underline">
                                    Course Categories
                                </Link>{' '}
                                page.
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                                {allCategories.map((cat) => {
                                    const isSelected = selectedCategoryIds.includes(cat.id);
                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => toggleCategory(cat.id)}
                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSelected
                                                ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-600/30'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                            <span>{cat.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400">
                            Courses on the homepage will be filtered by selected categories.
                        </p>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Publication Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                        >
                            <option value="draft">Draft (Hidden from website)</option>
                            <option value="published">Published (Visible to public on website)</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <Link
                            to="/admin/courses"
                            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-lg shadow-sky-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? 'Saving...' : 'Save Course'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Media Picker Modal */}
            <MediaPickerModal
                isOpen={isMediaModalOpen}
                onClose={() => setIsMediaModalOpen(false)}
                onSelect={(url) => setThumbnail(url)}
                filterType="image"
                title="Select Thumbnail for Course"
            />
        </div>
    );
};