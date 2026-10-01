/**
 * Единое место со всеми URL'ами API. Если бэк переименует ручку — правим
 * только тут.
 *
 * Источник: additional/schema.yml + ответы бэкендщика.
 * Список синхронизирован с реальной schema OpenAPI на момент запуска проекта.
 */

export const endpoints = {
  // --- Клиент: авторизация ---
  clientLogin: '/api/v1/client_endpoints/auth/login/',
  clientRegister: '/api/v1/client_endpoints/auth/register/',
  // Регистрация теперь двухэтапная: register → SMS → register/verify.
  clientRegisterVerify: '/api/v1/client_endpoints/auth/register/verify/',
  clientRegisterResend: '/api/v1/client_endpoints/auth/register/resend/',
  clientRefresh: '/api/v1/client_endpoints/auth/refresh/',
  clientProfile: '/api/v1/client_endpoints/auth/profile/',
  clientDeleteAccount: '/api/v1/client_endpoints/auth/delete-account/',

  // --- Клиент: восстановление пароля по SMS ---
  clientPasswordResetRequest: '/api/v1/client_endpoints/auth/password-reset/request/',
  clientPasswordResetConfirm: '/api/v1/client_endpoints/auth/password-reset/confirm/',

  // --- Клиент: гараж ---
  garageCars: '/api/v1/client_endpoints/garage/cars/',
  garageCar: (id: number) => `/api/v1/client_endpoints/garage/cars/${id}/`,
  garageCarSetDefault: (id: number) =>
    `/api/v1/client_endpoints/garage/cars/${id}/set-default/`,
  garageFormPageData: '/api/v1/client_endpoints/garage/form-page-data/',

  // --- Клиент: пакеты ---
  packages: '/api/v1/client_endpoints/packages/',
  package: (id: number) => `/api/v1/client_endpoints/packages/${id}/`,
  defaultService: (id: number) =>
    `/api/v1/client_endpoints/packages/default-services/${id}/`,

  // --- Клиент: сервисная книжка ---
  serviceBookPageData: '/api/v1/client_endpoints/service-book/page-data/',

  // --- Клиент: записи на сервис (booking) ---
  // list/detail/create/edit/cancel — все ручки в бэке есть и работают.
  bookings: '/api/v1/client_endpoints/service-book/bookings/',
  booking: (id: number) => `/api/v1/client_endpoints/service-book/bookings/${id}/`,
  bookingCancel: (id: number) =>
    `/api/v1/client_endpoints/service-book/bookings/${id}/cancel/`,
  createBooking: '/api/v1/client_endpoints/service-book/create_booking/',
  // Свободные старты на дату с учётом занятости боксов (бэк PR #11).
  availableSlots: '/api/v1/client_endpoints/service-book/available-slots/',

  // --- Клиент: филиалы (service stations) ---
  // Возвращают список с встроенным расписанием на N дней (по умолчанию 7).
  serviceStations: '/api/v1/client_endpoints/service_stations/',
  serviceStation: (id: number) =>
    `/api/v1/client_endpoints/service_stations/${id}/`,

  // --- Публичный конфигуратор авто (используется в add_car / change) ---
  carsMarks: '/api/v1/cars/marks/',
  carsModels: '/api/v1/cars/models/',
  carsFilters: '/api/v1/cars/filters/',
  carsModifications: '/api/v1/cars/modifications/',
  carsTrims: '/api/v1/cars/trims/',

  // --- Публичное: акция месяца на главной (без авторизации) ---
  homePromotion: '/api/v1/public/home-promotion/',
} as const
