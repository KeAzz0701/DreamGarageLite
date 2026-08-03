'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Fields = {
  company: string
  name: string
  email: string
  phone: string
  message: string
}

type Errors = Partial<Record<keyof Fields, string>>

const initialFields: Fields = {
  company: '',
  name: '',
  email: '',
  phone: '',
  message: '',
}

function validate(fields: Fields): Errors {
  const errors: Errors = {}
  if (!fields.company.trim()) errors.company = '会社名を入力してください。'
  if (!fields.name.trim()) errors.name = 'お名前を入力してください。'
  if (!fields.email.trim()) {
    errors.email = 'メールアドレスを入力してください。'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = 'メールアドレスの形式が正しくありません。'
  }
  if (fields.phone.trim() && !/^[0-9+\-() ]{7,20}$/.test(fields.phone)) {
    errors.phone = '電話番号の形式が正しくありません。'
  }
  if (!fields.message.trim()) errors.message = 'お問い合わせ内容を入力してください。'
  return errors
}

const fieldBase =
  'w-full rounded-lg border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-3 focus:ring-primary/20'

export function ContactForm() {
  const [fields, setFields] = useState<Fields>(initialFields)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  function update(key: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nextErrors = validate(fields)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setStatus('submitting')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      if (!res.ok) throw new Error('request failed')
      setStatus('success')
      setFields(initialFields)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-black tracking-tight">送信が完了しました</h2>
        <p className="mt-3 max-w-md text-pretty leading-relaxed text-muted-foreground">
          お問い合わせありがとうございます。内容を確認のうえ、2営業日以内に担当者よりご連絡いたします。
        </p>
        <Button
          variant="outline"
          size="lg"
          className="mt-6"
          onClick={() => setStatus('idle')}
        >
          続けて問い合わせる
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="grid gap-5">
        <Field label="会社名" htmlFor="company" required error={errors.company}>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            value={fields.company}
            onChange={(e) => update('company', e.target.value)}
            aria-invalid={!!errors.company}
            placeholder="◯◯自動車整備株式会社"
            className={cn(fieldBase, errors.company ? 'border-destructive' : 'border-input')}
          />
        </Field>

        <Field label="お名前" htmlFor="name" required error={errors.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={fields.name}
            onChange={(e) => update('name', e.target.value)}
            aria-invalid={!!errors.name}
            placeholder="山田 太郎"
            className={cn(fieldBase, errors.name ? 'border-destructive' : 'border-input')}
          />
        </Field>

        <Field label="メールアドレス" htmlFor="email" required error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={(e) => update('email', e.target.value)}
            aria-invalid={!!errors.email}
            placeholder="example@garage.co.jp"
            className={cn(fieldBase, errors.email ? 'border-destructive' : 'border-input')}
          />
        </Field>

        <Field label="電話番号" htmlFor="phone" optional error={errors.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={fields.phone}
            onChange={(e) => update('phone', e.target.value)}
            aria-invalid={!!errors.phone}
            placeholder="00-0000-0000"
            className={cn(fieldBase, errors.phone ? 'border-destructive' : 'border-input')}
          />
        </Field>

        <Field label="お問い合わせ内容" htmlFor="message" required error={errors.message}>
          <textarea
            id="message"
            name="message"
            rows={6}
            value={fields.message}
            onChange={(e) => update('message', e.target.value)}
            aria-invalid={!!errors.message}
            placeholder="ご質問・ご相談内容をご記入ください。"
            className={cn(fieldBase, 'resize-y', errors.message ? 'border-destructive' : 'border-input')}
          />
        </Field>
      </div>

      {status === 'error' && (
        <p className="mt-5 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          送信に失敗しました。お手数ですが、しばらくしてからもう一度お試しください。
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={status === 'submitting'}
        className="mt-7 h-12 w-full text-base font-bold"
      >
        {status === 'submitting' ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            送信中...
          </>
        ) : (
          '送信する'
        )}
      </Button>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
        ご入力いただいた個人情報は、お問い合わせへの対応のためにのみ利用いたします。
      </p>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  required,
  optional,
  error,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  optional?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-bold">
        {label}
        {required && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">必須</span>
        )}
        {optional && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">任意</span>
        )}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
