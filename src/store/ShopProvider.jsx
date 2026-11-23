import { useEffect, useMemo, useRef, useState } from 'react'
import { App } from 'antd'
import { ShopContext } from './shopContext'
import { findProduct } from '../data/shop'
import * as api from '../api'

const load = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}

// Keeps a piece of state in localStorage. The state still works in memory if storage is blocked.
function useStored(key, fallback) {
  const [value, setValue] = useState(() => load(key, fallback))
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable
    }
  }, [key, value])
  return [value, setValue]
}

const MAX_COMPARE = 4

export default function ShopProvider({ children }) {
  const { message } = App.useApp()
  const [cart, setCart] = useStored('gb-cart', [])
  const [wishlist, setWishlist] = useStored('gb-wishlist', [])
  const [compare, setCompare] = useStored('gb-compare', [])
  const [storedUser, setUser] = useStored('gb-user', null)
  // A saved user without a valid token (expired or from the old demo login) counts as logged out
  const user = storedUser && api.getToken() ? storedUser : null
  const [orders, setOrders] = useStored('gb-orders', [])
  const [pincode, setPincode] = useStored('gb-pincode', null)
  const [coupon, setCoupon] = useStored('gb-coupon', '')
  const [pincodeOpen, setPincodeOpen] = useState(false)

  // While logged in, keep the cart and wishlist saved on the account (debounced)
  const synced = useRef(Boolean(user))
  useEffect(() => {
    if (!user || !synced.current) return undefined
    const t = setTimeout(() => api.saveCart(cart, wishlist), 600)
    return () => clearTimeout(t)
  }, [user, cart, wishlist])

  const value = useMemo(() => {
    const cartRows = cart.map((i) => ({ ...i, product: findProduct(i.id) })).filter((r) => r.product)

    return {
      cart,
      cartRows,
      cartCount: cartRows.reduce((n, r) => n + r.qty, 0),
      addToCart: (id, qty = 1, { silent = false } = {}) => {
        const p = findProduct(id)
        if (!p) return
        if (p.stock <= 0) {
          message.warning('This product is out of stock')
          return
        }
        setCart((list) => {
          const found = list.find((i) => i.id === p.id)
          if (found) return list.map((i) => (i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, p.stock) } : i))
          return [...list, { id: p.id, qty: Math.min(qty, p.stock) }]
        })
        if (!silent) message.success('Added to cart')
      },
      setCartQty: (id, qty) => {
        const p = findProduct(id)
        const max = p?.stock || 1
        setCart((list) => list.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(qty || 1, max)) } : i)))
      },
      removeFromCart: (id) => setCart((list) => list.filter((i) => i.id !== id)),
      clearCart: () => {
        setCart([])
        setCoupon('')
      },

      wishlist,
      inWishlist: (id) => wishlist.includes(id),
      toggleWishlist: (id) => {
        const had = wishlist.includes(id)
        setWishlist((list) => (had ? list.filter((x) => x !== id) : [...list, id]))
        message.success(had ? 'Removed from wishlist' : 'Added to wishlist')
      },
      removeFromWishlist: (id) => setWishlist((list) => list.filter((x) => x !== id)),

      compare,
      inCompare: (id) => compare.includes(id),
      toggleCompare: (id) => {
        if (compare.includes(id)) {
          setCompare((list) => list.filter((x) => x !== id))
          message.info('Removed from compare')
          return
        }
        if (compare.length >= MAX_COMPARE) {
          message.warning(`You can compare up to ${MAX_COMPARE} products`)
          return
        }
        setCompare((list) => [...list, id])
        message.success('Added to compare')
      },
      clearCompare: () => setCompare([]),

      user,
      // Called after login/signup: merges the cart saved on the account with this device's cart
      signIn: async (u) => {
        setUser(u)
        synced.current = false
        const res = await api.getSavedCart()
        if (res.ok) {
          setCart((local) => {
            const merged = new Map(res.cart.map((i) => [i.id, i.qty]))
            local.forEach((i) => merged.set(i.id, Math.max(i.qty, merged.get(i.id) || 0)))
            return [...merged].map(([id, qty]) => ({ id, qty })).filter((i) => findProduct(i.id))
          })
          setWishlist((local) => [...new Set([...res.wishlist, ...local])].filter((id) => findProduct(id)))
        }
        synced.current = true
      },
      logout: () => {
        api.clearToken()
        synced.current = false
        setUser(null)
        setCart([])
        setWishlist([])
        setOrders([])
        message.success('You have been logged out')
      },

      orders,
      addOrder: (order) => setOrders((list) => [order, ...list.filter((o) => o.id !== order.id)]),
      // Server orders replace local copies; guest orders placed on this device are kept
      loadMyOrders: async () => {
        const res = await api.myOrders()
        if (res.ok) setOrders((list) => [...res.orders, ...list.filter((o) => !res.orders.some((x) => x.id === o.id))])
        return res
      },
      cancelOrder: async (id) => {
        const o = orders.find((x) => x.id === id)
        const res = await api.cancelOrder(id, user ? undefined : o?.customer?.mobile)
        if (!res.ok) {
          message.error(res.message)
          return
        }
        setOrders((list) => list.map((x) => (x.id === id ? res.order : x)))
        message.success('Your order has been cancelled')
      },

      pincode,
      setPincode,
      pincodeOpen,
      openPincode: () => setPincodeOpen(true),
      closePincode: () => setPincodeOpen(false),

      coupon,
      setCoupon,
    }
  }, [cart, wishlist, compare, user, orders, pincode, coupon, pincodeOpen, message, setCart, setWishlist, setCompare, setUser, setOrders, setPincode, setCoupon])

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}
