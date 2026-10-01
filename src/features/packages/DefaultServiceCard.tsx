/**
 * Карточка дефолтной услуги (блок «Услуги с индивидуальным расчётом»).
 *
 * Отличается от ServiceCard: точной цены нет — показываем price_note
 * («Цена рассчитывается индивидуально»), а кнопка зовёт не «купить», а
 * «Рассчитать стоимость». Ведёт на detail дефолтной услуги.
 */
import { Link } from 'react-router-dom'
import { SafeImage } from '@/shared/ui/SafeImage'
import type { ClientDefaultServicePage } from './types'

interface DefaultServiceCardProps {
  service: ClientDefaultServicePage
}

export function DefaultServiceCard({ service }: DefaultServiceCardProps) {
  const to = `/services/default/${service.id}`
  const note = service.price_note || 'Цена рассчитывается индивидуально'

  return (
    <article className="group flex flex-col rounded-sct border border-borderLight bg-white p-5 transition-all hover:-translate-y-1 hover:border-brandBlue/50 hover:shadow-soft-card">
      <Link to={to} className="flex flex-1 flex-col">
        {/* Картинка услуги с бэк PR #11; нет её — пустая строка, оставляем иконку. */}
        {service.image_url ? (
          <div className="mb-4 flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-xl bg-blue-50 text-brandBlue">
            <SafeImage
              src={service.image_url}
              alt={service.title}
              className="h-full w-full object-contain"
              fallback={<IconCalc />}
            />
          </div>
        ) : (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-brandBlue">
            <IconCalc />
          </div>
        )}

        <h3 className="line-clamp-2 text-base font-900 uppercase leading-tight tracking-tight text-textPrimary">
          {service.title}
        </h3>

        {service.short_description && (
          <p className="mt-2 line-clamp-2 text-[13px] font-medium text-textSecondary">
            {service.short_description}
          </p>
        )}

        <div className="mt-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-textSecondary">
            Стоимость
          </p>
          <p className="mt-0.5 text-sm font-900 leading-snug tracking-tight text-brandBlue">
            {note}
          </p>
        </div>
      </Link>

      <Link
        to={to}
        className="mt-5 inline-flex items-center justify-center rounded-sct bg-brandBlue px-4 py-3 text-[11px] font-900 uppercase tracking-widest text-white transition-all group-hover:bg-brandBlueDark"
      >
        Рассчитать стоимость
      </Link>
    </article>
  )
}

function IconCalc() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="5" y="3" width="14" height="18" rx="2" strokeWidth={2} />
      <path strokeLinecap="round" strokeWidth={2} d="M9 7h6M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4" />
    </svg>
  )
}
