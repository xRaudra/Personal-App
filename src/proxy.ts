import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

/** Protect the standalone app and its integrations with a server-side password. */
export function proxy(request: NextRequest) {
  // Twilio cannot use interactive Basic auth; its route verifies the Twilio signature.
  if (request.nextUrl.pathname === '/api/whatsapp/incoming') return NextResponse.next()

  const password = process.env.PERSONAL_APP_PASSWORD
  if (!password) {
    return new NextResponse('Personal App is awaiting its access-password configuration.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  }

  const header = request.headers.get('authorization')
  if (header?.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
    const separator = decoded.indexOf(':')
    const candidate = separator < 0 ? '' : decoded.slice(separator + 1)
    const actual = Buffer.from(candidate)
    const expected = Buffer.from(password)
    if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
      const response = NextResponse.next()
      response.headers.set('Cache-Control', 'private, no-store')
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Personal App", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.svg|robots.txt).*)'],
}
