// Blog main page functionality

class BlogApp {
    constructor() {
        this.posts = [];
        this.allPosts = [];
        this.currentPage = 1;
        this.postsPerPage = CONFIG.POSTS_PER_PAGE;
        this.selectedTags = this.parseSelectedTagsFromUrl();
        this.searchQuery = this.parseSearchQueryFromUrl();
        this.currentView = this.parseViewMode();
        this.isLoading = false;
        this.boundOutsideClickHandler = null;
        
        this.init();
    }

    parseSelectedTagsFromUrl() {
        const tagsParam = getUrlParameter('tags') || getUrlParameter('tag') || '';
        if (!tagsParam) return [];

        const decoded = decodeURIComponent(tagsParam);
        const tags = decoded
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        return [...new Set(tags)];
    }

    parseViewMode() {
        const urlView = getUrlParameter('view');
        const storedView = localStorage.getItem('blog_view_mode');
        const view = urlView || storedView || 'list';

        return this.isValidViewMode(view) ? view : 'list';
    }

    parseSearchQueryFromUrl() {
        return (getUrlParameter('q') || '').trim();
    }

    isValidViewMode(view) {
        return ['grid', 'list', 'post'].includes(view);
    }

    updateUrlState() {
        const url = new URL(window.location);

        if (this.selectedTags.length > 0) {
            url.searchParams.set('tags', this.selectedTags.join(','));
        } else {
            url.searchParams.delete('tags');
            url.searchParams.delete('tag');
        }

        if (this.currentView !== 'list') {
            url.searchParams.set('view', this.currentView);
        } else {
            url.searchParams.delete('view');
        }

        if (this.searchQuery) {
            url.searchParams.set('q', this.searchQuery);
        } else {
            url.searchParams.delete('q');
        }

        window.history.replaceState({}, '', url);
    }

    matchesSelectedTags(post) {
        if (this.selectedTags.length === 0) return true;

        const postTags = Array.isArray(post.tags)
            ? post.tags.map(tag => String(tag).toLowerCase())
            : [];

        return this.selectedTags.every(tag => postTags.includes(tag.toLowerCase()));
    }

    matchesSearchQuery(post) {
        if (!this.searchQuery) return true;

        const q = this.searchQuery.toLowerCase();
        const searchableText = [
            post.title || '',
            post.excerpt || '',
            post.content || '',
            Array.isArray(post.tags) ? post.tags.join(' ') : ''
        ].join(' ').toLowerCase();

        return searchableText.includes(q);
    }

    /**
     * Initialize the blog app
     */
    async init() {
        this.setupEventListeners();
        this.showLoading();
        
        try {
            await this.loadPosts();
            this.renderPage();
            

        } catch (error) {
            console.error('❌ Blog initialization error:', error);
            this.showError('블로그를 초기화하는데 실패했습니다.');
        }
    }

    /**
     * Load posts from Google Sheets
     */
    async loadPosts() {
        try {
            this.allPosts = await window.SheetsAPI.fetchPosts();
            
            // Process posts to generate excerpts if missing
            this.allPosts = this.allPosts.map(post => {
                if (!post.excerpt && post.content) {
                    // HTML에서 텍스트 추출하고 요약 생성
                    post.excerpt = this.createExcerpt(post.content);
                }
                return post;
            });
            
            this.filterPosts();
        } catch (error) {
            console.error('❌ Error loading posts:', error);
        }
    }

    /**
     * Create excerpt from HTML content
     */
    createExcerpt(htmlContent, maxLength = 150) {
        if (!htmlContent) return '내용이 없습니다.';
        
        // HTML 태그 제거
        const textContent = htmlContent.replace(/<[^>]*>/g, '');
        
        // 공백 정리
        const cleanText = textContent.replace(/\s+/g, ' ').trim();
        
        // 길이 제한
        if (cleanText.length <= maxLength) {
            return cleanText;
        }
        
        return cleanText.substring(0, maxLength).trim() + '...';
    }

