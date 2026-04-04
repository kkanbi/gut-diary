# SETUP — gut-diary

## 환경 요구사항
- Node.js (설치됨)
- Git (설치됨)
- GitHub 계정: kkanbi

---

## 로컬 개발 시작

```bash
cd D:\gut-diary
npm run dev
# → http://localhost:5173/ 접속
```

---

## GitHub Pages 배포

```bash
git add .
git commit -m "변경 내용"
git push
npm run deploy
# → https://kkanbi.github.io/gut-diary/ 반영 (1~2분 소요)
```

---

## 처음부터 세팅하는 경우

```bash
# 1. 프로젝트 생성
npm create vite@latest gut-diary -- --template react
cd gut-diary
npm install
npm install gh-pages --save-dev

# 2. vite.config.js 수정
# base: "/gut-diary/" 추가

# 3. package.json scripts에 추가
# "predeploy": "npm run build"
# "deploy": "gh-pages -d dist"

# 4. GitHub 연결
git init
git remote add origin https://github.com/kkanbi/gut-diary.git
git push -u origin main
npm run deploy
```

---

## 데이터 관리

- **저장 위치**: 브라우저 localStorage (`gut-diary` 키)
- **기기 간 이전**: 앱 우상단 ⬇내보내기 → JSON 파일 → 다른 기기에서 ⬆가져오기
- **초기화**: 브라우저 개발자도구 → Application → localStorage → `gut-diary` 삭제
