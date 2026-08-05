# 관리자 화면 백엔드 — 핸드오프

관리자 화면(회원 목록/상세, 강제탈퇴, 관리자 승격 등)에서 쓸 백엔드 함수들입니다. 전부 Supabase RPC로 호출하며, 호출하는 계정의 `profiles.is_admin = true`가 아니면 전부 `관리자만 접근할 수 있습니다.` 에러를 던집니다 (실제 remote DB에 테스트 계정으로 검증 완료).

## 1. 회원 목록 — `admin_list_members`

```ts
const { data, error } = await supabase.rpc('admin_list_members', {
  p_limit: 20,        // 기본 50, 최대 200으로 clamp됨
  p_offset: 0,
  p_search: '홍길동',  // 닉네임/이메일 부분일치 검색, 없으면 null
  p_sort_by: 'created_at', // 'created_at' | 'nickname' | 'coin_balance', 기본 created_at
  p_sort_dir: 'desc',      // 'asc' | 'desc', 기본 desc
});
```

- 반환: 행마다 `id, nickname, email, created_at, coin_balance, is_admin, total_count` (모든 행에 동일한 `total_count`가 붙어있음 — 전체 페이지네이션 UI 만들 때 `data[0]?.total_count`로 총 개수 확인)
- 파라미터 전부 optional, 안 넘기면 기본값(`limit=50, offset=0, search=없음, sort=created_at desc`)으로 동작
- 기존 `admin_list_members()` (파라미터 없는 버전)은 삭제됨 — 반드시 위 형태로 호출

## 2. 회원 상세 — `admin_get_member_detail`

```ts
const { data, error } = await supabase.rpc('admin_get_member_detail', {
  target_user_id: '...',
});
```

반환은 하나의 jsonb 객체:

```jsonc
{
  "profile": { "id", "nickname", "email", "created_at", "coin_balance", "is_admin", "consecutive_days", "last_attendance_date", "last_ad_reward_date" },
  "watch_history": [ { "drama_id", "drama_title", "watched_at", "last_episode_id" }, ... ],   // 최근 50개
  "favorites": [ { "drama_id", "drama_title", "created_at" }, ... ],                          // 최근 50개
  "attendance_logs": [ { "checked_date", "reward_coin" }, ... ],                              // 최근 50개
  "coin_transactions": [ { "amount", "reason", "balance_after", "created_at" }, ... ]          // 최근 50개
}
```

- 존재하지 않는 `target_user_id`면 `회원을 찾을 수 없습니다.` 에러
- 각 목록은 요약용이라 50개로 캡 — 전체 이력을 다 봐야 하면 별도 테이블(`watch_history`, `favorites`, `attendance_logs`, `coin_transactions`)을 직접 더 조회해야 함 (관리자 계정이라도 이 테이블들은 RLS상 본인 행만 보이므로, 전체 export가 필요하면 알려주세요 — 별도 admin 전용 조회 함수를 추가해야 함)

## 3. 코인 거래 내역 — `coin_transactions` 테이블

회원 본인은 자기 내역만 직접 조회 가능:

```ts
const { data } = await supabase.from('coin_transactions').select('*').order('created_at', { ascending: false });
```

- 컬럼: `id, user_id, amount(양수=지급/음수=차감), reason('attendance' | 'ad_reward' | 'episode_unlock' | 'charge'), balance_after, created_at`
- insert/update/delete는 막혀있음 — `check_attendance`, `claim_ad_reward`, `unlock_episode` 함수가 코인을 변동시킬 때마다 자동으로 한 줄씩 기록됨. 관리자 화면에서 특정 회원의 내역을 보려면 위 2번 `admin_get_member_detail`의 `coin_transactions` 필드를 쓰면 됨 (직접 이 테이블을 다른 유저 걸로 조회하면 RLS에 걸려서 빈 배열만 나옴)

## 4. 관리자 승격/해제 — `admin_grant_admin` / `admin_revoke_admin`

```ts
await supabase.rpc('admin_grant_admin', { target_user_id: '...' });
await supabase.rpc('admin_revoke_admin', { target_user_id: '...' });
```

- 둘 다 `{ success: true }` 반환, 실패 시 에러
- 승격/해제는 **즉시** 적용됨 (JWT 캐시 문제 없음 — 매 호출마다 `profiles.is_admin`을 직접 조회해서 체크하는 구조라, 승격되면 바로 그 계정으로 관리자 함수 호출 가능, 해제되면 바로 막힘)
- `admin_revoke_admin`으로 **자기 자신**은 해제 불가 (`본인의 관리자 권한은 이 방식으로 해제할 수 없습니다.`) — 관리자가 실수로 스스로를 잠그는 사고 방지. 다른 관리자 계정으로 해제해야 함
- 존재하지 않는 `target_user_id`면 `회원을 찾을 수 없습니다.` 에러

## 5. 회원 강제탈퇴 — `admin_delete_user` (기존, 변경 없음)

```ts
await supabase.rpc('admin_delete_user', { target_user_id: '...' });
```

- 동작은 이전과 동일, 자기 자신은 삭제 불가
- 변경점: 삭제 실행 시 `admin_action_logs`에 감사로그가 자동으로 남음 (아래 6번)

## 6. 감사로그 — `admin_action_logs` 테이블

관리자만 조회 가능:

```ts
const { data } = await supabase
  .from('admin_action_logs')
  .select('*')
  .order('created_at', { ascending: false });
```

- 컬럼: `id, admin_id(누가), action('delete_user' | 'grant_admin' | 'revoke_admin'), target_user_id(누구에게), detail(jsonb, 현재는 항상 null — 필요해지면 확장 가능), created_at`
- `admin_delete_user`/`admin_grant_admin`/`admin_revoke_admin` 호출 시 자동 기록, 직접 insert 불가
- 대상 유저가 나중에 삭제돼도 로그 행 자체는 안 없어지고 `target_user_id`만 `null`로 바뀜 (감사로그가 삭제 기록을 남기는데 그 삭제로 로그까지 같이 사라지면 안 되니까) — 회원 관리 화면에서 "탈퇴된 회원" 표시할 때 `target_user_id`가 null인 로그는 `detail`이나 별도 텍스트 스냅샷이 없으므로 어떤 회원이었는지는 복구 불가능 (필요하면 `admin_delete_user`가 삭제 직전 닉네임/이메일을 `detail`에 같이 남기도록 확장 가능 — 필요해지면 알려주세요)

## 참고 — 실제 테스트 완료 항목

테스트 계정 2개(일반회원 A→관리자 승격/해제, 일반회원 B)로 remote DB에 직접 검증:
- `check_attendance`/`claim_ad_reward`/`unlock_episode` 호출 시 `coin_transactions`에 정확한 `amount`/`reason`/`balance_after`로 기록됨
- `admin_list_members`의 `p_limit`/`p_offset`/`p_search`/`p_sort_by`/`p_sort_dir` 전부 정상 동작 (페이지네이션이 실제로 다른 행을 반환하는지까지 확인)
- `admin_get_member_detail`이 시청기록/찜/코인내역을 정확히 반환
- 비관리자가 모든 `admin_*` 함수 호출 시 전부 차단됨
- `admin_grant_admin`/`admin_revoke_admin` 실제 승격/해제 및 자기 자신 해제 방지 동작
- 승격/해제/삭제 시 `admin_action_logs`에 정확히 기록되고, 삭제된 유저의 로그는 `target_user_id`만 null로 남고 행은 유지됨
- `coin_transactions`/`admin_action_logs` RLS: 본인 것만/관리자만 조회 가능 여부 확인
