# Coin Purchase (In-App Purchase) — Design

## Goal

Let users buy coins with real money via native store payments (App Store / Google Play), so the
existing earn/spend coin economy (30 coins to unlock an episode, 20 coins/day from check-in ad
reward) has a paid top-up path. Subscriptions/VIP are explicitly out of scope for this iteration —
coin packs only.

## Scope decisions (from brainstorming)

- **Coins only**, no subscription tier.
- **iOS + Android simultaneously.**
- **RevenueCat** for receipt validation, not a hand-rolled Apple/Google receipt-verification edge
  function — coin issuance is security-sensitive (a receipt-validation bug mints free coins), and
  RevenueCat already solves signature verification, retries, and cross-store normalization. The
  trade-off (revenue share above $2.5k/mo tracked revenue, one more vendor) is accepted in
  exchange for not maintaining custom receipt-parsing crypto code.
- **5 fixed coin packages**, tiered with increasing bonus %:

  | Price  | Coins | Bonus | Episodes (@30 coins) |
  |--------|-------|-------|-----------------------|
  | $0.99  | 120   | —     | 4                     |
  | $4.99  | 650   | +8%   | 21                    |
  | $9.99  | 1,400 | +16%  | 46                    |
  | $19.99 | 3,000 | +25%  | 100                   |
  | $39.99 | 6,500 | +35%  | 216                   |

- **Refunds/cancellations are not auto-clawed-back** in this iteration — coins are a low-value
  consumable, store refunds for them are rare, and building automatic balance reversal adds real
  complexity (negative balances, disputed unlocks already spent) for little practical benefit.
  Handled manually by an admin if it ever comes up.

## Architecture

```
coin-shop screen --purchasePackage()--> RevenueCat SDK (react-native-purchases)
                                              |
                                  App Store / Play Billing charges the user
                                              |
                                              v
                                  RevenueCat servers (receipt validation)
                                              |
                                  webhook (signed) --> Supabase Edge Function
                                       supabase/functions/revenuecat-webhook
                                              |
                                              v
                            credit_coin_purchase(tx_id, user_id, coins) RPC
                                       (SECURITY DEFINER, Postgres)
```

This mirrors the existing `unlock_episode` / `claim_ad_reward` shape: the only way
`profiles.coin_balance` changes is through a `SECURITY DEFINER` function that
`protect_privileged_profile_columns` still blocks clients from writing to directly. The new piece
is that the *caller* of `credit_coin_purchase` is the webhook edge function (service role), not the
end user — unlike `unlock_episode`, this RPC must **not** be granted to `authenticated`, or a
client could call it directly to self-credit coins.

**RevenueCat ↔ Supabase identity mapping:** the app configures
`Purchases.configure({ apiKey, appUserID: session.user.id })`, pinning RevenueCat's
`app_user_id` to the Supabase auth UID. The webhook payload's `app_user_id` is then used as
`profiles.id` directly, with no extra lookup step.

## Data model

New migration, `supabase/migrations/20260803120000_coin_purchases.sql`:

```sql
create table if not exists public.coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  revenuecat_transaction_id text not null unique,
  coin_amount integer not null,
  created_at timestamptz not null default now()
);

alter table public.coin_purchases enable row level security;

create policy "Users can view their own coin purchases"
  on public.coin_purchases for select
  using (auth.uid() = user_id);

grant select on public.coin_purchases to authenticated;

-- Only credit_coin_purchase() writes here (SECURITY DEFINER); no insert/update/delete
-- grants for authenticated or the webhook's role, so a purchase can only be recorded
-- through the coin-crediting flow below.

create or replace function public.credit_coin_purchase(
  p_transaction_id text,
  p_user_id uuid,
  p_coin_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance integer;
begin
  if exists (
    select 1 from public.coin_purchases where revenuecat_transaction_id = p_transaction_id
  ) then
    -- Webhook retry for a transaction already credited — no-op, not an error,
    -- so RevenueCat's retry doesn't get treated as a delivery failure.
    select coin_balance into v_new_balance from public.profiles where id = p_user_id;
    return jsonb_build_object('already_credited', true, 'coin_balance', v_new_balance);
  end if;

  update public.profiles
    set coin_balance = coin_balance + p_coin_amount
    where id = p_user_id
    returning coin_balance into v_new_balance;

  if not found then
    raise exception '프로필을 찾을 수 없습니다.';
  end if;

  insert into public.coin_purchases (user_id, revenuecat_transaction_id, coin_amount)
    values (p_user_id, p_transaction_id, p_coin_amount);

  return jsonb_build_object('already_credited', false, 'coin_balance', v_new_balance);
end;
$$;

-- Deliberately NOT granted to `authenticated` — only the webhook (using the
-- service_role key) may call this, unlike unlock_episode/claim_ad_reward which
-- the logged-in user calls themselves.
revoke all on function public.credit_coin_purchase(text, uuid, integer) from public;
grant execute on function public.credit_coin_purchase(text, uuid, integer) to service_role;
```

The `revenuecat_transaction_id` unique constraint is the idempotency key: a duplicate webhook
delivery (RevenueCat retries on non-2xx, and occasionally redelivers regardless) hits the
`exists` branch and returns the current balance unchanged instead of double-crediting.

