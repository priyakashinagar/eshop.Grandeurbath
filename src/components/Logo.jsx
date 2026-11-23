import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 shrink-0" aria-label="Grandeur Bath home">
      <img src={logo} alt="" className="h-9 w-auto sm:h-10" />
      <span className="leading-none">
        <span className={`block font-heading font-bold text-[15px] sm:text-lg tracking-[.06em] sm:tracking-[.08em] uppercase ${light ? 'text-white' : 'text-secondary'}`}>
          Grandeur <span className="text-primary">Bath</span>
        </span>
        <span className={`hidden sm:block mt-0.5 text-[10px] font-semibold tracking-[.14em] uppercase ${light ? 'text-white/60' : 'text-body'}`}>
          by Ishan Tubes Pvt Ltd
        </span>
      </span>
    </Link>
  )
}
