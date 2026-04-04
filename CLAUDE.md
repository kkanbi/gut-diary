# 🤖 gut-diary CLAUDE.md

> 이 파일은 `D:\gut-diary\CLAUDE.md`에 복사해서 사용합니다.
> 원본 위치: `_system/repo_configs/gut-diary_CLAUDE.md`

---

## 📌 프로젝트 개요

- **이름**: 내 배 일기 (gut-diary)
- **목적**: 과민성대장 설사형 증상 추적 — 식사별 음식 기록 + 반응 패턴 파악
- **스택**: React (Vite) + localStorage
- **로컬 경로**: `D:\gut-diary`
- **GitHub**: https://github.com/kkanbi/gut-diary
- **배포 URL**: https://kkanbi.github.io/gut-diary/

---

## ⚡ 세션 시작 루틴

1. **`docs/CHANGELOG.md` 확인** — 마지막 변경사항 파악
2. **`docs/ARCHITECTURE.md` 확인** — 현재 구조 파악
3. **수정할 파일 확인** — 거의 대부분 `src/App.jsx` 하나만 건드림

---

## 🔧 개발 명령어

```bash
# 로컬 개발 서버 실행
cd D:\gut-diary
npm run dev
# → http://localhost:5173/ 에서 확인

# GitHub Pages 배포
git add .
git commit -m "변경 내용 설명"
git push
npm run deploy
```

---

## 🗂️ 주요 파일 구조

```
gut-diary/
├── src/
│   └── App.jsx        ← 메인 코드 (여기만 수정)
├── docs/
│   ├── CHANGELOG.md   ← 변경이력 + 문제해결 기록
│   ├── ARCHITECTURE.md← 구조 설계
│   └── SETUP.md       ← 환경 설정
├── vite.config.js     ← base: "/gut-diary/" 설정됨
├── package.json       ← predeploy, deploy 스크립트 있음
├── CLAUDE.md          ← 이 파일
└── README.md
```

---

## 🧩 현재 구현된 기능

- 날짜별 식사 기록 (어제저녁 / 아침 / 점심 / 저녁 / 간식)
- 간식 추가/삭제/이름변경, 끼니 순서 ▲▼ 이동
- 증상 복수 선택: 무반응 / 쾌변 / 미묘한불편 / 가스참 / 잔변감 / 아랫배아픔 / 설사
- 실시간 타임라인 (우측, 2:1 비율)
- 히스토리 탭 (날짜별 카드 + 미니 타임라인)
- 통계 (쾌변 / 불편 / 심함 일수)
- 음식 자동완성 (초성 검색 지원, 쉼표 구분)
- 어제 저녁 자동 입력 (최근 기록의 저녁 → 다음날 어제저녁 자동 채움)
- 내보내기 / 가져오기 (JSON, 기기간 데이터 이전용)
- localStorage 저장 (새로고침 유지)

---

## ⚠️ 주의사항

- `localStorage`는 기기별 저장 → 기기 간 동기화는 내보내기/가져오기로
- 증상 severity 기준: 쾌변(-1) / 무반응(0) / 불편(1: 미묘한불편·가스참·잔변감) / 심함(2: 아랫배아픔·설사)
- 새 증상 추가 시 `SYMPTOMS` 배열에 `sev` 값 함께 지정할 것

---

## 📬 작업 기록 위치 (gabi_plan_control 연동)

| 작업 내용 | 저장 위치 |
|-----------|---------|
| 오늘 작업 | `60_Journal/YYYY-MM-DD.md` |
| 기능 결정 | `_system/Decision_Log.md` |
| 다음 할 일 | `_system/Action_Tracker.md` |
| 프로젝트 노트 | `40_Projects/gut-diary/` |
