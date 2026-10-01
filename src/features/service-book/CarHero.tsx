/**
 * Hero-блок активного авто на странице сервисной книжки.
 *
 * Слева — большое фото машины (через SafeImage с фолбэком),
 * справа — название, госномер и пробег. Если в гараже более одного авто —
 * показываем счётчик «+N» и ссылку «Сменить» на /garage.
 */
import { Link } from 'react-router-dom'
import type { ServiceBookCar } from './types'
import { Card } from '@/shared/ui/Card'
import { SafeImage } from '@/shared/ui/SafeImage'
import { formatMileage } from '@/shared/lib/format'
import { pickCarTitle } from '@/features/garage/lib'

interface CarHeroProps {
  car: ServiceBookCar
  totalCars: number
}

export function CarHero({ car, totalCars }: CarHeroProps) {
  const otherCount = Math.max(0, totalCars - 1)
  return (
    <Card className="p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-5 md:gap-8">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-sct-lg border border-borderLight bg-surfaceLight md:h-36 md:w-36">
              <SafeImage
                src={car.image_url ?? car.mark.logo_url}
                alt={pickCarTitle(car)}
                className="h-full w-full object-cover"
                fallback={
                  <div className="flex h-full w-full items-center justify-center text-2xl font-900 uppercase text-borderLight">
                    {car.mark.name.slice(0, 2)}
                  </div>
                }
              />
            </div>
            {otherCount > 0 && (
              <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-4 border-white bg-brandBlue text-xs font-900 text-white shadow-lg md:h-10 md:w-10">
                +{otherCount}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-900 uppercase tracking-[0.2em] text-brandBlue">
              Активное авто
            </p>
            <h2 className="mt-2 truncate text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-4xl">
              {car.nickname || `${car.mark.display_name} ${car.model.name}`}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {car.license_plate && (
                <span className="inline-block rounded-lg bg-textPrimary px-3 py-1 font-mono text-[12px] font-900 uppercase tracking-widest text-white shadow-md">
                  {car.license_plate}
                </span>
              )}
              {typeof car.latest_mileage_km === 'number' && car.latest_mileage_km > 0 && (
                <span className="text-[11px] font-bold uppercase tracking-widest text-textSecondary">
                  {formatMileage(car.latest_mileage_km)}
                </span>
              )}
            </div>
          </div>
        </div>

        {otherCount > 0 && (
          <Link
            to="/garage"
            className="inline-flex items-center justify-center gap-2 rounded-sct border border-blue-100 bg-blue-50 px-5 py-3 text-[11px] font-900 uppercase tracking-widest text-brandBlue transition-all hover:bg-brandBlue hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            Сменить
          </Link>
        )}
      </div>
    </Card>
  )
}
