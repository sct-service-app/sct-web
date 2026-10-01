/**
 * Детальная страница дефолтной услуги (DefaultServicePage).
 *
 * Вёрстка по макету бэкендщика (Figma img_6..19 / *_default_short.html).
 * Источник данных: GET /client_endpoints/packages/default-services/{id}/.
 *
 * Бóльшая часть собрана на реальных полях API (title, hero_eyebrow,
 * short_description, description, price_note, availability_title/message,
 * important_note, what_is_included[], why_price_depends[], category).
 * Полей, которых в API нет (время работ, шаги процесса, фото), в макете
 * нет данных — даём нейтральную статику/плейсхолдеры (по согласованию).
 *
 * Прим.: italic в проекте убран глобально — в макете он есть, тут НЕ
 * используем.
 */
import { Link, useParams } from 'react-router-dom'
import { useDefaultServiceQuery } from '@/features/packages/queries'
import { Spinner } from '@/shared/ui/Spinner'
import { Card } from '@/shared/ui/Card'
import { Button } from '@/shared/ui/Button'
import { SafeImage } from '@/shared/ui/SafeImage'

/** Нейтральные шаги процесса — в API их нет, одинаковы для любой услуги. */
const PROCESS_STEPS = [
  { n: '01', title: 'Заявка', text: 'Оставляете заявку на услугу с выбором филиала и удобного времени.' },
  { n: '02', title: 'Осмотр авто', text: 'Мастер проверяет автомобиль и подбирает подходящие материалы.' },
  { n: '03', title: 'Расчёт стоимости', text: 'Согласовываем точную цену именно под ваш автомобиль.' },
  { n: '04', title: 'Выполнение работ', text: 'Выполняем услугу и контролируем результат перед выдачей.' },
]

