import { useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '../ProductCard'

const arrow =
  'grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-white text-secondary shadow-md ring-1 ring-line transition-colors hover:bg-primary hover:text-white hover:ring-primary'

// Horizontal product slider with arrow buttons
export default function ProductRail({ list }) {
  const ref = useRef(null)
  return (
    <div className="relative">
      <Swiper
        onSwiper={(s) => (ref.current = s)}
        spaceBetween={12}
        slidesPerView={2}
        speed={500}
        breakpoints={{ 640: { slidesPerView: 3, spaceBetween: 14 }, 1024: { slidesPerView: 4, spaceBetween: 16 }, 1280: { slidesPerView: 5, spaceBetween: 16 } }}
        className="!pb-2 !pt-1"
      >
        {list.map((p) => (
          <SwiperSlide key={p.id} className="!h-auto">
            <ProductCard p={p} />
          </SwiperSlide>
        ))}
      </Swiper>
      {list.length > 2 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => ref.current?.slidePrev()} className={`${arrow} absolute -left-3 top-[38%] z-10 hidden md:grid`}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label="Next" onClick={() => ref.current?.slideNext()} className={`${arrow} absolute -right-3 top-[38%] z-10 hidden md:grid`}>
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </div>
  )
}
