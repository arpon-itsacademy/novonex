import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Course } from '../types';
import { apiClient } from '../api/client';

export interface CartItem {
    id: number;
    title: string;
    slug: string;
    price: number;
    effective_price: number;
    sale_price?: number | null;
    thumbnail?: string | null;
    thumbnail_url?: string | null;
    lessons_count?: number;
    instructors?: Array<{ id: number; name: string }>;
    instructor?: { id: number; name: string } | null;
}

export interface AppliedOfferTier {
    min_qty: number;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    courses_needed?: number;
}

export interface DynamicOfferEvaluation {
    applied: boolean;
    offer_id?: number;
    offer_title?: string;
    banner_text?: string | null;
    scope_type?: string;
    qualifying_count?: number;
    matched_tier?: AppliedOfferTier | null;
    discount_amount: number;
    next_tier?: AppliedOfferTier | null;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (course: Course | CartItem) => void;
    removeFromCart: (courseId: number) => void;
    clearCart: () => void;
    isInCart: (courseId: number) => boolean;
    cartCount: number;
    subtotal: number;
    totalOriginalPrice: number;
    totalSavings: number;
    dynamicOfferDiscount: number;
    appliedOffer: DynamicOfferEvaluation | null;
    totalPayable: number;
    isEvaluatingOffer: boolean;
    refreshDynamicOffer: () => Promise<void>;
    isCartOpen: boolean;
    openCart: () => void;
    closeCart: () => void;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'novonex_cart_items';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [dynamicOfferDiscount, setDynamicOfferDiscount] = useState<number>(0);
    const [appliedOffer, setAppliedOffer] = useState<DynamicOfferEvaluation | null>(null);
    const [isEvaluatingOffer, setIsEvaluatingOffer] = useState(false);

    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

    const evaluateCartOffers = useCallback(async (currentItems: CartItem[]) => {
        if (!currentItems || currentItems.length === 0) {
            setDynamicOfferDiscount(0);
            setAppliedOffer(null);
            return;
        }

        try {
            setIsEvaluatingOffer(true);
            const { data } = await apiClient.post('/dynamic-offers/evaluate', {
                course_ids: currentItems.map((item) => item.id),
            });

            if (data && data.offer) {
                setAppliedOffer(data.offer);
                setDynamicOfferDiscount(Number(data.discount_amount || 0));
            } else {
                setAppliedOffer(null);
                setDynamicOfferDiscount(0);
            }
        } catch {
            // Fail safely without disrupting the cart
            setAppliedOffer(null);
            setDynamicOfferDiscount(0);
        } finally {
            setIsEvaluatingOffer(false);
        }
    }, []);

    useEffect(() => {
        evaluateCartOffers(items);
    }, [items, evaluateCartOffers]);

    const refreshDynamicOffer = useCallback(async () => {
        await evaluateCartOffers(items);
    }, [items, evaluateCartOffers]);

    const addToCart = (course: Course | CartItem) => {
        setItems((prev) => {
            const exists = prev.some((item) => item.id === course.id);
            if (exists) {
                return prev;
            }

            const rawPrice = Number(course.price) || 0;
            const salePrice = course.sale_price !== null && course.sale_price !== undefined ? Number(course.sale_price) : null;
            const effPrice = (salePrice !== null && salePrice < rawPrice)
                ? salePrice
                : (course.effective_price !== undefined && course.effective_price !== null ? Number(course.effective_price) : rawPrice);

            const newItem: CartItem = {
                id: course.id,
                title: course.title,
                slug: course.slug,
                price: rawPrice,
                effective_price: effPrice,
                sale_price: salePrice,
                thumbnail: course.thumbnail || (course as any).thumbnail_url || null,
                thumbnail_url: (course as any).thumbnail_url || course.thumbnail || null,
                lessons_count: course.lessons_count || 0,
                instructors: (course as any).instructors || [],
                instructor: (course as any).instructor || null,
            };

            return [...prev, newItem];
        });

        // Automatically open the cart drawer when a course is added
        setIsCartOpen(true);
    };

    const removeFromCart = (courseId: number) => {
        setItems((prev) => prev.filter((item) => item.id !== courseId));
    };

    const clearCart = () => {
        setItems([]);
        setAppliedOffer(null);
        setDynamicOfferDiscount(0);
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
        } catch {}
    };

    const isInCart = (courseId: number) => {
        return items.some((item) => item.id === courseId);
    };

    const cartCount = items.length;

    const subtotal = items.reduce((acc, item) => acc + (Number(item.effective_price) || 0), 0);
    const totalOriginalPrice = items.reduce((acc, item) => acc + (Number(item.price) || Number(item.effective_price) || 0), 0);
    const totalPayable = Math.max(0, subtotal - dynamicOfferDiscount);
    const totalSavings = Math.max(0, totalOriginalPrice - totalPayable);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const toggleCart = () => setIsCartOpen((prev) => !prev);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                clearCart,
                isInCart,
                cartCount,
                subtotal,
                totalOriginalPrice,
                totalSavings,
                dynamicOfferDiscount,
                appliedOffer,
                totalPayable,
                isEvaluatingOffer,
                refreshDynamicOffer,
                isCartOpen,
                openCart,
                closeCart,
                toggleCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = (): CartContextType => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
