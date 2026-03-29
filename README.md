# ✂️ 시험지 크롭 v2 — AI 자동 감지

시험지 이미지를 업로드하면 **Claude Vision AI가 문제 영역을 자동 감지**합니다.  
결과를 확인하고 수정한 뒤 `파일명_문제번호.jpg`로 다운로드하세요.

## 기능

- 🤖 **AI 자동 감지** — 업로드 즉시 Claude Vision이 문제 영역 자동 탐지
- ✏️ **수동 보정** — AI 결과를 확인하고 드래그로 추가/수정/삭제
- 📁 여러 장 동시 업로드 (드래그 앤 드롭)
- 🔢 문제 번호 자동 부여 & 수정 가능
- 📦 전체 ZIP 다운로드 / 개별 다운로드
- ⌨️ 키보드 단축키

## Vercel 배포

### 1. GitHub에 Push

```bash
cd exam-cropper-v2
git init
git add .
git commit -m "initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Vercel 배포

1. [vercel.com](https://vercel.com) → "Add New Project" → GitHub 레포 연결
2. Framework: **Vite** (자동 감지됨)
3. **Environment Variables** 설정:
   - `ANTHROPIC_API_KEY` = `sk-ant-xxxxx` (Anthropic API 키)
4. "Deploy" 클릭

### 또는 CLI

```bash
npm i -g vercel
vercel              # 배포 + 프롬프트에서 설정
vercel env add ANTHROPIC_API_KEY  # API 키 등록
vercel --prod       # 프로덕션 배포
```

## 기존 Vercel 프로젝트에 업데이트

이미 `exam-crop.vercel.app`에 배포된 프로젝트가 있다면:

1. 기존 repo에 이 파일들을 덮어쓰기
2. `git push` → Vercel 자동 재배포
3. Vercel 대시보드 → Settings → Environment Variables에서 `ANTHROPIC_API_KEY` 추가

## 로컬 개발

```bash
cp .env.example .env.local
# .env.local에 API 키 입력
npm install
npm run dev
```

## 기술 스택

- React 18 + Vite 5
- Vercel Serverless Functions (Claude API 프록시)
- Claude Sonnet 4 Vision API
- JSZip + Canvas API
