// Environment Variables Loader for Client-side
// 로컬 개발환경에서 .env 파일을 읽어오는 유틸리티

class EnvLoader {
    constructor() {
        this.env = {};
        this.isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';
    }

    async loadEnv() {
        if (!this.isLocal) {
            // 배포환경에서는 환경변수 로드하지 않음
            return {};
        }

        try {
            // .env 파일을 텍스트로 읽기 시도
            const response = await fetch('/.env');
            if (!response.ok) {
                console.warn('.env 파일을 찾을 수 없습니다. 기본값을 사용합니다.');
                return {};
            }

            const envText = await response.text();
            const envLines = envText.split('\n');
            
            envLines.forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#') && line.includes('=')) {
                    const [key, ...valueParts] = line.split('=');
                    const value = valueParts.join('=');
                    this.env[key.trim()] = value.trim();
                }
            });

            return this.env;
        } catch (error) {
            console.warn('환경변수 로드 실패:', error);
            return {};
        }
    }

    get(key, defaultValue = '') {
        return this.env[key] || defaultValue;
    }
}

// 전역으로 사용할 수 있도록 export
window.EnvLoader = EnvLoader;