/**
 * Runtime-типы для дефолтных услуг (DefaultServicePage).
 *
 * Свежая схема (Template (3).yaml) уже содержит `ClientDefaultServicePage`
 * и `ClientPackagesPage.default_services`, НО под-типизированы: `price`
 * приходит как `object/additionalProperties {}`, а `what_is_included` /
 * `why_price_depends` — без типа элементов (`unknown`). Поэтому держим
 * эргономичный runtime-тип здесь (как `service-book/types.ts`) и через
 * `Omit` подменяем сгенерированный `default_services`, чтобы не конфликтовать
 * с автогеном. Когда бэк типизирует эти поля — переедем на Schemas[...].
 */
import type { ClientPackageCategory, ClientPackagesPage } from '@/shared/api/types'

export interface DefaultServiceMoney {
  amount?: string | null
  currency?: string
  display?: string
}

export interface ClientDefaultServicePage {
  id: number
  /** Дискриминатор типа услуги: всегда 'default_service_page'. */
  service_source_type: string
  category?: ClientPackageCategory | null
  title: string
  slug?: string
  status?: string
  status_display?: string
  short_description?: string
  description?: string
  hero_eyebrow?: string
  availability_title?: string
  availability_message?: string
  /** У дефолтной услуги обычно null — точной цены нет. */
  price?: DefaultServiceMoney | null
  price_note?: string
  important_note?: string
  /** Список пунктов «что входит в услугу». */
  what_is_included?: string[]
  /** Список причин, почему цена зависит от авто (иногда бэк шлёт строкой). */
  why_price_depends?: string[] | string
  is_featured?: boolean
  sort_order?: number
  /** Картинка услуги (PR #11). Нет картинки — пустая строка, а не null. */
  image_url?: string
}

/**
 * Ответ GET /client_endpoints/packages/ по свежей схеме: к старому
 * `ClientPackagesPage` добавлен массив `default_services`.
 */
export type PackagesPageData = Omit<ClientPackagesPage, 'default_services'> & {
  default_services?: ClientDefaultServicePage[]
}
