import { NavLink } from 'react-router-dom'
import { Badge } from 'antd'
import { Home, LayoutGrid, Heart, ShoppingCart, User } from 'lucide-react'
import { useShop } from '../../store/shopContext'

// Bottom tab bar on phones
export default function MobileTabBar() {
  const { cartCount, wishlist, user } = useShop()
  const tabs = [
    { to: '/', label: 'Home', Icon: Home, end: true },
    { to: '/products', label: 'Shop', Icon: LayoutGrid },
    { to: '/wishlist', label: 'Wishlist', Icon: Heart, count: wishlist.length },
    { to: '/cart', label: 'Cart', Icon: ShoppingCart, count: cartCount },
    { to: user ? '/orders' : '/login', label: user ? 'Orders' : 'Account', Icon: User },
  ]
  return (
    <nav aria-label="Quick links" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="m-0 grid list-none grid-cols-5 p-0">
        {tabs.map(({ to, label, Icon, count, end }) => (
          <li key={label}>
            <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${isActive ? 'text-primary-dark' : 'text-body'}`}>
              <Badge count={count} size="small" color="#0FAFBF" offset={[2, 0]}>
                <Icon size={21} strokeWidth={1.8} className="text-current" />
              </Badge>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
