---
name: dev-engineering-charter
description: 모든 개발 작업의 공유 엔지니어링 규율 — 풀사이클 워크플로우·게이트·회귀·계약
version: 1.0.0
metadata:
  source: denver-ssot
  scope: engineering
---
<!-- 생성 파일 — 직접 편집 금지. vault 에서 컴파일됨. -->

모든 개발 에이전트(시니어 프론트·백엔드·QA·인프라 등)의 공유 작업 규율을 단일 출처로 모은 차터다.
프로젝트 고유 페르소나/도구는 각 에이전트 파일에 남기고, 공통으로 지키는 원칙만 여기 둔다.
모든 개발 세션이 이 차터를 기준으로 작업한다.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 산출물이 사는 곳 — durable 한 건 전부 vault SSOT
> 출처: `governance\guidance\artifact-locations.md`

**vault 가 모든 durable 프로젝트 지식의 단일 SSOT 다**: `rules`(법) · `guidance`(작업 규율) ·
`contracts`(백엔드↔앱 인터페이스) · `specs`(계획·스펙·설계) · `decisions`(ADR/왜) · `memory`(학습).

**스펙·계획·설계는 vault `specs/` 에 둔다** — `dw_write_spec(scope, title, body, kind)` 로 작성한다
(kind=plan|spec|design, 항상 draft). 조회는 `dw_search`/`dw_read`.
repo/worktree(`docs/superpowers/`)에만 두면 **worktree 청소·브랜치 삭제 시 휘발**한다 — durable 한
스펙은 반드시 vault 에 보존한다. (기존 repo 스펙은 vault 로 이전 완료, repo 사본은 레거시.)

**작업 흐름**: 활성 구현 중엔 worktree 에서 초안을 다듬되, **정착분(또는 끝난 스펙)은 vault `specs/`
에 올려** worktree 청소돼도 살아남게 한다. 미래 세션은 `dw_search` 로 전체 스펙을 찾는다.

**판단 기준**: 두고두고 참조되거나 worktree/브랜치에 묶여 휘발 위험이 있으면 → **vault**.
순수 일회성 스크래치(곧 버릴 메모)는 굳이 올리지 않아도 된다.

**스펙 본문은 repo 코드 경로를 링크로 남긴다**(스펙↔코드 연결 유지, 중복 복제는 금지).

## 위임해도 품질 책임은 본인
> 출처: `governance\guidance\delegation-ownership.md`

필요하면 리드가 되어 전문 에이전트에게 작업을 병렬 지시할 수 있다. 그러나 결과 검증과 품질
책임은 항상 본인에게 있다 — 에이전트 보고를 그대로 믿지 않는다. 리뷰어가 "계약 문서에
명문화 안 됨"이라 하면 직접 grep(머지 직전, detached/stale 체크아웃 금지)으로 재검증 후
판정한다. diff·테스트·스크린샷으로 직접 확인한다.

## denver-workflow — 신규 기능 풀사이클 11단계(멀티레포)
> 출처: `governance\guidance\denver-workflow.md`

신규 기능은 **요구사항 → 배포** 11단계 풀사이클로 진행한다(typo·1줄 fix·docs-only 단발 수정은
해당 레포 do-er git flow 직행). 이 워크스페이스가 멀티레포면 원본의 "FE/BE worktree 2개"가 아니라
**레포별 do-er 디스패치**로 분기한다 — 어느 레포에 어느 do-er 를 붙이는지는 **세션 digest 의
"## 레포 맵 (라우팅)"** 을 따른다(레포 맵이 없으면 `/denver-workflow` 0단계 부트스트랩이 먼저 수집한다).

단계 골격: ① 요구사항(brainstorming+advisor) → ② 기획(writing-plans) → ③ UI/UX(impeccable·design,
프론트/앱 한정) → ④ 분기+worktree → 🔒 **API 계약 GATE**(vault contracts/ shape 확정 전 구현 진입
금지) → ⑤ 구현(순차 디스패치·회귀가드 RED 먼저) → ⑥ PR+리뷰+레포별 CI → ⑦ 기획↔구현 비교(수동
체크리스트) → ⑦.5 디자인 QA → ⑧ 기능 QA → ⑧.5 회귀 스위트 → ⑨ 레포별 머지·배포(게이트 동의).

