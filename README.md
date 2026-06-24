# Google Sheets 기반 블로그

구글 스프레드시트를 데이터베이스로 활용하는 서버리스 블로그 시스템입니다.

## 🌟 주요 특징

- **서버리스 아키텍처**: Google Sheets + GitHub Pages + Apps Script
- **리치 텍스트 에디터**: 바닐라 JavaScript로 구현한 WYSIWYG 에디터
- **Google Drive 통합**: 이미지/동영상 직접 업로드 및 자동 최적화
- **완전 무료**: 모든 기능이 무료 서비스로 구성
- **반응형 디자인**: 모바일부터 데스크톱까지 완벽 지원
- **SEO 최적화**: 메타 태그, Open Graph, 구조화된 데이터
- **다크 모드**: 시스템 설정 자동 감지 및 수동 전환

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Rich Editor   │───▶│  Apps Script    │───▶│  Google Drive   │
│  (Frontend JS)  │    │   (Upload API)  │    │  (File Storage) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Blog Pages    │◀───│  Google Sheets  │───▶│   GitHub Pages  │
│  (Static HTML)  │    │   (Database)    │    │   (Hosting)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/jwbaek96/blog1.git
cd blog1
```

### 2. Google Drive 폴더 생성

1. [Google Drive](https://drive.google.com) 접속
2. 새 폴더 생성: "Blog Media"
3. 폴더 우클릭 → 공유 → "링크가 있는 모든 사용자" (보기 권한)
4. 폴더 URL에서 ID 복사: `https://drive.google.com/drive/folders/[FOLDER_ID]`

### 3. Google Apps Script 설정

1. [Google Apps Script](https://script.google.com) 접속
2. 새 프로젝트 생성: "Blog Upload API"
3. `integrations/apps-script/Code.gs` 내용을 복사하여 붙여넣기
4. `BLOG_FOLDER_ID`에 폴더 ID 입력
5. 배포 → 새 배포 → 웹 앱 → 전체 액세스
6. 배포 URL 복사

### 4. Google Sheets 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. 새 스프레드시트 생성: "Blog Posts"
3. 다음 헤더 행 추가:

```
id | title | date | author | thumbnail | content | tags | images | videos | status
```

4. 파일 → 공유 → 웹에 게시 → CSV 형식
5. 게시 URL 복사

### 5. 설정 파일 업데이트

`scripts/core/config.js` 파일에서 다음 값들을 업데이트:

```javascript
const CONFIG = {
    APPS_SCRIPT_URL: 'YOUR_APPS_SCRIPT_URL_HERE',
    GOOGLE_SHEET_ID: 'YOUR_SHEET_ID_HERE',
    GOOGLE_SHEET_URL: 'YOUR_SHEET_CSV_URL_HERE',
    // ... 기타 설정
};
```

### 6. 로컬 테스트

```bash
# 로컬 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js
npx serve .
```

브라우저에서 `http://localhost:8000` 접속

### 7. GitHub Pages 배포

1. GitHub 저장소에 코드 푸시
2. Settings → Pages → Source: Deploy from a branch
3. Branch: main → Save
4. `https://username.github.io/repository-name` 접속

## 📝 사용법

### 포스트 작성

1. `editor.html` 페이지 접속
2. 제목, 작성자, 태그 입력
3. 리치 텍스트 에디터로 내용 작성
4. 이미지/동영상 업로드 (자동으로 Google Drive에 저장)
5. "HTML 내보내기" 버튼 클릭
6. 생성된 HTML을 Google Sheets에 복사

### Google Sheets 데이터 구조

| 컬럼 | 설명 | 예시 |
|------|------|------|
| id | 고유 식별자 | 1 |
| title | 포스트 제목 | "첫 번째 포스트" |
| date | 작성일 | 2024-01-15 |
| author | 작성자 | "홍길동" |
| thumbnail | 썸네일 URL | https://drive.google.com/... |
| content | HTML 내용 | `<p>내용...</p>` |
| tags | 태그 (쉼표 구분) | "javascript,web,blog" |
| images | 추가 이미지 URLs | "url1,url2,url3" |
| videos | 비디오 URLs | "url1,url2" |
| status | 상태 | "published" 또는 "draft" |

## 🎨 커스터마이징

### 테마 색상 변경

`styles/core/main.css` 파일의 CSS 변수 수정:

```css
:root {
    --primary: #007bff;        /* 메인 색상 */
    --primary-dark: #0963c7;   /* 메인 색상 (어두움) */
    --bg-primary: #ffffff;     /* 배경 색상 */
    /* ... */
}
```

### 다크 모드 커스터마이징

```css
[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
    /* ... */
}
```

### 댓글 시스템 설정

`scripts/core/config.js`에서 Utterances 설정:

```javascript
UTTERANCES: {
    REPO: 'username/repository',    // GitHub 저장소
    ISSUE_TERM: 'pathname',
    THEME: 'github-light',
    LABEL: '💬 comment'
}
```

## 🔧 고급 설정

### Google Analytics 연동

```javascript
// config.js
GA_TRACKING_ID: 'G-XXXXXXXXXX',
```

### 사용자 정의 도메인

GitHub Pages에서 커스텀 도메인 설정:

1. 도메인의 DNS에서 CNAME 레코드 추가: `username.github.io`
2. GitHub Settings → Pages → Custom domain 입력
3. `CNAME` 파일을 저장소 루트에 생성

## 📊 성능 최적화

### 이미지 최적화

- 자동 리사이즈: 최대 1920px 너비
- JPEG 압축: 85% 품질
- Lazy loading 적용
- WebP 포맷 지원

### 캐싱 전략

- LocalStorage 캐싱: 5분
- Google Sheets API 호출 최소화
- 이미지 CDN 활용 (Google Drive)

### SEO 최적화

- 메타 태그 자동 생성
- Open Graph 지원
- 구조화된 데이터 (JSON-LD)
- 사이트맵 자동 생성

## 🐛 문제 해결

### 일반적인 문제

**Q: 이미지가 업로드되지 않습니다**
- Apps Script URL이 올바른지 확인
- Google Drive 폴더 권한 확인
- 파일 크기 제한 (10MB) 확인

**Q: 포스트가 표시되지 않습니다**
- Google Sheets 공개 설정 확인
- CSV URL 정확성 확인
- 브라우저 개발자 도구 콘솔 확인

**Q: CORS 오류가 발생합니다**
- Apps Script 배포 시 "전체" 액세스 권한 선택
- XMLHttpRequest 사용 (fetch 대신)

### 디버깅

브라우저 콘솔에서 다음 함수들 사용:

```javascript
// 캐시 초기화
clearBlogCache();

// 포스트 새로고침
refreshBlog();

// 통계 확인
app.showStats();
```

## 📈 성능 지표

- **Lighthouse 점수**: 90+ (Performance, SEO, Accessibility)
- **페이지 로딩 시간**: < 2초
- **이미지 최적화**: 자동 압축 및 리사이즈
- **모바일 점수**: 85+

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙋‍♂️ 지원

- 📧 이메일: [your-email@example.com](mailto:your-email@example.com)
- 🐛 이슈: [GitHub Issues](https://github.com/jwbaek96/blog1/issues)
- 💬 토론: [GitHub Discussions](https://github.com/jwbaek96/blog1/discussions)

## 📚 관련 링크

- [Google Apps Script 문서](https://developers.google.com/apps-script)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [GitHub Pages 가이드](https://pages.github.com/)
- [Utterances 댓글 시스템](https://utteranc.es/)

---

⭐ 이 프로젝트가 도움이 되었다면 별표를 눌러주세요!