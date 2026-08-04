# Coin Purchase (RevenueCat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in user buy one of 5 fixed coin packages with real money (App Store / Google Play), crediting `profiles.coin_balance` only once a RevenueCat webhook confirms the store receipt.

**Architecture:** Client uses the RevenueCat SDK (`react-native-purchases`) to show offerings and start a native purchase; RevenueCat validates the receipt server-side and calls a Supabase Edge Function webhook (authenticated by a shared secret, not a Supabase user session), which calls a `SECURITY DEFINER` Postgres RPC that is the only writer of `coin_balance` for purchases — mirroring the existing `unlock_episode`/`claim_ad_reward` pattern. The client never credits coins itself; it only polls the balance for UX feedback.

**Tech Stack:** Expo SDK 54, Expo Router, Supabase (Postgres + Edge Functions/Deno), `react-native-purchases` 10.x (RevenueCat), TypeScript.

## Global Constraints

- Coin packages only — no subscription/VIP tier in this plan (spec explicitly scopes this out; see `docs/superpowers/specs/2026-08-03-coin-purchase-design.md`).
- Both iOS and Android ship together, not staggered.
- 5 fixed packages, product IDs `coin_pack_1`..`coin_pack_5` → 120 / 650 / 1,400 / 3,000 / 6,500 coins (bonuses +8/+16/+25/+35% baked into the coin counts, not shown as separate math).
- No automatic refund/cancellation clawback — out of scope.
- `react-native-purchases` is a native module with **no Expo Go support**. Every file that imports it must follow this repo's established guard, seen in `src/lib/init-ads.ts` / `src/lib/init-ads.web.ts` and `src/hooks/use-ad-reward.ts` / `.web.ts`: check `Constants.executionEnvironment === ExecutionEnvironment.StoreClient`, `require()` the module conditionally (never a static top-level `import`, which would throw immediately under Expo Go), and provide a `.web.ts` platform file with a no-op/stub implementation.
- Coin balance is only ever mutated through a `SECURITY DEFINER` RPC, never a direct client `update` — `protect_privileged_profile_columns` already blocks direct writes to `coin_balance` for the `authenticated` role.
- No automated test runner exists in this repo (no Jest, no pgTAP). Verification for every task is: `npx tsc --noEmit` (for TS changes) plus concrete manual steps with exact commands and expected output — the same convention used in every prior spec's "Verification" section (see `docs/superpowers/specs/2026-07-29-top10-view-count-design.md`).

---

### Task 1: `coin_purchases` table + `credit_coin_purchase` RPC

**Files:**
- Create: `supabase/migrations/20260803120000_coin_purchases.sql`

**Interfaces:**
- Produces: Postgres RPC `credit_coin_purchase(p_transaction_id text, p_user_id uuid, p_coin_amount integer) returns jsonb` — granted to `service_role` only (not `authenticated`). Returns `{"already_credited": boolean, "coin_balance": integer}`.
- Produces: table `public.coin_purchases(id, user_id, revenuecat_transaction_id unique, coin_amount, created_at)`, readable by its owning user via RLS.

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260803120000_coin_purchases.sql`:

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

-- Only credit_coin_purchase() writes here (SECURITY DEFINER); no insert/update/delete
-- grants for authenticated, so a purchase can only be recorded through the
-- coin-crediting flow below.
grant select on public.coin_purchases to authenticated;

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
    -- so RevenueCat's retry isn't treated as a delivery failure.
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
-- the logged-in user calls on themselves.
revoke all on function public.credit_coin_purchase(text, uuid, integer) from public;
grant execute on function public.credit_coin_purchase(text, uuid, integer) to service_role;
```

- [ ] **Step 2: Apply migrations locally and verify the schema**

Run: `supabase start` (if not already running), then `supabase db reset`
Expected: output ends with `Applying migration 20260803120000_coin_purchases.sql...` and no errors.

- [ ] **Step 3: Verify idempotency directly against the local DB**

