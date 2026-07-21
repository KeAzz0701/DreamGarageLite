// frontend/middleware.ts

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ライセンス認証画面は常に表示
  if (pathname === '/license') {
    return NextResponse.next();
  }

  const companyId = request.cookies.get('companyId');

  // 未認証ならライセンス画面へ
  if (!companyId) {
    return NextResponse.redirect(
      new URL('/license', request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/customer/:path*',
    '/vehicle/:path*',
    '/ocr/:path*',
    '/settings/:path*',
  ],
};