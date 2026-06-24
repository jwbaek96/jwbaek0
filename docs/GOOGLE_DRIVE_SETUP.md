# Google Drive 업로드 설정 가이드

이 가이드는 블로그에서 Google Drive 업로드 기능을 사용하기 위한 설정 방법을 안내합니다.

## 📋 필요한 정보

다음 단계들을 완료한 후, 얻게 될 정보들:

1. **Google Client ID**: OAuth 인증을 위한 클라이언트 ID
2. **Google API Key**: Google Drive API 접근을 위한 API 키  
3. **Google Drive Folder ID**: 업로드 파일들이 저장될 폴더의 ID

## 🚀 설정 단계

### 1. Google Cloud Console 프로젝트 생성
- **URL**: https://console.cloud.google.com/
- **단계**: 새 프로젝트 생성 또는 기존 프로젝트 선택

### 2. Google Drive API 활성화
- **경로**: API 및 서비스 > 라이브러리
- **검색**: "Google Drive API"
- **작업**: "사용 설정" 클릭

### 3. OAuth 동의 화면 설정 (처음 설정하는 경우만)
- **경로**: API 및 서비스 > OAuth 동의 화면
- **User Type**: "외부" 선택
- **앱 이름**: `Blog Portfolio` (또는 원하는 이름)
- **사용자 지원 이메일**: 본인 이메일
- **개발자 연락처**: 본인 이메일

### 4. OAuth 2.0 클라이언트 ID 생성
- **경로**: API 및 서비스 > 사용자 인증 정보
- **작업**: "+ 사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"
- **애플리케이션 유형**: "웹 애플리케이션"
- **이름**: `Blog Portfolio Web Client`
- **승인된 JavaScript 원본**:
  ```
  http://localhost:8080
  http://127.0.0.1:8080
  ```
- ✅ **결과**: 클라이언트 ID 복사

### 5. API 키 생성
- **경로**: 같은 "사용자 인증 정보" 페이지
- **작업**: "+ 사용자 인증 정보 만들기" > "API 키"
- **키 제한**:
  - **HTTP 리퍼러 (웹사이트)** 선택
  - **웹사이트 제한사항**: 
    ```
    http://localhost:8080/*
    http://127.0.0.1:8080/*
    ```
  - **API 제한**: "Google Drive API" 선택
- ✅ **결과**: API 키 복사

### 6. Google Drive 폴더 설정
- **URL**: https://drive.google.com/
- **작업**: 
  1. 새 폴더 생성: `Blog Data`
  2. 하위 폴더 생성: `Images`, `Videos`
  3. `Blog Data` 폴더 우클릭 > "공유"
  4. **"링크가 있는 모든 사용자"로 변경** (중요!)
  5. "링크 복사" 클릭
- ✅ **결과**: 
  ```
  https://drive.google.com/drive/folders/1ABC123def456GHI789jkl
  ```
  여기서 `1ABC123def456GHI789jkl` 부분이 폴더 ID

## ⚙️ config.js 설정

`js/config.js` 파일에서 다음 항목들을 업데이트하세요:

```javascript
// Google Drive Settings
GOOGLE_DRIVE_FOLDER_ID: '1ABC123def456GHI789jkl', // 위에서 복사한 폴더 ID
GOOGLE_DRIVE_API_KEY: 'AIzaSyC..._your_api_key_here', // 위에서 생성한 API 키
GOOGLE_CLIENT_ID: '123456789-abc...apps.googleusercontent.com', // 위에서 생성한 클라이언트 ID
```

## 🧪 테스트

설정이 완료되면 다음 파일을 열어서 테스트하세요:

- **테스트 페이지**: `test-drive-upload.html`
- **실제 에디터**: `editor.html`

### 테스트 순서:
1. **설정 확인** - 모든 필수 설정이 올바른지 확인
2. **인증 테스트** - Google 계정으로 로그인
3. **파일 업로드 테스트** - 이미지/비디오 파일 업로드
4. **폴더 구조 확인** - Drive에 올바르게 업로드되었는지 확인

## ❗ 문제 해결

### 인증 오류
- OAuth 동의 화면에서 본인을 테스트 사용자로 추가했는지 확인
- 승인된 JavaScript 원본에 현재 도메인이 추가되어 있는지 확인

### 업로드 오류
- Google Drive 폴더가 공개 상태로 설정되어 있는지 확인
- API 키 제한사항이 올바르게 설정되어 있는지 확인

### 권한 오류
- Google Drive API가 활성화되어 있는지 확인
- OAuth 클라이언트에 올바른 스코프가 설정되어 있는지 확인

## 🔒 보안 주의사항

- **API 키**와 **클라이언트 ID**는 공개되어도 괜찮지만, 적절한 제한사항을 설정하세요
- **폴더 ID**는 공개해도 무방하나, 업로드된 파일들의 프라이버시를 고려하세요
- 프로덕션 환경에서는 도메인 제한을 실제 도메인으로 변경하세요

## 🚀 완료!

모든 설정이 완료되면 블로그 에디터에서:
- 📷 이미지 업로드 버튼 클릭
- 🎥 비디오 업로드 버튼 클릭  
- 📎 드래그 앤 드롭으로 파일 업로드

이 기능들을 사용할 수 있습니다!