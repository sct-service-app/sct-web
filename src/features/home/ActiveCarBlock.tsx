/**
 * Блок «АКТИВНОЕ АВТО» на главной.
 *
 * Структура:
 *   Header: заголовок «АКТИВНОЕ АВТО» + 2 кнопки справа («Сменить авто»,
 *           «Открыть гараж»).
 *   Body:   слева большое фото машины (соотношение 4:3),
 *           справа — название модификации, мелкая строка с тех. данными,
 *           3 плашки с тех. параметрами (Пробег / Замена масла / Ближайший
 *           визит) и жёлтая плашка-рекомендация с кнопкой «Посмотреть пакет».
 *
 * Данные подгружаем из `service-book/page-data/`:
 *   - selected_car          → название, фото, пробег
 *   - next_appointment      → ближайший визит
 *   - service_recommendations.next_oil_change_mileage_km → рекомендация по маслу
 *
 * Если активного авто нет — компонент возвращает CTA-карточку «Добавьте авто».
 */
import { Link } from 'react-router-dom'
import { useServiceBookQuery } from '@/features/service-book/queries'
import { sortRecommendationsByUrgency } from '@/features/service-book/recommendations'
import { CarSpecChips } from '@/features/service-book/CarSpecChips'
import { PlateBadge } from '@/features/service-book/CarHeroCompact'
import { useCarYear } from '@/features/garage/carYear'
import { BookServiceCTA } from '@/features/service-book/BookServiceCTA'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { SafeImage } from '@/shared/ui/SafeImage'
import { Skeleton } from '@/shared/ui/Skeleton'
import { formatMileage } from '@/shared/lib/format'
import { pickCarTitle } from '@/features/garage/lib'

export function ActiveCarBlock() {
  // page-data больше не принимает status/period/limit/offset — только car_id.
  const { data, isLoading } = useServiceBookQuery({})
  // Хук обязан вызываться до ранних return'ов: на момент загрузки
  // selected_car ещё нет, поэтому id берём аккуратно.
  const year = useCarYear(data?.selected_car?.id)

  if (isLoading) {
    return (
      <Card className="p-5 md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          <Skeleton.Box className="aspect-[4/3] w-full md:col-span-5" />
          <div className="space-y-4 md:col-span-7">
            <Skeleton.Box className="h-8 w-3/4" />
            <Skeleton.Box className="h-3 w-1/2" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton.Box className="h-16" />
              <Skeleton.Box className="h-16" />
              <Skeleton.Box className="h-16" />
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (!data || data.page_state === 'NO_CARS' || !data.selected_car) {
    return (
      <Card className="border-2 border-dashed border-borderLight p-8 text-center md:p-12">
        <p className="text-[10px] font-900 uppercase tracking-widest text-brandBlue">
          В гараже пусто
        </p>
        <h3 className="mt-3 text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
          Добавьте автомобиль
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-textSecondary">
          Сразу подберём пакеты и рекомендации под вашу модификацию.
        </p>
        <Link to="/garage/add" className="mt-6 inline-block">
          <Button variant="dark" size="lg">
            Добавить автомобиль
          </Button>
        </Link>
      </Card>
    )
  }

  const car = data.selected_car
  const rec = data.service_recommendations
  const topRec = sortRecommendationsByUrgency(rec?.recommendations ?? [])[0]
  // Полное название модификации — то же, что в плашках на «Авто» и «Услугах»,
  // чтобы машина везде называлась одинаково.
  const carTitle = pickCarTitle(car).toUpperCase()
  const carShortSpecs = car.generation?.name
    ? car.generation.name + (car.configuration?.name ? ` · ${car.configuration.name}` : '')
    : car.configuration?.name ?? ''

  return (
    <Card className="overflow-hidden p-0">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-borderLight bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
        <div>
          <p className="text-[10px] font-900 uppercase tracking-widest text-textSecondary">
            Активное авто
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-textSecondary/80">
            Основной автомобиль, для которого подбираются пакеты и акции.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.cars.length > 1 && (
            <Link
              to="/garage"
              className="rounded-lg border border-borderLight bg-white px-3 py-2 text-[10px] font-900 uppercase tracking-widest text-textSecondary transition-all hover:border-brandBlue hover:text-brandBlue"
            >
              Сменить авто
            </Link>
          )}
          <Link
            to="/garage"
            className="rounded-lg bg-brandBlue px-3 py-2 text-[10px] font-900 uppercase tracking-widest text-white transition-all hover:bg-brandBlueDark"
          >
            Открыть гараж
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-12 md:gap-6 md:p-6">
        {/* Фото машины слева */}
        <div className="md:col-span-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-sct border border-borderLight bg-surfaceLight">
            <SafeImage
              src={car.image_url ?? undefined}
              alt={carTitle}
              className="h-full w-full object-cover"
              fallback={
                <div className="flex h-full w-full items-center justify-center text-4xl font-900 uppercase text-borderLight">
                  {car.mark.name.slice(0, 2)}
                </div>
              }
            />
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-md bg-brandBlue px-2.5 py-1 text-[10px] font-900 uppercase tracking-widest text-white shadow">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brandYellow" />
              Активное авто
            </span>
          </div>
        </div>

        {/* Данные машины и плашки */}
        <div className="md:col-span-7">
          <h2 className="text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
            {carTitle}
          </h2>
          {carShortSpecs && (
            <p className="mt-1 text-[12px] font-bold uppercase tracking-tight text-textSecondary">
              {carShortSpecs}
            </p>
          )}

          {/* Госномер и год — те же чёрные рамки, что на «Авто», в «Моём
              гараже» и в «Услугах»: единый бейдж на всех экранах. */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {car.license_plate && <PlateBadge>{car.license_plate}</PlateBadge>}
            {year && <PlateBadge>{String(year)}</PlateBadge>}
          </div>

          {/* Плашки Пробег / Замена масла / Ближайший визит — общий компонент,
              он же на странице «Авто», чтобы вёрстка не разъезжалась. */}
          <div className="mt-5">
            <CarSpecChips />
          </div>

          {/* Рекомендация-плашка — самое срочное обслуживание */}
          {topRec ? (
            <RecommendationStrip
              message={
                topRec.is_due
                  ? `${topRec.title} — уже пора`
                  : topRec.remaining_mileage_km != null
                    ? `${topRec.title} — примерно через ${formatMileage(topRec.remaining_mileage_km)}`
                    : topRec.title
              }
            />
          ) : null}

          {/* Та же кнопка, что на странице «Авто» — заказчик просил, чтобы с
              блока активного авто можно было записаться сразу. */}
          <div className="mt-5">
            <BookServiceCTA />
          </div>
        </div>
      </div>
    </Card>
  )
}

function RecommendationStrip({ message }: { message: string }) {
  return (
    <div className="mt-5 flex flex-col items-start gap-3 rounded-sct border-l-4 border-brandYellow bg-brandYellow/15 p-3 md:flex-row md:items-center md:justify-between md:p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-xl">⏳</div>
        <p className="text-[12px] font-bold uppercase tracking-tight text-textPrimary">
          {message}
        </p>
      </div>
      <Link
        to="/services"
        className="shrink-0 rounded-md bg-brandBlue px-3 py-2 text-[10px] font-900 uppercase tracking-widest text-white hover:bg-brandBlueDark"
      >
        Посмотреть пакет
      </Link>
    </div>
  )
}
