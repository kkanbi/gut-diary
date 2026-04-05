# ARCHITECTURE — gut-diary

## 기술 스택
- **Framework**: React 19 + Vite 8
- **Storage**: localStorage (기기 로컬 저장) + Google Drive (선택적 클라우드 백업)
- **Deployment**: GitHub Pages (`gh-pages`)
- **언어**: JSX (JavaScript + React)

---

## 핵심 데이터 구조

### Entry (하루 기록)
```js
{
  id: 1712345678901,        // Date.now()
  date: "2026-04-04",
  meals: [Meal, ...],
  note: "메모"
}
```

### Meal (끼니)
```js
{
  key: "breakfast",         // dinner_prev | breakfast | lunch | dinner | snack_XXX
  label: "아침",
  icon: "☀️",
  isPrev: false,            // 어제저녁 여부
  fixed: false,             // 순서이동 불가 여부 (dinner_prev만 true)
  food: "순창-쌈장, 흰쌀밥",
  symptoms: [-1]            // 증상 value 배열, 기본값 [-1] (무반응)
}
```

### Symptom 정의
```js
{ value: -1, label: "무반응",     emoji: "⚪", color: "#cbd5e1", sev: 0  }
{ value:  4, label: "쾌변",       emoji: "💚", color: "#22c55e", sev: -1 }
{ value:  1, label: "미묘한불편", emoji: "🟡", color: "#facc15", sev: 1  }
{ value:  5, label: "가스참",     emoji: "🫧", color: "#a78bfa", sev: 1  }
{ value:  6, label: "잔변감",     emoji: "😣", color: "#f472b6", sev: 1  }
{ value:  2, label: "아랫배아픔", emoji: "🟠", color: "#fb923c", sev: 2  }
{ value:  3, label: "설사",       emoji: "🔴", color: "#f87171", sev: 2  }
```

**sev 기준**: -1=좋음(쾌변), 0=무반응, 1=불편, 2=심함

---

## 컴포넌트 구조

```
GutDiary (메인)
├── Header (💾 백업·복원 드롭다운)
├── Stats (기록/쾌변/불편/복합/심함 일수)
├── Tabs (오늘기록 / 히스토리)
├── LogView
│   ├── FormPanel
│   │   ├── DateInput
│   │   ├── MealBlock × N (끼니마다)
│   │   │   ├── FoodInput (자동완성 포함)
│   │   │   │   └── Suggestions dropdown
│   │   │   └── SymptomButtons (복수 선택 토글)
│   │   └── NoteInput
│   └── TimelinePanel (우측, 실시간 반영)
└── HistoryView
    ├── MonthGroup × N (연/월 헤더로 그룹핑)
    └── EntryCard × N (클릭 시 미니타임라인 펼침)
```

### 서브 컴포넌트 (App.jsx 내 정의)
| 컴포넌트 | 역할 |
|----------|------|
| `FoodInput` | 텍스트에어리어 + 자동완성 드롭다운 |
| `MoveBtn` | 끼니 순서 ▲▼ 버튼 |
| `Stat` | 통계 수치 1개 표시 |
| `SD` | 구분선 |
| `Label` | 폼 필드 레이블 |

---

## 주요 함수

| 함수 | 역할 |
|------|------|
| `mkForm(entries)` | 새 폼 생성, 최근 저녁 → 어제저녁 자동입력 |
| `mkMeal(key, label)` | 간식용 새 Meal 객체 생성 |
| `mkBaseMeal(m)` | BASE_MEALS 항목 → 빈 Meal 객체 변환 |
| `worstVal(syms)` | 증상 배열에서 가장 심한 증상 value 반환 (sev 기준) |
| `worstSev(entry)` | 하루 기록 전체의 최악 severity 반환 (통계용) |
| `displayColor(syms)` | 색상 결정: 쾌변+심함 동시 존재 시 혼합색(#eab308), 아니면 worstVal 색상 |
| `isMixed(entry)` | 하루 기록에 쾌변+심함 동시 존재 여부 (통계 복합 분류용) |
| `toggleSymptom(current, val)` | 증상 토글, 무반응 선택 시 초기화 |
| `getChosung(str)` | 한글 문자열에서 초성 추출 |
| `matchFood(food, query)` | 음식명 검색 (텍스트 + 초성 매칭) |
| `handleExport()` | entries → JSON 다운로드 |
| `handleImport(e)` | JSON 파일 → entries 복원 |
| `requestGoogleAuth(cb)` | GIS 토큰 요청, 성공 시 cb(token) 실행 |
| `handleGoogleLogout()` | 토큰 revoke + 상태 초기화 |
| `saveToDrive(token)` | entries → Drive appDataFolder 저장 (upsert) |
| `loadFromDrive(token, mode)` | Drive → entries 복원 (merge / overwrite) |

---

## 스토리지 구조

### localStorage
```
key: "gut-diary"        → JSON.stringify(Entry[])  // 최신 날짜 순 정렬
key: "gut-diary-gtoken" → Google OAuth 액세스 토큰 (앱 시작 시 tokeninfo로 유효성 검증)
```

### Google Drive (선택적)
- **스코프**: `drive.appdata` (사용자 Drive에 보이지 않는 앱 전용 폴더)
- **파일명**: `gut-diary-backup.json`
- **인증**: Google Identity Services (GIS) OAuth 2.0 토큰 방식 — CDN 동적 로드
- **API**: Google Drive REST API v3 (fetch 직접 호출, gapi 미사용)

---

## 새 증상 추가 시 주의사항

`SYMPTOMS` 배열에 추가할 때 반드시 `sev` 값 지정 필요.
`sev` 없으면 `worstSev()` 통계가 오분류됨 ([PROB-002] 참고).
