import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Store-style section heading: title on the left, "View all" on the right
export default function SectionHead({ title, text, to, linkText = 'View all', children }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-[22px] font-bold leading-tight md:text-[28px]">{title}</h2>
        <span className="gold-grad mt-2 block h-[3px] w-12 rounded-full" aria-hidden />
        {text && <p className="mt-1 text-sm md:text-[15px]">{text}</p>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        {children && <div className="no-scrollbar max-w-full overflow-x-auto">{children}</div>}
        {to && (
          <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary-dark hover:gap-2 hover:text-primary transition-all">
            {linkText} <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </div>
  )
}