Run (replace `<some-user-id>` with a real `id` from your local `profiles` table, found via
`select id, coin_balance from public.profiles limit 1;`):

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
select public.credit_coin_purchase('test-tx-1', '<some-user-id>', 650);
select public.credit_coin_purchase('test-tx-1', '<some-user-id>', 650);
select coin_balance from public.profiles where id = '<some-user-id>';
"
```

Expected: first call returns `{"already_credited": false, "coin_balance": N}`, second call (same
`test-tx-1`) returns `{"already_credited": true, "coin_balance": N}` with the **same** `N` — the
second call must not add another 650. The final `select` confirms the balance only went up once.

- [ ] **Step 4: Verify `authenticated` cannot call it directly**

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "
set role authenticated;
select public.credit_coin_purchase('test-tx-2', '<some-user-id>', 650);
"
```

Expected: `ERROR: permission denied for function credit_coin_purchase` — confirming a logged-in
client cannot self-credit coins by calling the RPC from the app.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260803120000_coin_purchases.sql
git commit -m "Add coin_purchases table and credit_coin_purchase RPC"
```

---

### Task 2: RevenueCat webhook Edge Function

**Files:**
- Create: `supabase/functions/revenuecat-webhook/index.ts`
- Modify: `supabase/config.toml` (disable JWT verification for this function)

**Interfaces:**
- Consumes: `credit_coin_purchase(p_transaction_id, p_user_id, p_coin_amount)` from Task 1.
- Produces: HTTP endpoint `revenuecat-webhook` that RevenueCat's dashboard is configured to call — no other code in this plan calls it directly.

- [ ] **Step 1: Add the function's config so Supabase doesn't require a Supabase JWT**

RevenueCat authenticates with its own shared secret (checked in code below), not a Supabase user
session, so the platform's default JWT verification must be turned off for this one function.
Add to `supabase/config.toml` (near the end of the file, matching the `[functions.<name>]` section
shape Supabase's config schema uses):

```toml
[functions.revenuecat-webhook]
verify_jwt = false
```

- [ ] **Step 2: Write the webhook handler**

`supabase/functions/revenuecat-webhook/index.ts`:

```ts
import { createClient } from 'npm:@supabase/supabase-js@2'

// product_id -> coin amount. RevenueCat's webhook payload identifies the
// product by id, not price, so this table (matching the 5-tier pricing in
// the coin-shop screen) is the source of truth for how many coins to credit.
const COIN_AMOUNT_BY_PRODUCT_ID: Record<string, number> = {
  coin_pack_1: 120,
  coin_pack_2: 650,
  coin_pack_3: 1400,
  coin_pack_4: 3000,
  coin_pack_5: 6500,
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  const authHeader = req.headers.get('Authorization')

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const event = body?.event

  if (!event || event.type !== 'NON_RENEWING_PURCHASE') {
    // Only consumable ("non-renewing") purchases exist in this app so far —
    // return 200 for anything else so RevenueCat doesn't retry it forever.
    return Response.json({ ignored: true })
  }

  const coinAmount = COIN_AMOUNT_BY_PRODUCT_ID[event.product_id]
  const userId = event.app_user_id
  const transactionId = event.id

  if (!coinAmount || !userId || !transactionId) {
    return Response.json({ error: 'unrecognized product or missing ids' }, { status: 400 })
  }

  // No end-user JWT to verify here (auth is the shared secret above, not a
  // Supabase session), so this uses the service-role key directly instead of
  // the withSupabase({ auth: 'user' }) wrapper delete-account uses.
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabaseAdmin.rpc('credit_coin_purchase', {
    p_transaction_id: transactionId,
    p_user_id: userId,
    p_coin_amount: coinAmount,
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true, ...data })
})
```

- [ ] **Step 3: Serve it locally and verify with a fake payload**

Run: `supabase functions serve revenuecat-webhook --env-file supabase/functions/.env --no-verify-jwt`

(Create `supabase/functions/.env` first, gitignored by `supabase/.gitignore`, with:
`REVENUECAT_WEBHOOK_SECRET=local-test-secret`)

In another terminal, with `<some-user-id>` from a local `profiles` row:

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/revenuecat-webhook \
  -H "Authorization: Bearer local-test-secret" \
  -H "Content-Type: application/json" \
  -d '{"event":{"type":"NON_RENEWING_PURCHASE","product_id":"coin_pack_2","app_user_id":"<some-user-id>","id":"test-tx-webhook-1"}}'
```

