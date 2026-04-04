# ARCHITECTURE — gut-diary

## 기술 스택
- **Framework**: React 18 + Vite
- **Storage**: localStorage (기기 로컬 저장)
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
{ value: -1, label: "무반응",     sev: 0  }
{ value:  4, label: "쾌변",       sev: -1 }
{ value:  1, label: "미묘한불편", sev: 1  }
{ value:  5, label: "가스참",     sev: 1  }
{ value:  6, label: "잔변감",     sev: 1  }
{ value:  2, label: "아랫배아픔", sev: 2  }
{ value:  3, label: "설사",       sev: 2  }
```

**sev 기준**: -1=좋음, 0=무반응, 1=불편, 2=심함

---

## 컴포넌트 구조

```
GutDiary (메인)
├── Header (내보내기/가져오기 버튼)
├── Stats (기록/쾌변/불편/심함 일수)
├── Tabs (오늘기록 / 히스토리)
├── LogView
│   ├── FormPanel
│   │   ├── DateInput
│   │   ├── MealBlock × N (끼니마다)
│   │   │   ├── FoodInput (자동완성 포함)
│   │   │   └── SymptomButtons
│   │   └── NoteInput
│   └── TimelinePanel (우측, 실시간 반영)
└── HistoryView
    └── EntryCard × N (클릭 시 미니타임라인 펼침)
```

---

## 주요 함수

| 함수 | 역할 |
|------|------|
| `mkForm(entries)` | 새 폼 생성, 최근 저녁 → 어제저녁 자동입력 |
| `worstVal(syms)` | 증상 배열에서 가장 심한 증상 반환 (sev 기준) |
| `worstSev(entry)` | 하루 기록 전체의 최악 severity 반환 (통계용) |
| `toggleSymptom(current, val)` | 증상 토글, 무반응 선택 시 초기화 |
| `matchFood(food, query)` | 음식명 검색 (텍스트 + 초성 매칭) |
| `handleExport()` | entries → JSON 다운로드 |
| `handleImport(e)` | JSON 파일 → entries 복원 |
