import React, { createContext, useContext, useState, useEffect } from 'react';
import { Course } from '../types';

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

    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch {}
    }, [items]);

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
    const totalSavings = Math.max(0, totalOriginalPrice - subtotal);

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