export default function DefaultServiceDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id ? Number(params.id) : undefined
  const { data, isLoading, isError } = useDefaultServiceQuery(id)

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isError || !data || !id) {
    return (
      <section className="container-sct py-12">
        <Card className="p-6 text-center">
          <p className="font-bold text-red-700">Услуга не найдена.</p>
          <Link to="/services" className="mt-4 inline-block">
            <Button variant="ghost" size="sm">
              К услугам
            </Button>
          </Link>
        </Card>
      </section>
    )
  }

  const priceText = data.price?.display || data.price_note || 'Цена рассчитывается индивидуально'
  const included = Array.isArray(data.what_is_included) ? data.what_is_included.filter(Boolean) : []
  const why = normalizeList(data.why_price_depends)
  const accent = data.category?.color || '#1F5FAF'
  const bookHref = `/services/${id}/book?type=default`

  return (
    <section className="container-sct py-6 md:py-8">
      {/* Хлебные крошки */}
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-[11px] font-900 uppercase tracking-widest text-textSecondary md:mb-6">
        <Link to="/services" className="transition-colors hover:text-brandBlue">
          Услуги
        </Link>
        <span className="opacity-40">/</span>
        <span className="text-textPrimary">{data.title}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12 md:gap-8">
        {/* === Контент === */}
        <div className="space-y-6 xl:col-span-8">
          {/* Hero */}
          <div className="relative overflow-hidden rounded-sct-lg border border-borderLight bg-white p-5 shadow-soft-card md:p-8">
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ background: `linear-gradient(90deg, ${accent}, #F2C94C)` }}
            />
            {/* Картинка услуги (бэк PR #11). Пустая строка — картинки нет. */}
            {data.image_url ? (
              <div className="mb-5 flex aspect-[2/1] max-h-72 w-full items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                <SafeImage
                  src={data.image_url}
                  alt={data.title}
                  className="h-full w-full object-contain"
                  fallback={null}
                />
              </div>
            ) : null}
            <div className="mb-5 flex flex-wrap items-center gap-2 md:gap-3">
              <Pill className="bg-blue-50 text-brandBlue">Услуга для вашего авто</Pill>
              {data.category?.name && (
                <Pill className="bg-green-50 text-green-700">{data.category.name}</Pill>
              )}
              <Pill className="bg-orange-50 text-orange-700">{priceText}</Pill>
            </div>

            <p className="mb-3 text-[11px] font-900 uppercase tracking-[0.18em] text-brandBlue">
              {data.hero_eyebrow || 'Детальная информация об услуге'}
            </p>
            <h1 className="text-3xl font-900 uppercase leading-[0.98] tracking-tight text-textPrimary md:text-5xl">
              {data.title}
            </h1>

            {(data.short_description || data.description) && (
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-textSecondary md:text-lg">
                {data.short_description || data.description}
              </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
              <MiniCard label="Тип услуги" value={data.category?.name || 'Сервис'} />
              <MiniCard label="Расчёт цены" value="После заявки и осмотра" />
              <MiniCard label="Стоимость" value={priceText} accent />
            </div>
          </div>

          {/* Почему так / доступность */}
          {(data.availability_title || data.availability_message) && (
            <div className="relative overflow-hidden rounded-sct-lg border border-borderLight bg-gradient-to-r from-blue-50 via-white to-yellow-50 p-5 md:p-7">
              <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-12 md:gap-6">
                <div className="md:col-span-8">
                  <p className="mb-3 text-[11px] font-900 uppercase tracking-[0.18em] text-brandBlue">
                    Почему индивидуально
                  </p>
                  {data.availability_title && (
                    <h2 className="mb-3 text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
                      {data.availability_title}
                    </h2>
                  )}
                  {data.availability_message && (
                    <p className="max-w-3xl text-sm leading-relaxed text-textSecondary md:text-base">
                      {data.availability_message}
                    </p>
                  )}
                </div>
                <div className="md:col-span-4">
                  <div className="rounded-sct border border-borderLight bg-white p-5 text-center shadow-soft-card">
                    <p className="mb-2 text-[11px] font-900 uppercase tracking-widest text-textSecondary">
                      Стоимость
                    </p>
                    <div className="text-xl font-900 leading-tight text-brandBlue">{priceText}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Состав услуги */}
          {included.length > 0 && (
            <div className="rounded-sct-lg border border-borderLight bg-white p-5 shadow-soft-card md:p-7">
              <p className="mb-2 text-[11px] font-900 uppercase tracking-[0.18em] text-brandBlue">
                Что входит
              </p>
              <h2 className="mb-6 text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
                Состав услуги
              </h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                {included.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-sct border border-borderLight bg-surfaceLight p-4"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brandBlue/10 text-[11px] font-900 text-brandBlue">
                      {i + 1}
                    </span>
                    <p className="text-sm font-bold text-textPrimary">{it}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Почему цена индивидуально */}
          {why.length > 0 && (
            <div className="rounded-sct-lg border border-borderLight bg-white p-5 shadow-soft-card md:p-7">
              <p className="mb-2 text-[11px] font-900 uppercase tracking-[0.18em] text-brandBlue">
                Стоимость
              </p>
              <h2 className="mb-5 text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
                Почему цена рассчитывается индивидуально
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {why.map((it, i) => (
                  <div key={i} className="rounded-sct border border-borderLight bg-surfaceLight p-5">
                    <p className="text-sm leading-relaxed text-textSecondary">{it}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Как проходит обслуживание (статика — в API нет) */}
          <div className="rounded-sct-lg border border-borderLight bg-white p-5 shadow-soft-card md:p-7">
            <p className="mb-2 text-[11px] font-900 uppercase tracking-[0.18em] text-brandBlue">
              Процесс
            </p>
            <h2 className="mb-6 text-2xl font-900 uppercase tracking-tight text-textPrimary md:text-3xl">
              Как проходит обслуживание
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {PROCESS_STEPS.map((s) => (
                <div key={s.n} className="rounded-sct border border-borderLight bg-surfaceLight p-5">
                  <div className="mb-3 text-[10px] font-900 uppercase tracking-widest text-brandBlue">
                    Шаг {s.n}
                  </div>
                  <h3 className="mb-2 text-base font-900 text-textPrimary">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-textSecondary">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* === Сайдбар === */}
        <aside className="space-y-6 xl:col-span-4">
          <div className="overflow-hidden rounded-sct-lg border border-borderLight bg-white shadow-soft-card xl:sticky xl:top-28">
            {/* Плейсхолдер-фото (в API изображения нет) */}
            <div
              className="flex h-[200px] items-center justify-center md:h-[260px]"
              style={{ background: `linear-gradient(135deg, ${accent}22, #F2C94C22)` }}
            >
              <ServiceGlyph />
            </div>

            <div id="booking" className="p-5 md:p-6">
              {data.important_note && (
                <div className="mb-5">
                  <p className="mb-2 text-[10px] font-900 uppercase tracking-widest text-textSecondary">
                    Важный момент
                  </p>
                  <div className="rounded-sct border border-blue-100 bg-blue-50 p-4">
                    <p className="text-sm font-bold leading-relaxed text-textPrimary">
                      {data.important_note}
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-6 space-y-3">
                <Link to={bookHref} className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    Записаться
                  </Button>
                </Link>
                <Link to="/contacts" className="block">
                  <Button variant="secondary" size="lg" fullWidth>
                    Уточнить стоимость
                  </Button>
                </Link>
              </div>

              <div className="rounded-sct border border-borderLight bg-surfaceLight p-4">
                <SpecRow label="Услуга" value={data.title} />
                {data.category?.name && <SpecRow label="Категория" value={data.category.name} />}
                <SpecRow label="Цена" value={priceText} accent />
                <SpecRow label="Расчёт" value="После осмотра авто" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Мобильный sticky-бар */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-borderLight bg-white/95 backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-[10px] font-900 uppercase tracking-widest text-textSecondary">
              Услуга
            </p>
            <p className="truncate text-sm font-900 text-textPrimary">{data.title}</p>
            <p className="mt-0.5 truncate text-[11px] font-900 text-brandBlue">{priceText}</p>
          </div>
          <Link
            to={bookHref}
            className="shrink-0 rounded-sct bg-brandBlue px-5 py-3 text-[12px] font-900 uppercase tracking-widest text-white"
          >
            Записаться
          </Link>
        </div>
      </div>
      {/* Отступ, чтобы sticky-бар не перекрывал контент на мобиле */}
      <div className="h-20 md:hidden" />
    </section>
  )
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[11px] font-900 uppercase tracking-widest ${className}`}
    >
      {children}
    </span>
  )
}

function MiniCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-sct border border-borderLight bg-surfaceLight p-4">
      <p className="mb-2 text-[10px] font-900 uppercase tracking-widest text-textSecondary">{label}</p>
      <p className={`text-sm font-900 md:text-base ${accent ? 'text-brandBlue' : 'text-textPrimary'}`}>
        {value}
      </p>
    </div>
  )
}

function SpecRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-surfaceMuted py-3 first:border-t-0">
      <span className="text-[11px] font-900 uppercase tracking-widest text-textSecondary">{label}</span>
      <span className={`text-right text-sm font-900 ${accent ? 'text-brandBlue' : 'text-textPrimary'}`}>
        {value}
      </span>
    </div>
  )
}

function ServiceGlyph() {
  return (
    <svg className="h-16 w-16 text-brandBlue/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
    </svg>
  )
}

function normalizeList(v: string[] | string | undefined): string[] {
  if (Array.isArray(v)) return v.filter(Boolean)
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}