    /**
     * Filter posts based on current filters
     */
    filterPosts() {
        let filteredPosts = [...this.allPosts];

        // Filter by status (비공개 포스트 처리)
        const isLoggedIn = window.Auth && window.Auth.isLoggedIn();
        if (!isLoggedIn) {
            // 로그인하지 않은 경우 private 포스트 제외
            filteredPosts = filteredPosts.filter(post => post.status !== 'private');
        }
        // 로그인한 경우 모든 포스트 표시 (private 포함)

        // Filter by selected tags (AND)
        if (this.selectedTags.length > 0) {
            filteredPosts = filteredPosts.filter(post => this.matchesSelectedTags(post));
        }

        // Filter by search query
        if (this.searchQuery) {
            filteredPosts = filteredPosts.filter(post => this.matchesSearchQuery(post));
        }

        this.posts = filteredPosts;
        this.currentPage = 1; // Reset to first page
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.selectedTags = this.parseSelectedTagsFromUrl();
            this.searchQuery = this.parseSearchQueryFromUrl();
            this.currentView = this.parseViewMode();
            this.filterPosts();
            this.renderPage();
        });

        const searchInput = document.getElementById('blogSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    }

    /**
     * Handle tag filter
     * @param {string} tag - Tag to filter by
     */
    handleTagFilter(tag) {
        if (!tag) {
            this.selectedTags = [];
        } else {
            const exists = this.selectedTags.some(selected => selected.toLowerCase() === tag.toLowerCase());
            this.selectedTags = exists
                ? this.selectedTags.filter(selected => selected.toLowerCase() !== tag.toLowerCase())
                : [...this.selectedTags, tag];
        }

        this.updateUrlState();
        this.filterPosts();
        this.renderPage();
    }

    handleViewModeChange(viewMode) {
        if (!this.isValidViewMode(viewMode)) return;

        this.currentView = viewMode;
        localStorage.setItem('blog_view_mode', viewMode);
        this.updateUrlState();
        this.renderPage();
    }

    handleSearch(value) {
        this.searchQuery = (value || '').trim();
        this.currentPage = 1;
        this.updateUrlState();
        this.filterPosts();
        this.renderPosts();
        this.renderPagination();
        this.updatePageTitle();
    }

    /**
     * Render the entire page
     */
    renderPage() {
        this.hideLoading();
        this.renderSearchControl();
        this.renderViewModeControls();
        this.renderTagFilters();
        this.renderPosts();
        this.renderPagination();
        this.updatePageTitle();
    }

    renderSearchControl() {
        const searchInput = document.getElementById('blogSearchInput');
        if (!searchInput) return;

        if (searchInput.value !== this.searchQuery) {
            searchInput.value = this.searchQuery;
        }
    }

    renderViewModeControls() {
        const viewModeControls = document.getElementById('viewModeControls');
        if (!viewModeControls) return;

        const controls = [
            {
                key: 'grid',
                title: '그리드 보기',
                icon: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="3" width="4" height="4"></rect>
                        <rect x="10" y="3" width="4" height="4"></rect>
                        <rect x="17" y="3" width="4" height="4"></rect>
                        <rect x="3" y="10" width="4" height="4"></rect>
                        <rect x="10" y="10" width="4" height="4"></rect>
                        <rect x="17" y="10" width="4" height="4"></rect>
                        <rect x="3" y="17" width="4" height="4"></rect>
                        <rect x="10" y="17" width="4" height="4"></rect>
                        <rect x="17" y="17" width="4" height="4"></rect>
                    </svg>
                `
            },
            {
                key: 'list',
                title: '리스트 보기',
                icon: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="4" width="18" height="4" rx="1"></rect>
                        <rect x="3" y="10" width="18" height="4" rx="1"></rect>
                        <rect x="3" y="16" width="18" height="4" rx="1"></rect>
                    </svg>
                `
            },
            {
                key: 'post',
                title: '게시물 보기',
                icon: `
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="2" rx="1"></rect>
                    </svg>
                `
            }
        ];

        viewModeControls.innerHTML = controls.map(control => `
            <button
                type="button"
                class="view-mode-btn ${this.currentView === control.key ? 'active' : ''}"
                data-view-mode="${control.key}"
                aria-label="${control.title}"
                title="${control.title}"
            >
                ${control.icon}
            </button>
        `).join('');

        viewModeControls.onclick = (e) => {
            const btn = e.target.closest('.view-mode-btn');
            if (!btn) return;

            this.handleViewModeChange(btn.dataset.viewMode);
        };
    }

    /**
     * Render tag filters
     */
    renderTagFilters() {
        const tagFiltersContainer = document.getElementById('tagFilters');
        if (!tagFiltersContainer) return;

        const publishedPosts = this.allPosts.filter(post => post.status === 'published');
        const allTags = window.SheetsAPI.getAllTags(publishedPosts);
        const tagCounts = this.getTagCounts();

        // 태그를 개수 > 언어 > 알파벳 순으로 정렬
        const sortedTags = allTags.sort((a, b) => {
            const aCount = tagCounts[a] || 0;
            const bCount = tagCounts[b] || 0;
            
            // 1. 개수가 많은 순으로 정렬
            if (aCount !== bCount) {
                return bCount - aCount;
            }
            
            // 2. 개수가 같으면 언어별로 정렬 (영어 먼저, 한글 나중)
            const aIsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(a);
            const bIsKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(b);
            
            if (aIsKorean && !bIsKorean) return 1;  // 한글이 뒤로
            if (!aIsKorean && bIsKorean) return -1; // 영어가 앞으로
            
            // 3. 같은 언어끼리는 알파벳/가나다 순으로 정렬
            return a.localeCompare(b, 'ko', { numeric: true, caseFirst: 'lower' });
        });

        const featuredTags = ['artwork', 'blog'];
        const featuredSet = new Set(featuredTags.map(tag => tag.toLowerCase()));
        const otherTags = sortedTags.filter(tag => !featuredSet.has(tag.toLowerCase()));

        const featuredHTML = featuredTags.map(tag => {
            const count = Object.keys(tagCounts).find(key => key.toLowerCase() === tag.toLowerCase());
            const tagName = count || tag;
            const tagCount = tagCounts[tagName] || 0;
            const isActive = this.selectedTags.some(selected => selected.toLowerCase() === tag.toLowerCase());

            return `
                <button class="tag-filter ${isActive ? 'active' : ''}" data-tag="${tagName}">
                    ${tagName} (${tagCount})
                </button>
            `;
        }).join('');

        const othersHTML = otherTags.map(tag => {
            const count = tagCounts[tag] || 0;
            const isActive = this.selectedTags.some(selected => selected.toLowerCase() === tag.toLowerCase());

            return `
                <button class="tag-filter ${isActive ? 'active' : ''}" data-tag="${tag}">
                    ${tag} (${count})
                </button>
            `;
        }).join('');

        let filtersHTML = `
            <div class="tag-filter-row tag-filter-row-primary">${featuredHTML}</div>
            <div class="tag-filter-row tag-filter-row-secondary">
                <button class="tag-filter ${this.selectedTags.length === 0 ? 'active' : ''}" data-tag="" data-reset="true">
                    all (${publishedPosts.length})
                </button>
                ${othersHTML}
            </div>
        `;

        tagFiltersContainer.innerHTML = filtersHTML;

        // Add event listeners
        tagFiltersContainer.onclick = (e) => {
            const tagButton = e.target.closest('.tag-filter');
            if (tagButton) {
                const tag = tagButton.dataset.tag;
                this.handleTagFilter(tag);
            }
        };
    }

    /**
     * Get tag counts
     * @returns {Object} Tag counts
     */
    getTagCounts() {
        const counts = {};
        
        // 게시된 게시글만 필터링
        const publishedPosts = this.allPosts.filter(post => post.status === 'published');
        
        publishedPosts.forEach(post => {
            // post.tags가 배열이고 비어있지 않은 경우
            if (Array.isArray(post.tags) && post.tags.length > 0) {
                post.tags.forEach(tag => {
                    counts[tag] = (counts[tag] || 0) + 1;
                });
            } else {
                // 태그가 없는 경우 "미분류"로 카운트
                counts['미분류'] = (counts['미분류'] || 0) + 1;
            }
        });

        return counts;
    }

    /**
     * Render posts
     */
    renderPosts() {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;

        if (this.posts.length === 0) {
            this.showEmptyState();
            return;
        }

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.postsPerPage;
        const endIndex = startIndex + this.postsPerPage;
        const currentPosts = this.posts.slice(startIndex, endIndex);

        postsContainer.className = `posts-grid view-${this.currentView}`;

        // Render posts
        const postsHTML = currentPosts.map(post => {
            if (this.currentView === 'grid') {
                return this.renderPostGridCard(post);
            }

            if (this.currentView === 'post') {
                return this.renderPostSimpleItem(post);
            }

            return this.renderPostCard(post);
        }).join('');
        postsContainer.innerHTML = postsHTML;

        // Add post click handlers
        this.setupPostClickHandlers();

        // Add lazy loading for images
        this.setupLazyLoading();
    }

    /**
     * Setup post click handlers
     */
    setupPostClickHandlers() {
        const postCards = document.querySelectorAll('.post-card, .post-grid-card, .post-simple-item');
        postCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const postId = card.dataset.postId;
                this.openPostDetail(postId);
            });

            // 카드에서 마우스가 벗어나면 액션 메뉴 닫기
            card.addEventListener('mouseleave', (e) => {
                const postActions = card.querySelector('.post-actions');
                const postActionsMenu = card.querySelector('.post-actions-menu');
                
                if (postActions) postActions.classList.remove('active');
                if (postActionsMenu) postActionsMenu.classList.remove('active');
            });
        });

        // 액션 메뉴 외부 클릭 시 메뉴 닫기
        if (!this.boundOutsideClickHandler) {
            this.boundOutsideClickHandler = (e) => {
                if (!e.target.closest('.post-actions')) {
                    const activeMenus = document.querySelectorAll('.post-actions-menu.active');
                    const activeActions = document.querySelectorAll('.post-actions.active');
                    activeMenus.forEach(menu => menu.classList.remove('active'));
                    activeActions.forEach(action => action.classList.remove('active'));
                }
            };

            document.addEventListener('click', this.boundOutsideClickHandler);
        }
    }

    /**
     * Open post detail in new page
     * @param {string} postId - Post ID
     */
    async openPostDetail(postId) {
        try {
            const post = this.allPosts.find(p => p.id === postId || String(p.id) === String(postId));
            if (!post) {
                console.error('❌ Post not found:', postId);
                showToast('포스트를 찾을 수 없습니다', 'error');
                return;
            }
            const returnUrl = `blog.html${window.location.search || ''}`;
            window.location.href = `post.html?id=${encodeURIComponent(postId)}&from=blog&return=${encodeURIComponent(returnUrl)}`;
            
        } catch (error) {
            console.error('❌ Error opening post:', error);
            showToast('포스트를 불러오는데 실패했습니다', 'error');
        }
    }



    /**
     * Render individual post card
     * @param {Object} post - Post object
     * @returns {string} HTML string
     */
    renderPostCard(post) {
        const hasThumbnail = post.thumbnail && post.thumbnail.trim() !== '';
        
        // post.tags가 배열인지 확인하고 안전하게 처리
        const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
        const tagsHTML = tags.map(tag => 
            `<a href="blog.html?tags=${encodeURIComponent(tag)}" class="post-tag" onclick="event.stopPropagation()">${tag}</a>`
        ).join('');

        // 비공개 포스트 상태 표시
        const isPrivate = post.status === 'private';
        const privateLabel = isPrivate ? '<span class="post-private-label">🔒</span>' : '';

        // 더보기 버튼과 액션 메뉴 HTML (로그인 상태에서만 표시)
        const isLoggedIn = window.Auth && window.Auth.isLoggedIn();
        const actionsHTML = isLoggedIn ? `
            <div class="post-actions">
                <button class="post-more-btn" onclick="event.stopPropagation(); this.parentElement.classList.toggle('active'); this.parentElement.querySelector('.post-actions-menu').classList.toggle('active')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r=".5"></circle>
                        <circle cx="12" cy="6" r=".5"></circle>
                        <circle cx="12" cy="18" r=".5"></circle>
                    </svg>
                </button>
                <div class="post-actions-menu">
                    <button class="post-action-btn edit-btn" onclick="event.stopPropagation(); app.editPost('${post.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m18 2 4 4-14 14H4v-4L18 2z"></path>
                        </svg>
                        수정
                    </button>
                    <button class="post-action-btn delete-btn" onclick="event.stopPropagation(); app.deletePost('${post.id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2,2v2"></path>
                        </svg>
                        삭제
                    </button>
                </div>
            </div>
        ` : '';

        if (hasThumbnail) {
            // 썸네일이 있는 경우: 이미지 카드
            const thumbnailUrl = convertGoogleDriveUrl(post.thumbnail);
            const fallbackUrls = getGoogleDriveFallbackUrls(post.thumbnail);
            
            return `
                <article class="post-card post-card-with-image ${isPrivate ? 'post-private' : ''}" data-post-id="${post.id}">
                    <div class="post-card-image">
                        <img src="${thumbnailUrl}" alt="${post.title}" loading="lazy" 
                             data-fallback-urls='${JSON.stringify(fallbackUrls)}'
                             data-current-index="0"
                             onerror="tryFallbackImage(this);">
                    </div>
                    ${actionsHTML}
                    <div class="post-card-overlay">
                        <div class="post-card-content">
                            <div class="post-card-meta">
                                <span class="post-date">${formatDate(post.date)}</span>
                                ${privateLabel}
                            </div>
                            
                            <h2 class="post-card-title">${post.title}</h2>
                            <p class="post-card-excerpt">${post.excerpt || '내용 미리보기가 없습니다.'}</p>
                            
                            <div class="post-card-tags">${tagsHTML}</div>
                        </div>
                    </div>
                </article>
            `;
        } else {
            // 썸네일이 없는 경우: 기본 카드
            return `
                <article class="post-card post-card-no-image ${isPrivate ? 'post-private' : ''}" data-post-id="${post.id}">
                    ${actionsHTML}
                    <div class="post-card-content">
                        <div class="post-card-meta">
                            <span class="post-date">${formatDate(post.date)}</span>
                            ${privateLabel}
                        </div>
                        <h2 class="post-card-title">${post.title}</h2>

                        <p class="post-card-excerpt">${post.excerpt || '내용 미리보기가 없습니다.'}</p>
                        
                        <div class="post-card-tags">${tagsHTML}</div>
                    </div>
                </article>
                `;
            }
        }

    renderPostGridCard(post) {
        const hasThumbnail = post.thumbnail && post.thumbnail.trim() !== '';
        const tags = Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : [];
        const tagsHTML = tags.map(tag =>
            `<a href="blog.html?tags=${encodeURIComponent(tag)}" class="post-tag" onclick="event.stopPropagation()">${tag}</a>`
        ).join('');

        const thumbnailUrl = hasThumbnail ? convertGoogleDriveUrl(post.thumbnail) : '';
        const fallbackUrls = hasThumbnail ? getGoogleDriveFallbackUrls(post.thumbnail) : [];

        return `
            <article class="post-grid-card ${!hasThumbnail ? 'no-image' : ''}" data-post-id="${post.id}">
                ${hasThumbnail ? `
                    <div class="post-grid-image">
                        <img src="${thumbnailUrl}" alt="${post.title}" loading="lazy"
                             data-fallback-urls='${JSON.stringify(fallbackUrls)}'
                             data-current-index="0"
                             onerror="tryFallbackImage(this);">
                        <div class="post-grid-image-overlay"></div>
                    </div>
                ` : ''}
                <div class="post-grid-content">
                    <div class="post-grid-meta">
                        <span class="post-grid-date">${formatDate(post.date)}</span>
                    </div>
                    <h2 class="post-grid-title">${post.title}</h2>
                    <p class="post-grid-excerpt">${post.excerpt || '내용 미리보기가 없습니다.'}</p>
                    <div class="post-grid-tags">${tagsHTML}</div>
                </div>
            </article>
        `;
    }

    renderPostSimpleItem(post) {
        return `
            <article class="post-simple-item" data-post-id="${post.id}">
                <span class="post-simple-date">${formatDate(post.date)}</span>
                <h2 class="post-simple-title">${post.title}</h2>
            </article>
        `;
    }

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(this.posts.length / this.postsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="page-btn" data-page="${this.currentPage - 1}">
                    ← 이전
                </button>
            `;
        }

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="1">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <button class="page-btn ${isActive ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-dots">...</span>`;
            }
            paginationHTML += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="page-btn" data-page="${this.currentPage + 1}">
                    다음 →
                </button>
            `;
        }

        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners
        paginationContainer.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('.page-btn');
            if (pageBtn) {
                const page = parseInt(pageBtn.dataset.page);
                this.goToPage(page);
            }
        });
    }

    /**
     * Go to specific page
     * @param {number} page - Page number
     */
    goToPage(page) {
        this.currentPage = page;
        this.renderPosts();
        this.renderPagination();
        scrollToElement('.posts', 100);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        const loadingSpinner = document.getElementById('loadingSpinner');
        const postsContainer = document.getElementById('postsContainer');
        
        if (loadingSpinner) loadingSpinner.style.display = 'flex';
        if (postsContainer) postsContainer.innerHTML = '';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        const loadingSpinner = document.getElementById('loadingSpinner');
        
        if (loadingSpinner) loadingSpinner.style.display = 'none';
    }

    /**
     * Show error state
     * @param {string} message - Error message
     */
    showError(message) {
        this.hideLoading();
        const errorMessage = document.getElementById('errorMessage');
        const postsContainer = document.getElementById('postsContainer');
        
        if (errorMessage) {
            errorMessage.innerHTML = `
                <h2>오류가 발생했습니다</h2>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">다시 시도</button>
            `;
            errorMessage.style.display = 'block';
        }
        
        if (postsContainer) postsContainer.innerHTML = '';
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;

        let message = '포스트가 없습니다.';
        
        if (this.selectedTags.length > 0 && this.searchQuery) {
            message = `"${this.selectedTags.join(', ')}" + "${this.searchQuery}" 조건의 포스트가 없습니다.`;
        } else if (this.selectedTags.length > 0) {
            message = `"${this.selectedTags.join(', ')}" 태그 조합의 포스트가 없습니다.`;
        } else if (this.searchQuery) {
            message = `"${this.searchQuery}" 검색 결과가 없습니다.`;
        }

        postsContainer.innerHTML = `
            <div class="empty-state">
                <h3>${message}</h3>
                <p>다른 검색어나 태그를 시도해보세요.</p>
                ${this.selectedTags.length > 0 ? 
                    '<button class="btn btn-secondary" onclick="app.clearFilters()">필터 초기화</button>' : 
                    '<a href="editor.html" class="btn btn-primary">첫 번째 포스트 작성하기</a>'
                }
            </div>
        `;
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.selectedTags = [];
        this.searchQuery = '';
        this.updateUrlState();
        
        // Re-filter and render
        this.filterPosts();
        this.renderPage();
    }

    /**
     * Update page title based on current filters
     */
    updatePageTitle() {
        let title = CONFIG.BLOG_TITLE;
        
        if (this.selectedTags.length > 0 && this.searchQuery) {
            title = `${this.searchQuery} | ${this.selectedTags.join(', ')} - ${CONFIG.BLOG_TITLE}`;
        } else if (this.selectedTags.length > 0) {
            title = `${this.selectedTags.join(', ')} - ${CONFIG.BLOG_TITLE}`;
        } else if (this.searchQuery) {
            title = `${this.searchQuery} - ${CONFIG.BLOG_TITLE}`;
        }
        
        document.title = title;
    }

    /**
     * Refresh posts data
     */
    async refreshPosts() {
        this.showLoading();
        
        try {
            await window.SheetsAPI.refreshPosts();
            await this.loadPosts();
            this.renderPage();
            showToast('포스트가 새로고침되었습니다', 'success');
        } catch (error) {
            console.error('❌ Refresh error:', error);
            this.showError('포스트를 새로고침하는데 실패했습니다.');
        }
    }

    /**
     * Edit post
     * @param {string} postId - Post ID to edit
     */
    editPost(postId) {
        // 인증 확인
        if (!window.Auth || !window.Auth.isLoggedIn()) {
            showToast('수정하려면 로그인이 필요합니다', 'error');
            return;
        }
        
        // 에디터 페이지로 이동 (수정 모드)
        window.location.href = `editor.html?edit=${encodeURIComponent(postId)}`;
    }

    /**
     * Delete post
     * @param {string} postId - Post ID to delete
     */
    async deletePost(postId) {
        // 인증 확인
        if (!window.Auth || !window.Auth.isLoggedIn()) {
            showToast('삭제하려면 로그인이 필요합니다', 'error');
            return;
        }
        
        const post = this.allPosts.find(p => p.id === postId || String(p.id) === String(postId));
        if (!post) {
            showToast('포스트를 찾을 수 없습니다', 'error');
            return;
        }
        
        // 확인 다이얼로그
        const confirmed = confirm(`"${post.title}" 포스트를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
        if (!confirmed) {
            return;
        }
        
        try {
            // 로딩 상태 표시
            showToast('포스트를 삭제하는 중...', 'info');
            
            // Google Sheets에서 삭제
            await window.SheetsAPI.deletePost(postId);
            
            // 로컬 데이터에서 제거
            this.allPosts = this.allPosts.filter(p => p.id !== postId && String(p.id) !== String(postId));
            this.filterPosts();
            this.renderPage();
            
            showToast('포스트가 삭제되었습니다', 'success');
            
        } catch (error) {
            console.error('❌ Delete error:', error);
            showToast('포스트 삭제에 실패했습니다', 'error');
        }
    }

    /**
     * Refresh post cards when login state changes
     */
    refreshPostCards() {
        // 로그인 상태가 변경되었으므로 필터를 다시 적용
        this.filterPosts();
        this.renderPosts();
    }

    /**
     * Show blog statistics (for debugging)
     */
    showStats() {
        const stats = window.SheetsAPI.getPostsStats(this.allPosts);
        console.table(stats);
        
        showToast(`총 ${stats.totalPosts}개 포스트, ${stats.totalTags}개 태그`, 'info');
    }
}

// Initialize blog app
let app = null;

document.addEventListener('DOMContentLoaded', () => {
    app = new BlogApp();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.BlogApp = BlogApp;
    window.app = app;
}

// Add some additional utility functions for the blog
function refreshBlog() {
    if (app) {
        app.refreshPosts();
    }
}

function refreshBlogCards() {
    if (app) {
        app.refreshPostCards();
    }
}

function clearBlogCache() {
    clearCache();
    if (app) {
        app.refreshPosts();
    }
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R: Refresh posts
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        refreshBlog();
    }
    
    // Escape: Clear filters
    if (e.key === 'Escape') {
        if (app && app.selectedTags.length > 0) {
            app.clearFilters();
        }
    }
});