규율 정본은 재정의하지 않고 참조한다: gitflow·`--admin`금지는 pr-merge-discipline, worktree 격리(격리된
작업공간에서 do-er 가 자기 레포에서 수행), 회귀는 tdd-iron-law·regression-by-set-diff, 모든 단계 전제는
karpathy-guidelines. 디스패치·게이트·계약 흐름은 `dw-orchestrator` 에이전트.
교차 작업은 **순차**(계약 먼저 → 공급측 → 소비측), 완료 게이트는 **대상 레포 checks**.
막히면 즉시 **advisor 에스컬레이션**. 상세 단계·도구·외부 플러그인 설치 안내는 `/denver-workflow`.

## 서브에이전트 디스패치 규율 (절대경로·워크트리·검사·기록)
> 출처: `governance\guidance\dispatch-discipline.md`

do-er(구현·진단·QA·배포·리뷰 서브에이전트)에게 `Task`/`Agent` 로 위임할 때, 디스패치 프롬프트에
**항상** 다음을 넣는다 — 세션 유형(오케스트레이터 경유든 메인 루프 직접이든)과 무관하다:

1. **대상 레포 절대경로.** `Agent` 디스패치(구 `Task`)는 re-root 불가라 do-er 는 이 경로 기준으로만 움직인다.
2. **브랜치 + 워크트리 격리 강제.** do-er 는 첫 in-repo 동작으로 **올바른 base**(레포 맵이 정한 그
   레포의 base 브랜치) 위에 격리 워크트리 + 작업 브랜치를 만들고, **모든 변경을 그 안에서만** 수행한다.
   base/main 직접 커밋·작업 **금지**. 어느 워크트리·브랜치·base 를 썼는지 회신에 명시하게 한다
   (`git worktree add` · `superpowers:using-git-worktrees`, 머지 규율은 pr-merge-discipline).
3. **대상 레포 검사.** "변경 후 그 레포의 `<repo>/.claude/dw-checks.json` 로 결정론 검사하라" — 완료
   게이트는 워크스페이스 union 이 아니라 **대상 레포 checks** 기준.
4. **마감 기록.** "비자명한 학습·재사용 절차·계약 변경을 vault 에 기록하고(`dw_write_memory`/
   `dw_write_procedure`/`dw_write_contract`, draft), 무엇을 기록했는지 회신하라." do-er 컨텍스트는
   회신 후 버려지므로, 기록하지 않으면 학습이 사라진다.

결과 검증·완료 게이트 책임은 **디스패처 본인**이다(delegation-ownership). 교차레포·통합·계약
협상처럼 디스패처만 본 학습은 어느 do-er 에도 안 남으므로 디스패처가 직접 기록한다.

## 지식 탐색은 graphify 그래프 우선 (활성 시)
> 출처: `governance\guidance\graphify-search.md`

정본은 graphify 유무와 무관하다: 규칙 강제는 **컴파일 스킬 + 세션 다이제스트**, 계약·스펙·메모리 원문은
**`dw_read`/`dw_search`**(vault MCP). graphify 는 **발견·탐색 보조**이지 정본이 아니다.

**graphify 설치 시**(MCP 도구가 세션에 있을 때만): 자료·지식 탐색을 substring `dw_search` 보다 graphify
그래프로 먼저 한다 —
- **지식**(팀 노트·계약·스펙): vault 를 ingest 한 **기본 그래프**(project_path 없이) — `query_graph`·
  `get_neighbors`·`shortest_path`.
