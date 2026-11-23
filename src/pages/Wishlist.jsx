import { Link } from 'react-router-dom'
import { Button, Empty } from 'antd'
import StoreHeading from '../components/shop/StoreHeading'
import ProductCard from '../components/ProductCard'
import { findProduct } from '../data/shop'
import { useShop } from '../store/shopContext'

export default function Wishlist() {
  const { wishlist, addToCart, removeFromWishlist } = useShop()
  const list = wishlist.map(findProduct).filter(Boolean)

  const moveAll = () => {
    list.filter((p) => p.stock > 0).forEach((p) => {
      addToCart(p.id, 1, { silent: true })
      removeFromWishlist(p.id)
    })
  }

  return (
    <>
      <StoreHeading title="My Wishlist" crumbs={[{ label: 'Wishlist' }]} text={list.length ? `${list.length} saved ${list.length === 1 ? 'product' : 'products'}` : undefined}>
        {list.some((p) => p.stock > 0) && <Button type="primary" onClick={moveAll}>Move all to cart</Button>}
      </StoreHeading>
      <section className="bg-cool py-6 md:py-8">
        <div className="container-x">
          {list.length ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {list.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-white py-16">
              <Empty description="Your wishlist is empty. Tap the heart on any product to save it here.">
                <Link to="/products"><Button type="primary" size="large">Explore products</Button></Link>
              </Empty>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
