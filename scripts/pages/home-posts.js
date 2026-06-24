/**
 * Index Page Latest Blog Posts Module
 * 인덱스 페이지의 최신 블로그 포스트 섹션을 관리합니다.
 */

class IndexBlog {
    constructor() {
        this.maxPosts = 8; // 표시할 최대 포스트 수
        this.loadingElement = null;
        this.gridElement = null;
        this.errorElement = null;
        
        this.init();
    }

    init() {
        // DOM이 로드되면 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        this.setupElements();
        this.loadLatestPosts();
    }

    setupElements() {
        this.gridElement = document.querySelector('.blog-posts-grid');
        if (!this.gridElement) return;

        // 로딩 상태 생성
        this.createLoadingState();
    }

    createLoadingState() {
        this.gridElement.innerHTML = `
            <div class="blog-loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }

    async loadLatestPosts() {
        try {
            console.log('IndexBlog: Loading latest posts...');
            console.log('IndexBlog: CONFIG available:', typeof window.CONFIG !== 'undefined');
            console.log('IndexBlog: SheetsAPI available:', typeof window.SheetsAPI !== 'undefined');
            console.log('IndexBlog: createExcerpt available:', typeof createExcerpt !== 'undefined');
            
            // CONFIG 확인
            if (typeof window.CONFIG === 'undefined') {
                throw new Error('CONFIG가 로드되지 않았습니다.');
            }
            
            // SheetsAPI를 통해 최신 포스트 로드
            if (typeof window.SheetsAPI === 'undefined') {
                throw new Error('SheetsAPI가 로드되지 않았습니다.');
            }

            console.log('IndexBlog: Fetching posts from SheetsAPI...');
            const posts = await window.SheetsAPI.fetchPosts();
            console.log('IndexBlog: Posts received:', posts?.length || 0);
            console.log('IndexBlog: First post sample:', posts?.[0]);

            if (!posts || posts.length === 0) {
                console.log('IndexBlog: No posts found, showing empty state');
                this.showEmptyState();
                return;
            }

            // 비공개 포스트 필터링 (로그인하지 않은 경우 private 포스트 제외)
            const isLoggedIn = window.Auth && window.Auth.isLoggedIn();
            let filteredPosts = posts;
            if (!isLoggedIn) {
                filteredPosts = posts.filter(post => post.status !== 'private');
                console.log('IndexBlog: Filtered out private posts. Remaining:', filteredPosts.length);
            }

            // 날짜 순으로 정렬하고 최대 개수만큼 제한
            const latestPosts = filteredPosts
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, this.maxPosts);

            console.log('IndexBlog: Latest posts to render:', latestPosts.length);
            this.renderPosts(latestPosts);

        } catch (error) {
            console.error('IndexBlog: Error loading posts:', error);
            this.showErrorState(error.message || '알 수 없는 오류가 발생했습니다.');
        }
    }

    renderPosts(posts) {
        if (!this.gridElement) return;

        const postsHTML = posts.map(post => this.renderPostCard(post)).join('');
        this.gridElement.innerHTML = postsHTML;
    }

    renderPostCard(post) {
        const postDate = this.formatDate(post.date);
        const hasThumbnail = post.thumbnail && post.thumbnail.trim() !== '';
        
        // 비공개 포스트 상태 표시
        const isPrivate = post.status === 'private';
        const privateLabel = isPrivate ? '<span class="post-private-label">🔒</span>' : '';
        const privateClass = isPrivate ? 'post-private' : '';

        if (hasThumbnail) {
            // 썸네일이 있는 경우: 이미지 카드
            const thumbnailUrl = convertGoogleDriveUrl(post.thumbnail);
            const fallbackUrls = getGoogleDriveFallbackUrls(post.thumbnail);
            
            return `
                <article class="blog-post-card blog-post-card-with-image ${privateClass}" onclick="window.navigateToPost('${post.id}')" data-post-id="${post.id}">
                    <div class="blog-post-image">
                        <img src="${thumbnailUrl}" alt="${this.escapeHtml(post.title)}" loading="lazy" 
                             data-fallback-urls='${JSON.stringify(fallbackUrls)}'
                             data-current-index="0"
                             onerror="tryFallbackImage(this);">
                    </div>
                    <div class="blog-post-content">
                        <div class="blog-post-info">
                            <h3 class="blog-post-title">${this.escapeHtml(post.title)}</h3>
                            <div class="blog-post-meta">
                                <div class="blog-post-date">${postDate}</div>
                                ${privateLabel}
                            </div>
                        </div>
                    </div>
                </article>
            `;
        } else {
            // 썸네일이 없는 경우: 기본 카드
            return `
                <article class="blog-post-card ${privateClass}" onclick="window.navigateToPost('${post.id}')" data-post-id="${post.id}">
                    <div class="blog-post-content">
                        <div class="blog-post-info">
                            <h3 class="blog-post-title">${this.escapeHtml(post.title)}</h3>
                            <div class="blog-post-meta">
                                <div class="blog-post-date">${postDate}</div>
                                ${privateLabel}
                            </div>
                        </div>
                    </div>
                </article>
            `;
        }
    }

    createExcerpt(content, maxLength = 120) {
        if (!content) return '내용을 준비 중입니다...';
        
        // HTML 태그 제거
        const textContent = content.replace(/<[^>]*>/g, '').trim();
        
        if (textContent.length <= maxLength) {
            return textContent;
        }
        
        // 단어 단위로 자르기
        const truncated = textContent.substr(0, maxLength);
        const lastSpaceIndex = truncated.lastIndexOf(' ');
        
        if (lastSpaceIndex > 0 && lastSpaceIndex > maxLength * 0.8) {
            return truncated.substr(0, lastSpaceIndex) + '...';
        }
        
        return truncated + '...';
    }

    parseTags(tagsString) {
        if (!tagsString || typeof tagsString !== 'string') return [];
        
        return tagsString
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return '날짜 정보 없음';
            }
            
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\./g, '.').replace(/\s/g, '');
        } catch (error) {
            console.error('IndexBlog: Date formatting error:', error);
            return '날짜 정보 없음';
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEmptyState() {
        if (!this.gridElement) return;
        
        this.gridElement.innerHTML = `
            <div class="blog-error">
                <h3>🎉 블로그를 준비하고 있어요!</h3>
                <p>곧 멋진 포스트들을 만나보실 수 있습니다.</p>
            </div>
        `;
    }

    showErrorState(errorMessage) {
        if (!this.gridElement) return;
        
        this.gridElement.innerHTML = `
            <div class="blog-error">
                <h3>😅 일시적인 문제가 발생했어요</h3>
                <p>포스트를 불러오는 중 오류가 발생했습니다.</p>
                <p style="font-size: 0.9em; color: #999; margin: 0.5rem 0;">${errorMessage}</p>
                <button onclick="window.retryLoadPosts()">다시 시도</button>
            </div>
        `;
    }

    // 포스트로 이동하는 함수를 카드 요소에 추가
    setupCardNavigation() {
        document.querySelectorAll('.blog-post-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const postId = card.getAttribute('data-post-id');
                if (postId) {
                    window.location.href = `post.html?id=${postId}`;
                }
            });
        });
    }

    // 로그인 상태 변경 시 블로그 포스트 새로고침
    refreshPosts() {
        console.log('IndexBlog: Refreshing posts due to auth state change');
        this.loadLatestPosts();
    }
}

// 카드 클릭 네비게이션을 전역 함수로 등록
window.navigateToPost = function(postId) {
    if (postId) {
        window.location.href = `post.html?id=${postId}`;
    }
};

// 전역 인스턴스 생성
window.indexBlog = new IndexBlog();

// 에러 상황에서의 재시도 기능
window.retryLoadPosts = function() {
    if (window.indexBlog) {
        window.indexBlog.loadLatestPosts();
    }
};

// 로그인 상태 변경 시 블로그 포스트 새로고침
window.refreshIndexBlog = function() {
    if (window.indexBlog) {
        window.indexBlog.refreshPosts();
    }
};