# 내 배 일기 🫙

과민성대장 설사형 증상 추적 앱 — 식사별 음식 기록 + 반응 패턴 파악

**배포 URL**: https://kkanbi.github.io/gut-diary/

---

## 주요 기능

- 날짜별 식사 기록 (어제저녁 / 아침 / 점심 / 저녁 / 간식)
- 증상 복수 선택: 무반응 / 쾌변 / 미묘한불편 / 가스참 / 잔변감 / 아랫배아픔 / 설사
- 실시간 타임라인 (2:1 비율 우측 패널)
- 히스토리 탭 (날짜별 카드 + 미니 타임라인)
- Severity 기반 통계 (쾌변 / 불편 / 심함 일수)
- 음식 자동완성 (초성 검색 지원, 쉼표 구분)
- 어제 저녁 자동 입력
- 간식 추가 / 삭제 / 이름변경, 끼니 순서 ▲▼ 이동
- 내보내기 / 가져오기 (JSON, 기기간 데이터 이전)
- localStorage 저장 (새로고침 데이터 유지)

---

## 기술 스택

- **Framework**: React 19 + Vite
- **Storage**: localStorage
- **Deployment**: GitHub Pages (`gh-pages`)

---

## 로컬 개발

```bash
npm install
npm run dev
# → http://localhost:5173/gut-diary/
```

---

## 배포

```bash
git add .
git commit -m "변경 내용"
git push
npm run deploy
```

---

## 데이터 관리

- localStorage는 기기별 저장 — 기기 간 이전은 앱 내 **내보내기/가져오기** 사용
- 초기화: 브라우저 개발자도구 → Application → localStorage → `gut-diary` 삭제

---

## 문서

- [`docs/CHANGELOG.md`](docs/CHANGELOG.md) — 변경 이력 + 문제해결 기록
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 구조 설계
- [`docs/SETUP.md`](docs/SETUP.md) — 환경 설정
