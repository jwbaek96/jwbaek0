// Head Meta Tags Manager
// HTML의 head에 favicon 및 기타 메타태그를 자동으로 추가합니다.
// 사용법: HTML의 head에 <script src="../scripts/shared/head-meta.js"></script> 추가

(function() {
    'use strict';
    
    // Favicon 설정 (경로는 assets 폴더 기준)
    const faviconConfigs = [
        { rel: 'shortcut icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/assets/favicon/icon_16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/assets/favicon/icon_32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/assets/favicon/icon_96x96.png' }
    ];
    
    // 기본 메타태그 설정
    const defaultMetaTags = [
        { charset: 'UTF-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
        { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' }
    ];
    
    /**
     * link 태그 생성 및 head에 추가
     */
    function addFaviconLinks() {
        const head = document.head;
        
        faviconConfigs.forEach(config => {
            // 기존 동일한 rel의 link 태그가 있는지 확인
            const existingLink = head.querySelector(`link[rel="${config.rel}"]${config.sizes ? `[sizes="${config.sizes}"]` : ''}`);
            if (existingLink) {
                existingLink.remove(); // 기존 태그 제거
            }
            
            const link = document.createElement('link');
            
            // 속성 설정
            Object.keys(config).forEach(key => {
                link.setAttribute(key, config[key]);
            });
            
            head.appendChild(link);
        });
        
        console.log('✅ Favicon links added to head');
    }
    
    /**
     * 메타태그 생성 및 head에 추가
     */
    function addMetaTags() {
        const head = document.head;
        
        defaultMetaTags.forEach(config => {
            // charset은 특별 처리
            if (config.charset) {
                let existingMeta = head.querySelector('meta[charset]');
                if (existingMeta) {
                    existingMeta.setAttribute('charset', config.charset);
                } else {
                    const meta = document.createElement('meta');
                    meta.setAttribute('charset', config.charset);
                    head.insertBefore(meta, head.firstChild); // charset은 맨 앞에
                }
                return;
            }
            
            // 기존 동일한 메타태그 확인
            const selector = config.name ? `meta[name="${config.name}"]` : 
                           config['http-equiv'] ? `meta[http-equiv="${config['http-equiv']}"]` : null;
            
            if (selector) {
                const existingMeta = head.querySelector(selector);
                if (existingMeta) {
                    existingMeta.remove(); // 기존 태그 제거
                }
            }
            
            const meta = document.createElement('meta');
            
            // 속성 설정
            Object.keys(config).forEach(key => {
                meta.setAttribute(key, config[key]);
            });
            
            head.appendChild(meta);
        });
        
        console.log('✅ Meta tags added to head');
    }
    
    /**
     * 사용자 정의 메타태그 추가 (선택사항)
     */
    function addCustomMetaTags(customTags = []) {
        if (customTags.length === 0) return;
        
        const head = document.head;
        
        customTags.forEach(config => {
            const meta = document.createElement('meta');
            
            Object.keys(config).forEach(key => {
                meta.setAttribute(key, config[key]);
            });
            
            head.appendChild(meta);
        });
        
        console.log(`✅ ${customTags.length} custom meta tags added`);
    }
    
    /**
     * 모든 메타태그와 favicon 초기화
     */
    function initHeadMeta(customMetas = []) {
        try {
            addMetaTags();
            addFaviconLinks();
            addCustomMetaTags(customMetas);
            console.log('🎯 Head meta initialization complete');
        } catch (error) {
            console.error('❌ Head meta initialization failed:', error);
        }
    }
    
    // DOM이 로드되면 자동으로 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initHeadMeta());
    } else {
        initHeadMeta();
    }
    
    // 전역 접근을 위한 API 노출
    window.HeadMeta = {
        init: initHeadMeta,
        addCustomMetas: addCustomMetaTags,
        addFavicons: addFaviconLinks,
        addMetas: addMetaTags
    };
    
})();