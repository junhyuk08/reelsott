import { createClient } from 'npm:@supabase/supabase-js@2'
import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const body = await req.json().catch(() => null)
    const password = body?.password

    if (typeof password !== 'string' || !password) {
      return Response.json({ error: '비밀번호를 입력해주세요.' }, { status: 400 })
    }

    const email = ctx.userClaims?.email
    const userId = ctx.userClaims?.id

    if (!email || !userId) {
      return Response.json({ error: '인증 정보를 확인할 수 없습니다.' }, { status: 401 })
    }

    // Re-confirm the caller actually knows the password before deleting
    // anything — a valid access token alone isn't proof of that.
    const verifyClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({ email, password })

    if (verifyError) {
      return Response.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 401 })
    }

    // public.profiles has `on delete cascade` on its auth.users FK, so the
    // profile row is removed automatically along with the account.
    const { error: deleteError } = await ctx.supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      // GoTrue admin errors aren't meant for end users — never forward
      // deleteError.message as-is.
      return Response.json({ error: '탈퇴 처리 중 오류가 발생했습니다.' }, { status: 500 })
    }

    return Response.json({ success: true })
  }),
}