## Edge function

`supabase/functions/revenuecat-webhook/index.ts`, following `delete-account`'s convention
(Deno + `@supabase/supabase-js`) but using the **service role** client, since this runs with no
end-user session — it's called by RevenueCat's servers, authenticated only by a shared secret:

1. Verify the `Authorization` header against the webhook secret configured in the RevenueCat
   dashboard; reject with 401 if it doesn't match.
2. Parse the event body; only handle `event.type === 'NON_RENEWING_PURCHASE'` (RevenueCat's event
   type for one-time/consumable purchases). Other event types (there are none relevant yet, since
   there's no subscription product) return 200 without action, so RevenueCat doesn't retry them
   forever.
3. Map `event.app_user_id` → `user_id`, `event.product_id` → coin amount (a small in-function
   lookup table mirroring the 5-tier pricing table above — product IDs are the source of truth,
   not a price parsed from the payload), `event.id` (or `event.transaction_id`) → transaction id.
4. Call `credit_coin_purchase` via the service-role Supabase client.
5. Return 200 on success (including the "already credited" no-op case) so RevenueCat marks the
   webhook delivered; return 500 only on genuine failure (e.g. `user_id` not found) so RevenueCat
   retries.

## Client

- `src/hooks/use-coin-packages.ts` — new hook, mirrors the shape of `src/lib/dramas.ts` /
  `use-dramas.ts`: wraps `Purchases.getOfferings()` and returns the 5 packages plus
  loading/error state.
- `src/app/coin-shop.tsx` — new route. Card list (visually following `drama-row.tsx`'s existing
  card conventions) showing coins + bonus % + price per package, highest-bonus tier marked
  "베스트". Tapping a card calls `Purchases.purchasePackage`, shows a "처리 중" spinner, then:
  - **On success**: poll `profiles.coin_balance` (reusing `mypage.tsx`'s existing
    `useFocusEffect`-style refetch, but on an interval instead of focus) for a few seconds until it
    increases, showing an updated-balance animation; on timeout show "곧 반영됩니다, 마이페이지에서
    확인해주세요" and let the webhook catch up asynchronously — the webhook is the only real
    source of truth for the balance, so this is a UX nicety, not a correctness dependency.
  - **On user-cancelled**: silently reset, no error alert.
  - **On genuine purchase error**: error alert.
- `mypage.tsx`: add a "충전하기" button next to the coin balance, navigating to `/coin-shop`.
- **Expo Go guard**: `react-native-purchases` is a native module and cannot load under Expo Go
  (same category of problem the recent google-mobile-ads crash fix addressed). `coin-shop.tsx`
  detects Expo Go (`Constants.appOwnership === 'expo'` / `Constants.executionEnvironment`) and
  shows "개발 빌드에서만 구매를 테스트할 수 있습니다" instead of initializing the SDK, rather than
  crashing the tab.

## Non-goals

- Subscriptions/VIP tier (may be a future follow-up spec, once this consumable-purchase
  infrastructure exists).
- Automatic refund/cancellation clawback.
- Restoring purchases across devices (N/A for consumables — coins are already tied to the
  Supabase account, not the device, once credited).

## Prerequisites (operational, outside this PR's code)

1. Register 5 consumable products (`coin_pack_1`..`coin_pack_5`) in App Store Connect and Google
   Play Console with matching prices.
2. Create a RevenueCat project, connect both stores, obtain SDK API keys, configure the webhook
   URL + shared secret pointing at `revenuecat-webhook`.
3. Add an EAS dev-client build profile (`eas.json` doesn't exist in this repo yet) — required
   because `react-native-purchases` needs native code Expo Go can't run.

## Files touched

1. `supabase/migrations/20260803120000_coin_purchases.sql` (new)
2. `supabase/functions/revenuecat-webhook/index.ts` (new)
3. `src/hooks/use-coin-packages.ts` (new)
4. `src/app/coin-shop.tsx` (new)
5. `src/app/_layout.tsx` (register the new route)
6. `src/app/(tabs)/mypage.tsx` (add "충전하기" button)
7. `package.json` (add `react-native-purchases` + its Expo config plugin)
8. `app.json` (register the config plugin)
9. `eas.json` (new — dev-client build profile)

## Verification

- `npx tsc --noEmit` clean.
- Postgres: call `credit_coin_purchase` twice with the same `p_transaction_id` and confirm the
  second call is a no-op (`already_credited: true`, balance unchanged).
- Edge function: request with a bad/missing signature returns 401; a well-formed
  `NON_RENEWING_PURCHASE` payload returns 200 and increases the target user's `coin_balance`;
  resending the identical payload still returns 200 without a second credit.
- Sandbox purchase QA: iOS Sandbox tester account and an Android license-test account, one real
  purchase per tier (5 total), confirming the coin-shop balance updates and `coin_purchases` gets
  a row.
- `npx expo start` in Expo Go: confirm `coin-shop.tsx` shows the "개발 빌드에서만..." message
  instead of crashing, and no other tab regresses (matching the diligence from the prior
  google-mobile-ads Expo Go crash fix).