- **코드**(특정 레포 내부): 코드 **구조** 탐색(정의·호출자·의존 = 심볼·함수·클래스 어디 있나/누가
  부르나)은 그 레포 그래프를 **세션 graphify MCP 도구**(`query_graph`·`get_neighbors`, **`project_path=
  <repo 절대경로>`**)로 한다. `Grep`(raw grep)이나 **graphify CLI 셸아웃(Bash)**을 쓰지 마라 —
  세션에 MCP 가 있으면 그걸 쓴다(CLI 아님). `Grep` 은 **리터럴 문자열**(에러메시지·설정키·주석·비코드
  파일) 찾기에만 — 이건 AST 그래프가 답 못 하니 grep 이 맞다.
- 절차: ① graphify MCP 로 노드·이웃·경로를 잡고 → ② 원문은 `dw_read`(vault)·파일 Read(코드)로 편다.

**카페앗**: 코드 그래프는 AST-전용(LLM 미개입·결정론적). **INFERRED 엣지는 추정이라 근거로 인용 금지**
(실재 근거는 원문 `dw_read`). 여러 레포를 합친 global 통합 그래프는 심볼 충돌 아티팩트라 신뢰하지 않는다.
graphify 도구가 세션에 없으면(미설치) 이 전체가 무시되고 `dw_search` 로 동작한다.

디스패처는 do-er 에게도 이 우선순위를 relay 한다(dispatch-discipline).

## Karpathy 코딩 가이드라인 — LLM 코딩 실수 줄이기
> 출처: `governance\guidance\karpathy-guidelines.md`

