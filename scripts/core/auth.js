// Authentication utilities

class AuthManager {
    constructor() {
        this.TOKEN_KEY = 'admin_token';
        this.EXPIRES_KEY = 'admin_expires';
    }

    // 로그인 상태 확인
    isLoggedIn() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const expires = localStorage.getItem(this.EXPIRES_KEY);
        
        if (!token || !expires) return false;
        
        // 토큰 만료 확인
        if (Date.now() > parseInt(expires)) {
            this.logout();
            return false;
        }
        
        return true;
    }

    // 로그인
    login(token, expiresAt) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.EXPIRES_KEY, expiresAt);
    }

    // 로그아웃
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.EXPIRES_KEY);
    }

    // 토큰 가져오기
    getToken() {
        return this.isLoggedIn() ? localStorage.getItem(this.TOKEN_KEY) : null;
    }

    // 로그인 페이지로 리디렉션
    redirectToLogin() {
        window.location.href = '/login.html';
    }

    // 보호된 페이지 접근 확인
    requireAuth() {
        if (!this.isLoggedIn()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    }
}

// 전역 인스턴스
const Auth = new AuthManager();

// 전역으로 사용할 수 있도록 export
if (typeof window !== 'undefined') {
    window.Auth = Auth;
}