import { NextResponse } from 'next/server'

// フォーム自体はこのNext.jsアプリのAPIルートで受け、実際の保存・運営者への通知は
// 既存のガレージ・カルテ本体API(api.dreamgaragelite.com)側の /marketing-inquiries に
// 任せる(運営者LINE通知の仕組みをそちらで一元管理しているため)
const API_BASE = process.env.GARAGE_KARTE_API_URL || 'https://api.dreamgaragelite.com/api'

export async function POST(request: Request) {
  let data: Record<string, unknown>
  try {
    data = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const required = ['company', 'name', 'email', 'message'] as const
  const missing = required.filter((key) => {
    const value = data[key]
    return typeof value !== 'string' || value.trim() === ''
  })

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: 'missing_fields', fields: missing }, { status: 422 })
  }

  try {
    const res = await fetch(`${API_BASE}/marketing-inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'upstream_error' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}