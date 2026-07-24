'use server'

import { createClient } from '@/utils/supabase/server'

export type SignupState = {
  error: string | null
  success: boolean
}

export async function signup(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const nickname = (formData.get('nickname') as string)?.trim()

  if (!email || !password || !confirmPassword || !nickname) {
    return { error: '모든 항목을 입력해주세요.', success: false }
  }

  if (password !== confirmPassword) {
    return { error: '비밀번호가 일치하지 않습니다.', success: false }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname },
    },
  })

  if (error) {
    return { error: error.message, success: false }
  }

  return { error: null, success: true }
}