Expected: `HTTP/1.1 200 OK` with body `{"success":true,"already_credited":false,"coin_balance":N}`.
Re-running the exact same `curl` command must return
`{"success":true,"already_credited":true,"coin_balance":N}` with the same `N` (idempotent).

- [ ] **Step 4: Verify the unauthorized case**

```bash
curl -i -X POST http://127.0.0.1:54321/functions/v1/revenuecat-webhook \
  -H "Authorization: Bearer wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{"event":{"type":"NON_RENEWING_PURCHASE","product_id":"coin_pack_2","app_user_id":"<some-user-id>","id":"test-tx-webhook-2"}}'
```

Expected: `HTTP/1.1 401` with `{"error":"unauthorized"}`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/revenuecat-webhook/index.ts supabase/config.toml
git commit -m "Add RevenueCat webhook edge function to credit coin purchases"
```

---

### Task 3: RevenueCat SDK dependency, dev-client build config, init helper

**Files:**
- Modify: `package.json` (via `expo install`, not hand-edited)
- Create: `eas.json`
- Create: `src/lib/init-purchases.ts`
- Create: `src/lib/init-purchases.web.ts`
- Modify: `.env` (add two empty `EXPO_PUBLIC_REVENUECAT_API_KEY_*` lines)

**Interfaces:**
- Produces: `configurePurchases(userId: string): void`, `purchasesSupported: boolean`, and `getPurchasesModule(): PurchasesModule | null`, all exported from `@/lib/init-purchases` (native) / `@/lib/init-purchases.web` (web stub) — `configurePurchases` is called directly from Task 5's `coin-shop.tsx`; `purchasesSupported` and `getPurchasesModule` are consumed by Task 4's `use-coin-packages.ts`.

- [ ] **Step 1: Install the SDK and the dev-client tooling**

Run: `npx expo install react-native-purchases expo-dev-client`

Expected: `package.json` gains both packages at Expo-SDK-54-compatible versions (expo install
resolves the correct range itself — do not hand-pick versions).

- [ ] **Step 2: Add an EAS dev-client build profile**

`react-native-purchases` is a native module; Expo Go can't run it, so builds need a custom dev
client. This repo has no `eas.json` yet — create one:

`eas.json`:

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

- [ ] **Step 3: Add the two RevenueCat API key env vars**

RevenueCat issues separate public SDK keys per store. These are public client-embedded keys (same
trust level as the existing `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), so they belong in the
already-tracked `.env`, not a secret store. Append to `.env`:

```
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=
```

(Left empty here — filled in once the RevenueCat project/API keys exist, per the spec's
"Prerequisites" section. Do **not** put `REVENUECAT_WEBHOOK_SECRET` or
`SUPABASE_SERVICE_ROLE_KEY` here — those are server-only and belong in
`supabase/functions/.env` / `supabase secrets set`, from Task 2.)

- [ ] **Step 4: Write the native init helper**

`src/lib/init-purchases.ts`:

```ts
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// react-native-purchases is a custom native module with no Expo Go support —
// importing it there throws immediately (same class of problem as
// react-native-google-mobile-ads, see init-ads.ts), so the import itself
// must be conditional, not just a runtime check inside the function body.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const Purchases = isExpoGo
  ? null
  : (require('react-native-purchases').default as typeof import('react-native-purchases').default);

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
  android: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
});

export const purchasesSupported = Purchases !== null;

let configured = false;

export function configurePurchases(userId: string) {
  if (!Purchases || !API_KEY || configured) return;
  Purchases.configure({ apiKey: API_KEY, appUserID: userId });
  configured = true;
}

export function getPurchasesModule() {
  return Purchases;
}
```

- [ ] **Step 5: Write the web stub**

`src/lib/init-purchases.web.ts`:

```ts
// See init-purchases.ts — the RevenueCat SDK is native-only, so web gets a no-op.
export const purchasesSupported = false;

export function configurePurchases(_userId: string) {}

export function getPurchasesModule() {
  return null;
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `init-purchases`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json eas.json src/lib/init-purchases.ts src/lib/init-purchases.web.ts .env
git commit -m "Add RevenueCat SDK, dev-client build profile, and platform init helpers"
```

---

### Task 4: `useCoinPackages` hook

**Files:**
- Create: `src/hooks/use-coin-packages.ts`
- Create: `src/hooks/use-coin-packages.web.ts`

**Interfaces:**
- Consumes: `getPurchasesModule()`, `purchasesSupported` from `@/lib/init-purchases` (Task 3).
- Produces: `useCoinPackages(): { packages: CoinPackage[], loading: boolean, error: string | null, isSupported: boolean, purchase: (pkg: CoinPackage) => Promise<{ userCancelled: boolean }> }` and `type CoinPackage = { identifier: string, coinAmount: number, bonusLabel: string | null, priceString: string }` — consumed by Task 5's `coin-shop.tsx`. `isSupported` distinguishes "running under Expo Go / web, SDK unavailable" from "SDK available but the store returned zero packages," which need different messages per the spec.

- [ ] **Step 1: Write the native hook**

`src/hooks/use-coin-packages.ts`:

```ts
import { useEffect, useState } from 'react';

import { getPurchasesModule, purchasesSupported } from '@/lib/init-purchases';

export type CoinPackage = {
  identifier: string;
  coinAmount: number;
  bonusLabel: string | null;
  priceString: string;
};

// product_id -> display metadata, mirroring the pricing table in the design
// spec and the revenuecat-webhook edge function's coin-amount table.
const COIN_METADATA_BY_PRODUCT_ID: Record<string, { coinAmount: number; bonusLabel: string | null }> = {
  coin_pack_1: { coinAmount: 120, bonusLabel: null },
  coin_pack_2: { coinAmount: 650, bonusLabel: '+8%' },
  coin_pack_3: { coinAmount: 1400, bonusLabel: '+16%' },
  coin_pack_4: { coinAmount: 3000, bonusLabel: '+25%' },
  coin_pack_5: { coinAmount: 6500, bonusLabel: '+35%' },
};

// Keyed by package identifier so purchase() can look the underlying
// RevenueCat PurchasesPackage back up without exposing it in CoinPackage
// (keeps the type consumed by coin-shop.tsx free of RevenueCat-specific shape).
const rcPackagesByIdentifier = new Map<string, unknown>();

export function useCoinPackages() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Purchases = getPurchasesModule();
    if (!Purchases) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    Purchases.getOfferings()
      .then((offerings) => {
        if (cancelled) return;

        const rcPackages = offerings.current?.availablePackages ?? [];
        const resolved: CoinPackage[] = [];

        for (const pkg of rcPackages) {
          const meta = COIN_METADATA_BY_PRODUCT_ID[pkg.product.identifier];
          if (!meta) continue;
          rcPackagesByIdentifier.set(pkg.identifier, pkg);
          resolved.push({
            identifier: pkg.identifier,
            coinAmount: meta.coinAmount,
            bonusLabel: meta.bonusLabel,
            priceString: pkg.product.priceString,
          });
        }

        resolved.sort((a, b) => a.coinAmount - b.coinAmount);
        setPackages(resolved);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function purchase(pkg: CoinPackage) {
    const Purchases = getPurchasesModule();
    const rcPackage = rcPackagesByIdentifier.get(pkg.identifier);
    if (!Purchases || !rcPackage) {
      throw new Error('구매 기능을 사용할 수 없습니다.');
    }

    try {
      await Purchases.purchasePackage(rcPackage as never);
      return { userCancelled: false };
    } catch (err) {
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        return { userCancelled: true };
      }
      throw err;
    }
  }

  return { packages, loading, error, isSupported: purchasesSupported, purchase };
}
```

- [ ] **Step 2: Write the web stub**

`src/hooks/use-coin-packages.web.ts`:

```ts
// See use-coin-packages.ts — RevenueCat is native-only, so web gets empty
// packages and a purchase() that always throws (coin-shop.tsx never renders
// a buyable card without a package, so this path shouldn't be reachable).
import type { CoinPackage } from './use-coin-packages';

export type { CoinPackage };

export function useCoinPackages() {
  return {
    packages: [] as CoinPackage[],
    loading: false,
    error: null as string | null,
    isSupported: false,
    purchase: async (_pkg: CoinPackage) => {
      throw new Error('웹에서는 코인 구매를 지원하지 않습니다.');
    },
  };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `use-coin-packages`.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-coin-packages.ts src/hooks/use-coin-packages.web.ts
git commit -m "Add useCoinPackages hook wrapping RevenueCat offerings"
```

---

### Task 5: Coin shop screen + route registration

**Files:**
- Create: `src/app/coin-shop.tsx`
- Modify: `src/app/_layout.tsx` (register the route)

**Interfaces:**
- Consumes: `configurePurchases` from `@/lib/init-purchases` (Task 3); `useCoinPackages`, `CoinPackage` from `@/hooks/use-coin-packages` (Task 4); `useSession` from `@/hooks/use-session`; `supabase` from `@/lib/supabase`.

- [ ] **Step 1: Register the route**

In `src/app/_layout.tsx`, add one line alongside the other standalone-screen registrations
(after the `top-dramas` line):

```tsx
        <Stack.Screen name="coin-shop" options={{ headerShown: true, title: '코인 충전' }} />
```

- [ ] **Step 2: Write the screen**

`src/app/coin-shop.tsx`:

