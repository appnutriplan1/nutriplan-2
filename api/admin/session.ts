import { createHmac, timingSafeEqual } from 'node:crypto'

type ApiRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: { password?: unknown }
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const COOKIE_NAME = 'nutriplan_admin_session'
const SESSION_TTL_SECONDS = 60 * 60 * 8

function secret(): string | null {
  return process.env.ADMIN_PASSWORD || null
}

function readCookie(header: string | string[] | undefined, name: string): string | null {
  const value = Array.isArray(header) ? header[0] : header
  const cookie = value?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null
}

function signature(value: string, key: string) {
  return createHmac('sha256', key).update(value).digest('base64url')
}

function createSession(key: string) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000
  const payload = `admin.${expiresAt}`
  return `${payload}.${signature(payload, key)}`
}

function isValidSession(token: string | null, key: string) {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'admin') return false
  const payload = `${parts[0]}.${parts[1]}`
  const expected = signature(payload, key)
  const received = parts[2]
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) return false
  return Number(parts[1]) > Date.now()
}

function clearCookie(res: ApiResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`)
}

export default function handler(req: ApiRequest, res: ApiResponse) {
  const key = secret()
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (!key) {
    res.status(503).json({ error: 'ADMIN_NO_CONFIGURADO' })
    return
  }

  if (req.method === 'GET') {
    res.status(200).json({ authenticated: isValidSession(readCookie(req.headers.cookie, COOKIE_NAME), key) })
    return
  }

  if (req.method === 'DELETE') {
    clearCookie(res)
    res.status(200).json({ authenticated: false })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METODO_NO_PERMITIDO' })
    return
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const given = Buffer.from(password)
  const expected = Buffer.from(key)
  const correct = given.length === expected.length && timingSafeEqual(given, expected)
  if (!correct) {
    res.status(401).json({ error: 'CREDENCIALES_INVALIDAS' })
    return
  }

  const session = createSession(key)
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(session)}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`)
  res.status(200).json({ authenticated: true })
}
