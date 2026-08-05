# 광고 대체 영상 보상 — 백엔드 준비 완료, 프론트 핸드오프

AdMob 리워드 광고 대신 자체 준비한 영상을 보여주고 코인을 지급하는 방식으로 전환합니다.
(AdMob 대신 이 방식을 쓰는 이유: **연령 인증 문제** — AdMob 리워드 광고 정책상 제약이 있어서, 직접 준비한 영상으로 대체)

## 1. Storage 버킷

- 버킷 이름: **`ad-videos`**
- `episode-videos`와 동일한 구조 — `public = true`라서 업로드된 영상은 로그인 없이 바로 재생 가능한 public URL을 가짐
- public URL 형태: `https://chytyudprezhfmgndwtd.supabase.co/storage/v1/object/public/ad-videos/<경로>/<파일명>`
- 파일 크기 제한: 100MB (영상 하나당). 더 큰 파일이 필요하면 마이그레이션으로 조정 가능 (`episode-videos`도 처음엔 50MB였다가 나중에 300MB로 올림)
- 업로드/수정/삭제는 관리자(`profiles.is_admin = true`)만 가능, 일반 로그인 유저는 읽기만

## 2. 영상 업로드 방법

관리자 계정으로 Supabase Studio(대시보드) → Storage → `ad-videos` 버킷에서 직접 업로드하면 됩니다. 코드로 넣을 필요 없이 파일만 올리면 바로 public URL이 생깁니다.

- 파일 올린 뒤 "Get URL" 또는 위 URL 패턴대로 접근하면 재생 가능한 링크가 나옵니다.
- 폴더 구조는 자유 (예: `ad-videos/default.mp4` 하나만 두거나, 여러 개 두고 프론트에서 랜덤/순차 재생해도 됩니다 — 이 부분은 프론트 판단)

## 2-1. 실제 업로드된 영상 (바로 쓸 수 있음)

아래 5개는 이미 `ad-videos` 버킷에 업로드해뒀고, 전부 public URL로 재생 확인(HTTP 200, 파일 크기 일치)했습니다. 프론트에서 바로 이 URL로 테스트하면 됩니다 — 추가 업로드 작업 필요 없습니다.

| 파일명 | Public URL |
|---|---|
| `20240716_095803.mp4` | `https://chytyudprezhfmgndwtd.supabase.co/storage/v1/object/public/ad-videos/20240716_095803.mp4` |
| `KakaoTalk_20260805_102309189.mp4` | `https://chytyudprezhfmgndwtd.supabase.co/storage/v1/object/public/ad-videos/KakaoTalk_20260805_102309189.mp4` |
| `KakaoTalk_20260805_102325047.mp4` | `https://chytyudprezhfmgndwtd.supabase.co/storage/v1/object/public/ad-videos/KakaoTalk_20260805_102325047.mp4` |
| `KakaoTalk_20260805_102344338.mp4` | `https://chytyudprezhfmgndwtd.supabase.co/storage/v1/object/public/ad-videos/KakaoTalk_20260805_102344338.mp4` |
| `KakaoTalk_20260805_102407632.mp4` | `https://chytyudprezhfmgndwtd.supabase.co/storage/v1/object/public/ad-videos/KakaoTalk_20260805_102407632.mp4` |

추가로 영상을 더 넣고 싶으면 아래 2번 방법대로 Studio에서 직접 올리면 됩니다.

## 3. 프론트에서 만들어야 하는 것

- 영상 재생 화면(또는 기존 광고 트리거 지점에 자체 영상 플레이어로 교체)
- 영상을 **끝까지 재생**하면 기존 `claim_ad_reward` RPC를 그대로 호출
  ```ts
  const { data, error } = await supabase.rpc('claim_ad_reward');
  ```
- RPC 자체는 전혀 안 바뀌었습니다 (하루 1회 제한, 코인 지급 로직 그대로) — `checkin.tsx`의 기존 `claim_ad_reward` 호출 부분 그대로 참고하면 됩니다. AdMob SDK 콜백 대신 "영상 재생 완료" 이벤트에서 같은 RPC를 부르면 끝입니다.

## 참고 — 서버 측 "끝까지 봤는지" 검증에 대해

현재 `claim_ad_reward` RPC는 파라미터가 없고, 호출되면 (하루 1회 제한 외에는) 조건 없이 코인을 지급합니다. 이건 AdMob을 쓰던 때도 마찬가지였습니다 — AdMob 콜백이 오면 클라이언트가 이 RPC를 부르는 구조였고, RPC 자체는 "광고를 실제로 봤는지"를 서버에서 검증한 적이 없습니다. 그래서 **자체 영상으로 바꿔도 보안 모델이 더 나빠지는 건 아닙니다** (원래부터 클라이언트를 신뢰하는 구조).

다만 코인이 나중에 실제 결제(코인 충전)와 연결될 예정이라면, "영상을 끝까지 안 보고 RPC만 직접 호출"하는 악용이 더 쉬워지는 체감은 있을 수 있습니다. 필요해지면 다음 방식을 제안합니다 (지금 당장 구현은 안 했습니다):
- 영상 재생 **시작** 시 서버에 짧은 유효기간의 "재생 세션" 토큰을 발급(타임스탬프 기록)
- `claim_ad_reward` 호출 시 그 토큰이 있고, 발급 후 영상 길이만큼 시간이 지났는지 확인 후에만 지급

지금은 굳이 필요하다고 판단하지 않아 안 건드렸습니다. 필요 시 알려주세요.
