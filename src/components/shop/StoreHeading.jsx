import { Breadcrumb } from 'antd'
import { Link } from 'react-router-dom'

// Slim one-line page heading: title and description on the left, breadcrumb on the right
export default function StoreHeading({ title, crumbs = [], text, children }) {
  const items = [{ title: <Link to="/">Home</Link> }, ...crumbs.map((c) => ({ title: c.to ? <Link to={c.to}>{c.label}</Link> : c.label }))]
  return (
    <section className="border-b border-line bg-light">
      <div className="container-x flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
        <div className="flex min-w-0 flex-1 items-baseline gap-3">
          <h1 className="shrink-0 truncate text-lg font-bold leading-tight md:text-[22px]">{title}</h1>
          {text && <p className="hidden min-w-0 truncate text-[13px] md:block">{text}</p>}
        </div>
        <Breadcrumb items={items} className="order-first w-full md:order-none md:w-auto [&_li]:!text-[13px]" />
        {children}
      </div>
    </section>
  )
}
