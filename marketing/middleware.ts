import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Temporary gate: only the pilot-monitor recruitment page is public while the paid
// funnel's legal disclosures (特定商取引法表記・利用規約の実運営者情報) and payment
// terms are still unresolved (see Addness goal 1bdf1396, paused). Everything else
// redirects to /monitor until that goal is explicitly completed.
const ALLOWED_PREFIXES = ['/monitor', '/_next', '/api/contact', '/favicon', '/icon', '/apple-icon', '/manual', '/hero-garage.png', '/placeholder']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (ALLOWED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next()
  return NextResponse.redirect(new URL('/monitor', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
