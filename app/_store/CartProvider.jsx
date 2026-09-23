'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'alvian_cart_v1';
const MAX_QTY = 10;

function readStorage() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((i) => i && Number(i.id) > 0 && Number(i.qty) > 0)
      : [];
  } catch (error) {
    return [];
  }
}

function writeStorage(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    // Modo privado o almacenamiento bloqueado: el carrito vive solo en memoria.
  }
}

/**
 * Carrito de la tienda. Guarda en el navegador una "foto" de cada perfume
 * (nombre, precio, imagen) solo para mostrarlo; al confirmar el pedido el
 * servidor recalcula precios y stock reales.
 */
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [ready, setReady] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setItems(readStorage());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = useCallback((updater) => {
    setItems((current) => {
      const next = updater(current);
      writeStorage(next);
      return next;
    });
  }, []);

  const showToast = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  const add = useCallback(
    (product, qty = 1, { openDrawer = true } = {}) => {
      const limit = Math.max(1, Math.min(MAX_QTY, Number(product.stock) || MAX_QTY));
      update((current) => {
        const found = current.find((i) => i.id === product.id);
        if (found) {
          return current.map((i) =>
            i.id === product.id ? { ...i, ...product, qty: Math.min(limit, i.qty + qty) } : i,
          );
        }
        return [...current, { ...product, qty: Math.min(limit, qty) }];
      });
      showToast(`${product.name} agregado al carrito`);
      if (openDrawer) setOpen(true);
    },
    [update, showToast],
  );

  const setQty = useCallback(
    (id, qty) => {
      update((current) =>
        qty <= 0
          ? current.filter((i) => i.id !== id)
          : current.map((i) => {
              if (i.id !== id) return i;
              const limit = Math.max(1, Math.min(MAX_QTY, Number(i.stock) || MAX_QTY));
              return { ...i, qty: Math.min(limit, qty) };
            }),
      );
    },
    [update],
  );

  const clear = useCallback(() => update(() => []), [update]);

  const value = useMemo(() => {
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.qty, 0);
    return { items, count, subtotal, ready, open, setOpen, add, setQty, clear, toast, showToast };
  }, [items, ready, open, add, setQty, clear, toast, showToast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de <CartProvider>.');
  return context;
}
