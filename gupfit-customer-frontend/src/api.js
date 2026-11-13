export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isMultipart ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const details = Object.values(payload).flat(Infinity).filter(Boolean)
    throw new Error(details.join(' ') || `Request failed with HTTP ${response.status}.`)
  }
  return payload
}

export function displayDate(date) {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(year, month - 1, day))
}
