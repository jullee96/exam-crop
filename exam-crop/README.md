# ✂️ 시험지 크롭 (Exam Paper Cropper)

시험지 이미지를 업로드하고, 문제별로 드래그하여 영역을 선택하면  
`파일명_문제번호.jpg` 형식으로 크롭된 이미지를 ZIP으로 다운로드할 수 있습니다.

## 기능

- 📁 여러 장 동시 업로드 (드래그 앤 드롭 지원)
- 🖱️ 드래그로 문제 영역 선택
- 🔢 문제 번호 자동 증가 & 수정 가능
- 📦 전체 ZIP 다운로드 / 개별 다운로드
- ⌨️ 키보드 단축키 (Delete: 삭제, ←→: 이미지 전환)

## 로컬 실행

```bash
npm install
npm run dev
```

## 배포

### Vercel

1. GitHub에 이 프로젝트를 push
2. [vercel.com](https://vercel.com) 접속 → "Add New Project"
3. GitHub 레포 연결 → **자동 감지됨 (Vite)**
4. "Deploy" 클릭 → 끝!

또는 CLI:
```bash
npm i -g vercel
vercel
```

### Netlify

1. GitHub에 push
2. [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
3. Build command: `npm run build`
4. Publish directory: `dist`
5. "Deploy" 클릭

또는 CLI:
```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

## 기술 스택

- React 18 + Vite 5
- JSZip (ZIP 다운로드)
- Canvas API (이미지 크롭)
- 순수 CSS (외부 UI 라이브러리 없음)
