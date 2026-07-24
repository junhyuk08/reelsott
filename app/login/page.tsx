'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login, type LoginState } from './actions'

const initialState: LoginState = { error: null }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">로그인</h1>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          이메일 또는 닉네임
          <input
            type="text"
            name="identifier"
            required
            autoComplete="username"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded border px-3 py-2"
          />
        </label>
        {state.error && <p className="text-sm text-red-500">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="underline">
          회원가입
        </Link>
      </p>
    </main>
  )
}
