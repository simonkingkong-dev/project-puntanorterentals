"use client";

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CART_KEY = 'punta-norte-cart';

/** Draft = sin reservationId; puede incluir datos de huésped para crear la reserva en la página de pago. */
export type CartItem = {
  propertyId: string;
  slug: string;
  checkIn: string;
  checkOut: string;
  reservationId?: string;
  /** Solo para borrador (sin reservationId) */
  guests?: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  totalAmount?: number;
};

export function getCartItemKey(item: CartItem): string {
  if (item.reservationId) return item.reservationId;
  return `draft:${item.propertyId}:${item.checkIn}:${item.checkOut}`;
}

export function isDraft(item: CartItem): boolean {
  return !item.reservationId;
}

type CartContextValue = {
  cart: CartItem[];
  setCart: (items: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (key: string) => void;
  updateCartItem: (key: string, updates: Partial<CartItem>) => void;
  getItemByKey: (key: string) => CartItem | undefined;
  /** Número de reservas (confirmadas, en hold o expiradas); no cuenta borradores. */
  cartCount: number;
  hasCartItem: boolean;
  clearReservationId: (reservationId: string) => void;
  /** Máximo 1 borrador; si ya hay uno con misma propiedad/fechas se actualiza. */
  setDraft: (item: Omit<CartItem, 'reservationId'>) => void;
  hasDraft: boolean;
  getDraft: () => CartItem | undefined;
  /** True después de cargar el carrito desde localStorage (evita "reserva no encontrada" antes de hidratar). */
  hydrated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Lee el borrador desde localStorage (por si el estado React no ha actualizado aún al navegar). */
export function getDraftFromStorage(): CartItem | undefined {
  return loadCart().find(isDraft) ?? undefined;
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    if (items.length) localStorage.setItem(CART_KEY, JSON.stringify(items));
    else localStorage.removeItem(CART_KEY);
  } catch {}
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCartState(loadCart());
    setHydrated(true);
  }, []);

  const setCart = useCallback((items: CartItem[]) => {
    setCartState(items);
    saveCart(items);
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCartState((prev) => {
      const key = getCartItemKey(item);
      const idx = prev.findIndex((i) => getCartItemKey(i) === key);
      const next = idx >= 0 ? [...prev.slice(0, idx), item, ...prev.slice(idx + 1)] : [...prev, item];
      saveCart(next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCartState((prev) => {
      const next = prev.filter((i) => getCartItemKey(i) !== key);
      saveCart(next);
      return next;
    });
  }, []);

  const updateCartItem = useCallback((key: string, updates: Partial<CartItem>) => {
    setCartState((prev) => {
      const idx = prev.findIndex((i) => getCartItemKey(i) === key);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      saveCart(next);
      return next;
    });
  }, []);

  const getItemByKey = useCallback(
    (key: string) => cart.find((i) => getCartItemKey(i) === key),
    [cart]
  );

  const clearReservationId = useCallback((reservationId: string) => {
    setCartState((prev) => {
      const idx = prev.findIndex((i) => i.reservationId === reservationId);
      if (idx < 0) return prev;
      const next = [...prev];
      const item = next[idx];
      next[idx] = { ...item, reservationId: undefined };
      saveCart(next);
      return next;
    });
  }, []);

  /** Máximo 1 borrador en el carrito; si ya hay uno, se reemplaza por este. */
  const setDraft = useCallback((item: Omit<CartItem, 'reservationId'>) => {
    setCartState((prev) => {
      const withoutDrafts = prev.filter((i) => !isDraft(i));
      const next = [...withoutDrafts, { ...item }];
      saveCart(next);
      return next;
    });
  }, []);

  const hasDraft = cart.some(isDraft);
  const getDraft = useCallback(() => cart.find(isDraft), [cart]);

  const cartCount = cart.length;
  const hasCartItem = cart.length > 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        addToCart,
        removeFromCart,
        updateCartItem,
        getItemByKey,
        cartCount,
        hasCartItem,
        clearReservationId,
        setDraft,
        hasDraft,
        getDraft,
        hydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
