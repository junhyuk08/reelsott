'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export type LoginState = {
  error: string | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = (formData.get('identifier') as string)?.trim()
  const password = formData.get('password') as string

  if (!identifier || !password) {
    return { error: '이메일(또는 닉네임)과 비밀번호를 입력해주세요.' }
  }

  const supabase = await createClient()

  let email = identifier
  if (!EMAIL_REGEX.test(identifier)) {
    const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
      'get_email_by_nickname',
      { p_nickname: identifier }
    )

    if (lookupError || !resolvedEmail) {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }

    email = resolvedEmail
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  redirect('/')
}
