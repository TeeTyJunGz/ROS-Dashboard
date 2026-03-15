export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const requestOptions = {
    credentials: 'include',
    ...options,
    headers,
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (options.body && headers.get('Content-Type') === 'application/json' && typeof options.body !== 'string') {
    requestOptions.body = JSON.stringify(options.body)
  }

  const response = await fetch(path, requestOptions)
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status, data)
  }

  return data
}