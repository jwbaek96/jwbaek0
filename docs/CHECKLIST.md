# 필수 설정 체크리스트

## ✅ 1단계: Google Drive 설정

- [ ] Google Drive에서 "Blog Media" 폴더 생성
- [ ] 폴더 공유 설정: "링크가 있는 모든 사용자"
- [ ] 폴더 ID 복사 완료

## ✅ 2단계: Google Apps Script 설정

- [ ] script.google.com에서 새 프로젝트 생성
- [ ] Code.gs 파일에 업로드 코드 붙여넣기
- [ ] BLOG_FOLDER_ID 값 설정
- [ ] testUpload() 함수 실행 및 테스트 성공
- [ ] 웹앱으로 배포 (액세스 권한: "전체")
- [ ] 배포 URL 복사 완료

## ✅ 3단계: Google Sheets 설정

- [ ] 새 스프레드시트 "Blog Posts" 생성
- [ ] 헤더 행 추가 (id, title, date, author, thumbnail, content, tags, images, videos, status)
- [ ] 샘플 데이터 1행 추가
- [ ] 웹에 게시 (CSV 형식)
- [ ] CSV URL 복사 완료

## ✅ 4단계: 프로젝트 설정

- [ ] js/config.js 파일에서 다음 값들 업데이트:
  - [ ] APPS_SCRIPT_URL
  - [ ] GOOGLE_SHEET_ID
  - [ ] GOOGLE_SHEET_URL
  - [ ] BLOG_TITLE
  - [ ] BLOG_AUTHOR
  - [ ] BLOG_URL

## ✅ 5단계: 배포 설정

- [ ] GitHub 저장소 생성
- [ ] 코드 업로드
- [ ] GitHub Pages 설정
- [ ] 배포 URL 접속 확인

## ✅ 6단계: 기능 테스트

- [ ] 에디터 페이지 접속 확인
- [ ] 이미지 업로드 테스트
- [ ] HTML 내보내기 테스트
- [ ] Google Sheets에 포스트 추가
- [ ] 블로그 메인 페이지에서 포스트 표시 확인
- [ ] 포스트 상세 페이지 확인

## 🔧 선택사항

- [ ] 커스텀 도메인 설정
- [ ] Google Analytics 연동
- [ ] 댓글 시스템 (Utterances) 설정
- [ ] 색상 테마 커스터마이징
- [ ] 소셜 미디어 링크 추가

## 📋 설정 값 메모

### Google Drive
- 폴더 ID: `_________________________`

### Apps Script
- 배포 URL: `_________________________`

### Google Sheets
- 스프레드시트 ID: `_________________________`
- CSV URL: `_________________________`

### GitHub
- 저장소 URL: `_________________________`
- GitHub Pages URL: `_________________________`

## 🚨 문제 발생 시 확인사항

### 이미지 업로드가 안 될 때:
1. Apps Script URL이 정확한가?
2. Google Drive 폴더 ID가 정확한가?
3. 파일 크기가 10MB 이하인가?
4. 브라우저 콘솔에 에러 메시지가 있는가?

### 포스트가 표시되지 않을 때:
1. Google Sheets가 웹에 게시되었는가?
2. CSV URL이 정확한가?
3. status 필드가 "published"인가?
4. 캐시를 초기화했는가? (localStorage.clear())

### CORS 에러가 발생할 때:
1. Apps Script 배포 시 "전체" 액세스 권한을 선택했는가?
2. URL에 오타가 없는가?

---

모든 체크리스트를 완료했다면 블로그가 정상 작동할 것입니다! 🎉