그출처: [Andrej Karpathy](https://x.com/karpathy/status/2015883857489522876) (MIT, karpathy-guidelines).
**Tradeoff:** 속도보다 신중 쪽으로 치우친다 — 자명한 작업엔 판단으로 가감.

**1. 코딩 전 생각 — 가정하지 말고, 혼란을 숨기지 말고, 트레이드오프를 드러내라.**
- 가정은 명시한다. 불확실하면 묻는다.
- 해석이 여럿이면 조용히 하나 고르지 말고 제시한다.
- 더 단순한 길이 있으면 말한다. 근거 있으면 밀어낸다(push back).
- 불명확하면 멈추고 무엇이 혼란스러운지 이름 붙여 묻는다.

**2. 단순함 우선 — 문제를 푸는 최소 코드. 투기적 코드 금지.**
- 요청 안 한 기능·추상화·"유연성/설정 가능성" 금지. 불가능한 시나리오의 에러 핸들링 금지.
- 200줄을 50줄로 줄일 수 있으면 다시 쓴다. "시니어가 보면 과복잡이라 할까?" → 그렇다면 단순화.

**3. 외과적 변경 — 꼭 필요한 것만 건드린다. 네가 만든 잔재만 치운다.**
- 인접 코드·주석·포매팅을 "개선"하지 않는다. 안 망가진 걸 리팩터하지 않는다.
- 다르게 했을 스타일이어도 기존 스타일을 따른다. 무관한 dead code 는 삭제 말고 언급만.
- 네 변경이 만든 orphan(쓰임 없어진 import/변수/함수)만 제거. 기존 dead code 는 요청 시에만.
- 테스트: 바뀐 모든 줄이 사용자 요청에 직접 추적돼야 한다.

**4. 목표 주도 실행 — 성공 기준을 정의하고, 검증될 때까지 루프.**
- 작업을 검증 가능한 목표로: "검증 추가"→"잘못된 입력 테스트 작성 후 통과", "버그 수정"→"재현
  테스트 작성 후 통과", "리팩터"→"전후 테스트 통과 보장".
- 다단계 작업은 간단한 계획을 명시: `단계 → 검증` 형태. 강한 성공 기준이 독립 루프를 가능케 한다
  ("make it work" 같은 약한 기준은 계속 되묻게 만든다).

## PR·머지 규율
> 출처: `governance\guidance\pr-merge-discipline.md`

PR 본문은 **무엇/왜 → 변경 → 검증(증거: 테스트 수·analyze·스크린샷·red-green) → 후속/문의** 순서로
쓰고, 마감 매트릭스가 있으면 표로 정리한다. 머지: mergeable 확인 → `--squash` → 원격 브랜치 삭제 →
로컬 main ff → 워크트리 제거(squash 후 워크트리 커밋 폐기는 main 반영 확인 후에만). `--admin` 금지.
main 직접 push 금지(docs-only 도 PR), 운영 SSH 직접 패치 금지. migration·운영 secret·admin authz·데이터
손실 가능 변경은 머지 보류 + 사용자 동의를 요청한다. 커밋/PR/대화는 한국어, conventional commit(`feat(scope):`).

## 회귀는 카운트가 아니라 SET diff로 증명
> 출처: `governance\guidance\regression-by-set-diff.md`

회귀 판정은 테스트 통과 카운트가 아니라 **실패 SET diff** 로 한다 — 워크트리(또는 변경본)의 실패
집합을 클린 `origin/main` 의 실패 집합과 비교(`comm -13`)해 사전실패와 신규 회귀를 분리하고
회귀 0 을 증명한다. 전체 스위트를 돌린다. 주의: compound command `cd A && cmd1; cmd2` 에서
cmd2 는 A 에서 돌지 않으니 디렉토리별로 분리 실행한다.

## 잔여분만 작업한다
> 출처: `governance\guidance\residual-only.md`

핸드오프·회신·크리틱 항목은 다른 PR/세션이 이미 마감했을 수 있다. 트래커 "0건"을 믿지 말고
각 항목의 file:line 이 `origin/main` 에 아직 유효한지 검증한 뒤 **잔여분만** 작업한다.
이미 고쳐진 이슈를 재구현해 중복 사고(중복 UI·중복 구현)가 실제로 났었다.

## TDD 철칙
> 출처: `governance\guidance\tdd-iron-law.md`

프로덕션 코드 전에 실패 테스트를 먼저 쓴다 — RED 의 **실패 사유가 의도와 일치하는지**까지 확인한
뒤 최소 구현으로 GREEN. 버그 수정은 반드시 재현 테스트부터(cold 재현 후 수정, 추측 fix 금지).
기존 테스트 하니스(fake repo·_pump·body seam 패턴)를 재사용해 비용을 낮춘다. 스펙 변경으로 기존
가드를 깨면 삭제가 아니라 "스펙 변경" 주석과 함께 신규 동작 가드로 갱신한다. 화면/모델 개편 시
관련 테스트의 fake·단언 동기화(테스트 부패)를 함께 확인한다.

## 백로그·후속 항목은 vault 로 — 프로젝트 repo 에 Backlog 파일 금지
> 출처: `governance\rules\no-project-backlog-files.md` · enforced-by: `code-review`

후속 작업·백로그(이번 범위 밖이라 나중에 다룰 항목)를 **프로젝트 repo 안에 파일로 만들지 마라** —
`BACKLOG.md`·`TODO.md`·`FOLLOWUP.md`·`backlog/*.md`(전문용어: 프로젝트 루트/하위에 흩뿌리는 할일 목록
파일) 등. 이런 파일은 worktree 청소·브랜치 삭제 시 휘발하고, vault SSOT 밖이라 팀·다음 세션이 못 본다.

**대신 vault 로 기록한다**: `dw_write_backlog(scope, title, item, context)` — vault `project/backlog/` 에
LIVE(status:stable)로 남아 `dw_search`·`dw_list(note_type=backlog)` 로 즉시 조회된다. item=무엇을
해야 하나, context=어디서 나왔나·왜(file:line·커밋).

**완료 처리**: 항목을 다 하면 `dw_resolve(name, resolution)` 로 `project/backlog/archive/` 로 옮긴다 —
`status`(비준상태)로는 완료/미완료를 못 나누므로, 완료는 archive 이동으로 표현한다(활성 목록엔 미완료만
남는다). 같은 방식으로 spec(구현/적용 완료)·contract(완결)도 `dw_resolve` 로 archive 한다.

경계: README·CHANGELOG 등 코드-인접 관례 문서, 그리고 코드 안의 인라인 `// TODO:` 주석은 대상이
아니다(이건 코드의 일부). 금지 대상은 **후속작업 목록을 담은 별도 마크다운 파일**이다. durable
분석/스펙/계획 문서 전반의 vault-우선 규율은 artifact-locations 를 따른다.
