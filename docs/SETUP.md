# Google Sheets 블로그 설정 가이드

이 가이드는 Google Sheets 기반 블로그를 처음부터 설정하는 단계별 안내서입니다.

## 📋 사전 준비사항

- Google 계정
- GitHub 계정
- 기본적인 HTML/CSS 지식 (선택사항)

## 🔧 Step 1: Google Drive 폴더 설정

### 1-1. 폴더 생성

1. [Google Drive](https://drive.google.com) 접속
2. 좌측 상단 "새로 만들기" → "폴더" 클릭
3. 폴더 이름: **"Blog Media"** (또는 원하는 이름)

### 1-2. 폴더 공유 설정

1. 생성한 폴더 우클릭 → "공유" 선택
2. "링크가 있는 모든 사용자" 선택
3. 권한: "보기" (기본값)
4. "링크 복사" 클릭하여 URL 저장

### 1-3. 폴더 ID 추출

URL 예시: `https://drive.google.com/drive/folders/1ABC123xyz_FOLDER_ID_HERE`
-> https://drive.google.com/drive/folders/1gei84cTcsgRheWIyhGuqPLX4DZcXTJkb?usp=sharing
**FOLDER_ID**만 따로 복사해두세요. (예: `1ABC123xyz_FOLDER_ID_HERE`)
-> 1gei84cTcsgRheWIyhGuqPLX4DZcXTJkb
                                                                            
---

## 📊 Step 2: Google Sheets 설정

### 2-1. 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com) 접속
2. "새로 만들기" → "빈 스프레드시트"
3. 파일 이름: **"Blog Posts"**

### 2-2. 데이터 구조 설정

A1 셀부터 다음 헤더를 입력:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| id | title | date | author | thumbnail | content | tags | images | videos | status |

### 2-3. 샘플 데이터 입력 (테스트용)

2번째 행에 샘플 데이터 입력:

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 첫 번째 포스트 | 2024-01-15 | 홍길동 |  | `<p>이것은 첫 번째 포스트입니다.</p>` | javascript,web | | | published |

### 2-4. 웹에 게시

1. 메뉴: **파일** → **공유** → **웹에 게시**
2. 게시할 대상: **전체 문서**
3. 형식: **쉼표로 구분된 값(.csv)**
4. "게시" 버튼 클릭
5. 생성된 URL 복사 (나중에 사용) -> https://docs.google.com/spreadsheets/d/e/2PACX-1vRXRuG3cRUqGABTludaX-ddVgqUCsfJ0EV37n3IifaAbREUxSqa4rJYp64evCH15v9hC8O-YSNMtPMc/pub?output=csv
https://docs.google.com/spreadsheets/d/1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY/edit?gid=0#gid=0
---

## ⚙️ Step 3: Google Apps Script 설정

### 3-1. 새 프로젝트 생성

1. [Google Apps Script](https://script.google.com) 접속
2. "새 프로젝트" 클릭
3. 프로젝트 이름: **"Blog Upload API"**

### 3-2. 코드 입력

1. `Code.gs` 파일이 열려있는지 확인
2. 기존 내용을 모두 삭제
3. `apps-script/Code.gs` 파일의 내용을 복사하여 붙여넣기

### 3-3. 폴더 ID 설정

코드에서 다음 줄을 찾아 수정:

```javascript
const BLOG_FOLDER_ID = 'YOUR_GOOGLE_DRIVE_FOLDER_ID_HERE';
```

↓ 변경

```javascript
const BLOG_FOLDER_ID = '1ABC123xyz_FOLDER_ID_HERE'; // Step 1에서 복사한 실제 폴더 ID
```

### 3-4. 테스트 실행

1. 함수 선택: `testUpload`
2. "실행" 버튼 클릭
3. 권한 요청 시 "허용"
4. 실행 로그에서 "✅ Test upload successful!" 확인

### 3-5. 웹앱 배포

1. 우측 상단 "배포" → "새 배포" 클릭
2. 설정:
   - **유형**: 웹 앱
   - **설명**: Blog Upload API
   - **실행 권한**: 나
   - **액세스 권한**: 전체 (모든 사용자)
3. "배포" 클릭
4. **배포 URL 복사** (매우 중요!)

URL 형태: `https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec`

---

## 📁 Step 4: 프로젝트 파일 설정

### 4-1. GitHub 저장소 설정

1. GitHub에서 새 저장소 생성 (예: `my-blog`)
2. 로컬에 클론:
   ```bash
   git clone https://github.com/YOUR_USERNAME/my-blog.git
   cd my-blog
   ```

### 4-2. 프로젝트 파일 복사

이 프로젝트의 모든 파일을 새 저장소로 복사

### 4-3. 설정 파일 수정

`js/config.js` 파일 열기 후 다음 값들 수정:

```javascript
const CONFIG = {
    // Step 3에서 복사한 Apps Script URL
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec',
    
    
    // Step 2에서 생성한 Google Sheet ID (URL에서 추출)
    GOOGLE_SHEET_ID: 'YOUR_SHEET_ID_HERE',
    
    // Step 2에서 복사한 CSV URL
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/[SHEET_ID]/export?format=csv',
    
    // 블로그 정보
    BLOG_TITLE: 'My Blog',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://YOUR_USERNAME.github.io/my-blog/',
    
    // 댓글 시스템 (선택사항)
    UTTERANCES: {
        REPO: 'YOUR_USERNAME/my-blog',
        // ...
    }
};
```

**Google Sheets ID 찾기:**
- Sheets URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
- `[SHEET_ID]` 부분이 필요한 ID입니다.

---

## 🚀 Step 5: 배포 및 테스트

### 5-1. 로컬 테스트

```bash
# Python 3이 설치된 경우
python -m http.server 8000

# 또는 Node.js가 설치된 경우
npx serve .

# 또는 PHP가 설치된 경우
php -S localhost:8000
```

브라우저에서 `http://localhost:8000` 접속하여 테스트

### 5-2. GitHub Pages 배포

1. 코드를 GitHub에 푸시:
   ```bash
   git add .
   git commit -m "Initial blog setup"
   git push origin main
   ```

2. GitHub 저장소 페이지에서:
   - **Settings** → **Pages**
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Save** 클릭

3. 배포 완료 후 접속:
   `https://YOUR_USERNAME.github.io/my-blog/`

---

## ✅ Step 6: 기능 테스트

### 6-1. 에디터 테스트

1. `/editor.html` 페이지 접속
2. 제목, 작성자, 태그 입력
3. 내용 작성
4. 이미지 업로드 테스트
5. "HTML 내보내기" 클릭

### 6-2. 포스트 발행

1. 생성된 HTML 코드 복사
2. Google Sheets로 이동
3. 새 행에 데이터 입력:
   - id: 2
   - title: 테스트 포스트
   - date: 2024-01-16
   - author: Your Name
   - content: [복사한 HTML 코드]
   - tags: test,sample
   - status: published

### 6-3. 블로그 확인

1. 메인 페이지 새로고침
2. 새 포스트가 표시되는지 확인
3. 포스트 클릭하여 상세 페이지 확인

---

## 🎨 Step 7: 커스터마이징 (선택사항)

### 7-1. 색상 테마 변경

`css/main.css` 파일에서 CSS 변수 수정:

```css
:root {
    --primary: #007bff;     /* 원하는 색상으로 변경 */
    --primary-dark: #0963c7;
}
```

### 7-2. 블로그 정보 수정

- `index.html`: 메타 태그, 제목 수정
- `js/config.js`: 블로그 설정 수정

### 7-3. 댓글 시스템 활성화

1. GitHub 저장소에서 Issues 활성화
2. `js/config.js`에서 `FEATURES.COMMENTS: true`
3. `UTTERANCES.REPO` 설정

---

## 🚨 문제 해결

### 자주 발생하는 문제

**1. 이미지 업로드가 안 됨**
- Apps Script URL 확인
- Google Drive 폴더 권한 확인
- 브라우저 콘솔 에러 메시지 확인

**2. 포스트가 표시되지 않음**
- Google Sheets 공개 설정 확인
- CSV URL 정확성 확인
- 캐시 초기화: `localStorage.clear()`

**3. CORS 에러**
- Apps Script 배포 시 "전체" 액세스 권한 확인
- URL이 올바른지 확인

### 디버깅 도구

브라우저 개발자 도구 콘솔에서:

```javascript
// 설정 확인
console.log(CONFIG);

// 캐시 초기화
localStorage.clear();

// 포스트 데이터 확인
SheetsAPI.fetchPosts().then(console.log);
```

---

## 📞 지원

문제가 발생하면:

1. **GitHub Issues**: 버그 신고 및 기능 요청
2. **Documentation**: README.md 참조
3. **Community**: GitHub Discussions 활용

---

**축하합니다! 🎉**

이제 Google Sheets 기반 블로그가 완성되었습니다. 
에디터에서 멋진 포스트를 작성해보세요!