```tsx
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type CoinPackage, useCoinPackages } from '@/hooks/use-coin-packages';
import { useSession } from '@/hooks/use-session';
import { configurePurchases } from '@/lib/init-purchases';
import { supabase } from '@/lib/supabase';

const ACCENT = '#FF3B5C';
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 12000;

export default function CoinShopScreen() {
  const { session, isLoggedIn, loading: sessionLoading } = useSession();
  const { packages, loading, error, isSupported, purchase } = useCoinPackages();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session) configurePurchases(session.user.id);
  }, [session]);

  if (sessionLoading) return null;
  if (!isLoggedIn) return <Redirect href="/login" />;

  async function handlePurchase(pkg: CoinPackage) {
    if (!session) return;

    const { data: before } = await supabase
      .from('profiles')
      .select('coin_balance')
      .eq('id', session.user.id)
      .single();
    const balanceBeforePurchase = before?.coin_balance ?? null;

    setPurchasingId(pkg.identifier);

    let result: { userCancelled: boolean };
    try {
      result = await purchase(pkg);
    } catch {
      setPurchasingId(null);
      Alert.alert('오류', '구매 처리 중 문제가 발생했어요.');
      return;
    }

    if (result.userCancelled) {
      setPurchasingId(null);
      return;
    }

    setPendingMessage('충전 처리 중...');
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const poll = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('id', session.user.id)
        .single();

      if (data && data.coin_balance !== balanceBeforePurchase) {
        setPurchasingId(null);
        setPendingMessage(null);
        return;
      }

      if (Date.now() >= deadline) {
        setPurchasingId(null);
        setPendingMessage('곧 반영됩니다. 마이페이지에서 확인해주세요.');
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();
  }

  const bestValueIdentifier = packages.length > 0 ? packages[packages.length - 1].identifier : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {!isSupported && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              개발 빌드에서만 구매를 테스트할 수 있습니다.
            </ThemedText>
          )}

          {isSupported && loading && <ActivityIndicator style={styles.spinner} />}

          {isSupported && error && (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          )}

          {isSupported && !loading && !error && packages.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
              구매 가능한 상품이 없어요. 잠시 후 다시 시도해주세요.
            </ThemedText>
          )}

          {packages.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              disabled={purchasingId !== null}
              onPress={() => handlePurchase(pkg)}
              style={[styles.card, purchasingId !== null && styles.cardDisabled]}>
              <View style={styles.cardRow}>
                <ThemedText type="smallBold">{pkg.coinAmount.toLocaleString()} 코인</ThemedText>
                {pkg.identifier === bestValueIdentifier && (
                  <ThemedText style={styles.bestBadge}>베스트</ThemedText>
                )}
              </View>
              {pkg.bonusLabel && (
                <ThemedText type="small" themeColor="textSecondary">
                  보너스 {pkg.bonusLabel}
                </ThemedText>
              )}
              <ThemedText type="default" style={styles.price}>
                {purchasingId === pkg.identifier ? '처리 중...' : pkg.priceString}
              </ThemedText>
            </Pressable>
          ))}

          {pendingMessage && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.pendingText}>
              {pendingMessage}
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  spinner: {
    marginTop: Spacing.five,
  },
  message: {
    padding: Spacing.four,
    textAlign: 'center',
  },
  errorText: {
    color: '#D33',
    textAlign: 'center',
    padding: Spacing.four,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    backgroundColor: '#F0F0F3',
    gap: Spacing.one,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestBadge: {
    backgroundColor: ACCENT,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  price: {
    fontWeight: '700',
  },
  pendingText: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `coin-shop.tsx` or `_layout.tsx`.

- [ ] **Step 4: Manual smoke test in Expo Go (web fallback path)**

Run: `npx expo start --web`, log in, navigate to `/coin-shop` directly via the URL bar
(e.g. `http://localhost:8081/coin-shop`).
Expected: screen renders without crashing, shows "개발 빌드에서만 구매를 테스트할 수 있습니다"
(since the web stub's `isSupported` is always `false`) — confirming the web stub path doesn't
throw and surfaces the correct message rather than the generic empty-packages one.

- [ ] **Step 5: Commit**

```bash
git add src/app/coin-shop.tsx src/app/_layout.tsx
git commit -m "Add coin-shop screen"
```

---

### Task 6: Wire up mypage's existing "충전하기" button

**Files:**
- Modify: `src/app/(tabs)/mypage.tsx:140-144`

**Interfaces:**
- Consumes: the `coin-shop` route registered in Task 5.

- [ ] **Step 1: Replace the placeholder alert with navigation**

`mypage.tsx` already has a coin-charge button that only shows a "coming soon" alert
(`src/app/(tabs)/mypage.tsx:140-144`):

```tsx
            <Pressable
              onPress={() => Alert.alert('안내', '코인 충전 기능은 아직 준비 중이에요.')}
              style={styles.chargeButton}>
              <ThemedText style={styles.chargeButtonText}>코인 충전하기</ThemedText>
            </Pressable>
```

Change it to:

```tsx
            <Pressable onPress={() => router.push('/coin-shop')} style={styles.chargeButton}>
              <ThemedText style={styles.chargeButtonText}>코인 충전하기</ThemedText>
            </Pressable>
```

(`router` is already in scope from `useRouter()` at the top of the component — no new import
needed. If `Alert` becomes unused elsewhere in the file after this change, leave the import as-is;
it's still used by `handleDeleteAccount`'s error paths... actually check: search the file for other
`Alert.` usages before removing the import.)

- [ ] **Step 2: Confirm `Alert` import is still needed**

Run: `grep -n "Alert\." "src/app/(tabs)/mypage.tsx"`
Expected: no remaining matches other than the one just removed means the `Alert` import at the top
of the file should also be deleted; if there are other matches, leave the import untouched.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `mypage.tsx`.

- [ ] **Step 4: Manual smoke test**

Run: `npx expo start --web`, log in, go to 마이페이지, tap "코인 충전하기".
Expected: navigates to the coin-shop screen (Task 5) instead of showing the old "준비 중" alert.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(tabs)/mypage.tsx"
git commit -m "Wire mypage's coin-charge button to the new coin-shop screen"
```

---

## After this plan

Out of scope here, tracked as follow-ups once this ships:
- Actually creating the 5 products in App Store Connect / Play Console, the RevenueCat project,
  and filling in the real API keys / webhook secret (operational, not code — see the spec's
  "Prerequisites" section).
- EAS dev-client build + device install, since none of this is testable end-to-end without one
  (Expo Go cannot load `react-native-purchases`).
- Subscription/VIP tier (explicitly out of scope for this plan).
