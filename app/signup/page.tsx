'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signup, type SignupState } from './actions'

const initialState: SignupState = { error: null, success: false }

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signup, initialState)

  if (state.success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">가입 확인 이메일을 보냈어요</h1>
        <p className="text-sm text-gray-500">
          받은편지함에서 인증 링크를 클릭하면 가입이 완료됩니다.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-semibold">회원가입</h1>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          이메일
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호
          <input
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          비밀번호 확인
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          닉네임
          <input
            type="text"
            name="nickname"
            required
            maxLength={20}
            autoComplete="nickname"
            className="rounded border px-3 py-2"
          />
        </label>
        {state.error && <p className="text-sm text-red-500">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? '가입 중...' : '가입하기'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="underline">
          로그인
        </Link>
      </p>
    </main>
  )
}
