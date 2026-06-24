// Post detail page functionality

class PostApp {
    constructor() {
        this.post = null;
        this.allPosts = [];
        this.postId = null;
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Initialize the post app
     */
    async init() {
        // Get post ID from URL
        this.postId = getUrlParameter('id');
        
        if (!this.postId) {
            this.showError('포스트 ID가 없습니다.');
            return;
        }

                this.setupEventListeners();
        this.showLoading();
        
        try {
            await this.loadAllPosts();
            await this.loadPost();
            this.setupSocialSharing();
            this.loadRelatedPosts();
            this.setupNavigation();
        } catch (error) {
            console.error('❌ Post initialization error:', error);
            this.showError('포스트를 불러오는데 실패했습니다.');
        }
    }

    /**
     * Load all posts for navigation and related posts
     */
    async loadAllPosts() {
        try {
            this.allPosts = await window.SheetsAPI.fetchPosts();
        } catch (error) {
            console.error('❌ Error loading all posts:', error);
            // Continue even if we can't load all posts
        }
    }

    /**
     * Load specific post
     */
    async loadPost() {
        try {
            // Find post by ID (try both string and number comparison)
            this.post = this.allPosts.find(p => 
                String(p.id) === String(this.postId) || 
                parseInt(p.id) === parseInt(this.postId)
            );
            
            if (!this.post) {
                this.showError('포스트를 찾을 수 없습니다.');
                return;
            }

            this.renderPost();
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Error loading post:', error);
            this.showError('포스트를 불러오는데 실패했습니다.');
        }
    }

    /**
     * Render post content
     */
    renderPost() {
        if (!this.post) return;

        // Update page title and meta tags
        this.updatePageMeta();

        // Show post content
        document.getElementById('postContent').style.display = 'block';

        // Render post header
        this.renderPostHeader();

        // Render post content
        this.renderPostContent();
        

    }

    /**
     * Update page meta tags
     */
    updatePageMeta() {
        // Update title
        document.title = `${this.post.title} - JW.BAEK Blog`;

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.post.excerpt || this.post.title;
        }

        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDescription = document.querySelector('meta[property="og:description"]');
        const ogUrl = document.querySelector('meta[property="og:url"]');

        if (ogTitle) ogTitle.content = `${this.post.title} - JW.BAEK Blog`;
        if (ogDescription) ogDescription.content = this.post.excerpt || this.post.title;
        if (ogUrl) ogUrl.content = window.location.href;

        // Add og:image if post has thumbnail
        if (this.post.thumbnail) {
            let ogImage = document.querySelector('meta[property="og:image"]');
            if (!ogImage) {
                ogImage = document.createElement('meta');
                ogImage.setAttribute('property', 'og:image');
                document.head.appendChild(ogImage);
            }
            ogImage.content = this.post.thumbnail;
        }
    }

    /**
     * Render post header
     */
    renderPostHeader() {
        // Date
        const postDate = document.getElementById('postDate');
        if (postDate) {
            postDate.textContent = formatDate(this.post.date);
        }

        // Private label (비공개 포스트 표시)
        const postPrivateLabel = document.getElementById('postPrivateLabel');
        if (postPrivateLabel) {
            if (this.post.status === 'private') {
                postPrivateLabel.style.display = 'inline-flex';
            } else {
                postPrivateLabel.style.display = 'none';
            }
        }

        // Read time (estimate based on content length)
        // const postReadTime = document.getElementById('postReadTime');
        // if (postReadTime) {
        //     const readTime = this.estimateReadTime(this.post.content || this.post.excerpt);
        //     postReadTime.textContent = `${readTime}분 읽기`;
        // }

        // Title
        const postTitle = document.getElementById('postTitle');
        if (postTitle) {
            postTitle.textContent = this.post.title;
        }

        // Tags
        const postTags = document.getElementById('postTags');
        if (postTags && this.post.tags) {
            const tagsHTML = this.post.tags.map(tag => 
                `<a href="blog.html?tag=${encodeURIComponent(tag)}" class="post-tag">${tag}</a>`
            ).join('');
            postTags.innerHTML = tagsHTML;
        }
    }

    /**
     * Render post content
     */
    renderPostContent() {
        const contentBody = document.getElementById('postContentBody');
        if (contentBody) {
            const content = this.post.content || this.post.excerpt;
            
            // HTML 콘텐츠인지 확인 (HTML 태그가 포함되어 있는지)
            if (content && content.includes('<')) {
                // HTML 콘텐츠는 HTML 엔티티 디코딩 후 렌더링
                const decodedContent = this.decodeHtmlEntities(content);
                contentBody.innerHTML = decodedContent;
            } else {
                // 플레인 텍스트는 처리해서 렌더링
                const processedContent = this.processContent(content);
                contentBody.innerHTML = processedContent;
            }
        }
    }

    /**
     * Decode HTML entities and fix malformed attributes
     */
    decodeHtmlEntities(str) {
        if (!str) return '';
        
        // First, fix common malformed attribute patterns before DOM parsing
        let fixedStr = str;
        
        // Fix attributes without quotes first
        // Handle specific case: style=text-align: center;
        fixedStr = fixedStr.replace(
            /\s+style=text-align:\s*center;/g,
            ' style="text-align: center;"'
        );
        
        // Handle broader case: style=value (without quotes)
        fixedStr = fixedStr.replace(
            /\s+style=([^">\s][^>\s]*)/g,
            (match, styleValue) => {
                const cleanStyle = styleValue.endsWith(';') ? styleValue : styleValue + ';';
                return ` style="${cleanStyle}"`;
            }
        );
        
        // Fix other common unquoted attributes
        fixedStr = fixedStr.replace(
            /\s+(class|id|src|href|alt|title|width|height)=([^">\s][^>\s]*)/g,
            (match, attrName, attrValue) => {
                return ` ${attrName}="${attrValue}"`;
            }
        );
        
        // Fix malformed style attributes where colons get split
        fixedStr = fixedStr.replace(
            /style="([^"]*?):\s*"\s+([^=\s]+);?=""/g,
            (match, property, value) => {
                return `style="${property}: ${value};"`;
            }
        );
        
        // Fix the specific pattern: style="text-align:" center;=""
        fixedStr = fixedStr.replace(
            /style="([^"]*?):\s*"\s+([^=\s]+);=""/g,
            (match, property, value) => {
                return `style="${property}: ${value};"`;
            }
        );
        
        // Fix another variant: style="property:" value=""
        fixedStr = fixedStr.replace(
            /style="([^"]*?):\s*"\s+([^=\s]+)=""/g,
            (match, property, value) => {
                return `style="${property}: ${value};"`;
            }
        );
        
        // Fix malformed attributes like: style="value" other="" content="" more=""
        fixedStr = fixedStr.replace(
            /(\w+)="([^"]*?)"\s+([^=\s]+)=""/g,
            (match, attr, value, extra) => {
                // If extra looks like it should be part of the value, merge it
                if (extra.match(/^\d+px$|^\d+$|^auto$|^center$|^left$|^right$|^top$|^bottom$/)) {
                    return `${attr}="${value} ${extra}"`;
                }
                return `${attr}="${value}"`;
            }
        );
        
        // Fix broken CSS values in style attributes
        fixedStr = fixedStr.replace(
            /style="([^"]*?)"\s+([^=\s;:]+)=""/g,
            (match, styleValue, extra) => {
                // If extra looks like CSS value, append it
                if (extra.match(/^\d+px$|^\d+$|^auto$|^rgba\([^)]+\)$|^#[0-9a-fA-F]+$/)) {
                    return `style="${styleValue} ${extra}"`;
                }
                return `style="${styleValue}"`;
            }
        );
        
        // Fix broken filename attributes
        fixedStr = fixedStr.replace(
            /alt="([^"]*?)"\s+([^=\s]+)\.([^=\s]+)=""/g,
            (match, altValue, filename, ext) => {
                return `alt="${altValue} ${filename}.${ext}"`;
            }
        );
        
        // Final aggressive fix for the specific problematic pattern
        // Handle: style="text-align:" center;=""
        fixedStr = fixedStr.replace(
            /style="text-align:\s*"\s+center;=""/g,
            'style="text-align: center;"'
        );
        
        // Handle: style="text-align:" center=""
        fixedStr = fixedStr.replace(
            /style="text-align:\s*"\s+center=""/g,
            'style="text-align: center;"'
        );
        
        // Handle any remaining pattern with center
        fixedStr = fixedStr.replace(
            /style="([^"]*text-align[^"]*):"\s+center[^>]*>/g,
            'style="$1: center;">'
        );
        
        // Remove any remaining empty attributes
        fixedStr = fixedStr.replace(/\s+[^=\s]+=""/g, '');
        
        // Enhanced HTML entity decoding with better tag preservation
        let decodedStr = this.safeHtmlDecode(fixedStr);
        
        try {
            // Use DOM parsing to safely reconstruct HTML first
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = decodedStr;
            
            // Preserve important HTML elements and their attributes
            this.preserveHtmlElements(tempDiv);
            
            // Let the browser parse and reconstruct the HTML properly
            let reconstructedHTML = tempDiv.innerHTML;
            
            // Now convert legacy inline styles to CSS classes on the properly parsed HTML
            reconstructedHTML = this.convertInlineStylesToClasses(reconstructedHTML);
            
            return reconstructedHTML;
            
        } catch (error) {
            return decodedStr;
        }
    }

    /**
     * Safe HTML entity decoding that preserves HTML structure
     */
    safeHtmlDecode(str) {
        if (!str) return '';
        
        // Create a temporary element for safe decoding
        const tempElement = document.createElement('div');
        
        // Handle common HTML entities manually to avoid issues
        let decodedStr = str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/&hellip;/g, '...')
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&lsquo;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&amp;/g, '&'); // Process & last to avoid double decoding
        
        // Use textarea method as fallback for remaining entities
        try {
            tempElement.innerHTML = decodedStr;
            return tempElement.innerHTML;
        } catch (error) {
            return decodedStr;
        }
    }

    /**
     * Preserve important HTML elements and fix common issues
     */
    preserveHtmlElements(container) {
        // Fix broken p tags
        const brokenPTags = container.querySelectorAll('p[style*=""]');
        brokenPTags.forEach(p => {
            // Clean up malformed style attributes
            const style = p.getAttribute('style');
            if (style && style.includes('=""')) {
                p.removeAttribute('style');
            }
        });

        // Fix broken div tags with text-align issues
        const brokenDivs = container.querySelectorAll('div[style*="text-align"]');
        brokenDivs.forEach(div => {
            const style = div.getAttribute('style');
            if (style) {
                // Handle various malformed text-align patterns
                if (style.includes('text-align:')) {
                    // Extract valid text-align value
                    const match = style.match(/text-align:\s*(left|center|right|justify)/);
                    if (match) {
                        div.setAttribute('style', `text-align: ${match[1]};`);
                    } else if (style.includes('center')) {
                        div.setAttribute('style', 'text-align: center;');
                    }
                } else if (style.includes('text-align:')) {
                    // Handle malformed patterns like 'text-align:' without value
                    if (div.hasAttribute('center') || style.includes('center')) {
                        div.setAttribute('style', 'text-align: center;');
                        div.removeAttribute('center');
                    }
                }
            }
        });
        
        // Fix elements with malformed center attribute
        const centerElements = container.querySelectorAll('[center=""]');
        centerElements.forEach(element => {
            element.removeAttribute('center');
            const currentStyle = element.getAttribute('style') || '';
            if (!currentStyle.includes('text-align')) {
                element.setAttribute('style', currentStyle + ' text-align: center;');
            }
        });

        // Fix broken links
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            // Ensure links have proper href attributes
            if (!link.hasAttribute('href') || link.getAttribute('href') === '') {
                // If no href, remove the link but keep the content
                const textNode = document.createTextNode(link.textContent);
                link.parentNode.replaceChild(textNode, link);
            } else {
                // Add target="_blank" for external links
                const href = link.getAttribute('href');
                if (href.startsWith('http') && !href.includes(window.location.hostname)) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            }
        });

        // Fix code blocks and pre tags
        const codeBlocks = container.querySelectorAll('pre, code');
        codeBlocks.forEach(block => {
            // Remove malformed attributes but preserve class and id
            const attributes = [...block.attributes];
            attributes.forEach(attr => {
                if (!['class', 'id', 'style'].includes(attr.name)) {
                    if (attr.value === '' || attr.value === '""') {
                        block.removeAttribute(attr.name);
                    }
                }
            });
        });

        // Fix heading tags
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            // Clean up malformed style attributes
            const style = heading.getAttribute('style');
            if (style && style.includes('=""')) {
                heading.removeAttribute('style');
            }
        });

        // Fix list items
        const listItems = container.querySelectorAll('ul, ol, li');
        listItems.forEach(item => {
            // Remove empty attributes
            const attributes = [...item.attributes];
            attributes.forEach(attr => {
                if (attr.value === '' || attr.value === '""') {
                    item.removeAttribute(attr.name);
                }
            });
        });

        // Preserve iframe and video elements
        const mediaElements = container.querySelectorAll('iframe, video, img');
        mediaElements.forEach(element => {
            // Ensure media elements have proper attributes
            if (element.tagName === 'IFRAME') {
                if (!element.hasAttribute('frameborder')) {
                    element.setAttribute('frameborder', '0');
                }
                if (!element.hasAttribute('allowfullscreen') && element.src.includes('drive.google.com')) {
                    element.setAttribute('allowfullscreen', '');
                }
            }
        });

        // Fix broken br tags
        const brTags = container.querySelectorAll('br');
        brTags.forEach(br => {
            // Remove any malformed attributes from br tags
            const attributes = [...br.attributes];
            attributes.forEach(attr => {
                if (attr.name !== 'class' && attr.name !== 'id') {
                    br.removeAttribute(attr.name);
                }
            });
        });
    }

    /**
     * Convert legacy inline styles to CSS classes using DOM parsing
     */
    convertInlineStylesToClasses(html) {
        if (!html) return '';
        
        try {
            // Create a temporary container to parse HTML safely
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // Convert ALL divs with text-align: center to proper classes
            const textAlignDivs = tempDiv.querySelectorAll('div[style*="text-align"]');
            textAlignDivs.forEach(div => {
                const style = div.getAttribute('style') || '';
                if (style.includes('text-align') && style.includes('center')) {
                    // If it has media wrapper characteristics, use media-wrapper class
                    if (style.includes('margin') || div.querySelector('iframe, video, img')) {
                        div.className = div.className ? div.className + ' media-wrapper' : 'media-wrapper';
                    } else {
                        // Otherwise, use a general text-center class
                        div.className = div.className ? div.className + ' text-center' : 'text-center';
                    }
                    div.removeAttribute('style');
                }
            });
            
            // Convert images with media styling to media-image class
            const mediaImages = tempDiv.querySelectorAll('img[style*="max-width"]');
            mediaImages.forEach(img => {
                const style = img.getAttribute('style') || '';
                if (style.includes('max-width') && style.includes('border-radius')) {
                    img.className = img.className ? img.className + ' media-image' : 'media-image';
                    img.removeAttribute('style');
                }
            });
            
            // Convert videos with media styling to media-video class
            const mediaVideos = tempDiv.querySelectorAll('video[style*="max-width"], iframe[style*="max-width"]');
            mediaVideos.forEach(video => {
                const style = video.getAttribute('style') || '';
                if (style.includes('max-width') && (style.includes('border-radius') || video.tagName === 'IFRAME')) {
                    video.className = video.className ? video.className + ' media-video' : 'media-video';
                    video.removeAttribute('style');
                }
            });
            
            // Handle Google Drive iframes - convert to clickable thumbnails due to CSP restrictions
            const googleDriveIframes = tempDiv.querySelectorAll('iframe[src*="drive.google.com/file"]');
            googleDriveIframes.forEach(iframe => {
                const src = iframe.getAttribute('src');
                const fileIdMatch = src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                
                if (fileIdMatch) {
                    const fileId = fileIdMatch[1];
                    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                    
                    // Update iframe to use preview URL
                    iframe.src = embedUrl;
                    iframe.className = 'media-video';
                    
                    // Wrap in media wrapper
                    const wrapper = document.createElement('div');
                    wrapper.className = 'media-wrapper';
                    iframe.parentNode.insertBefore(wrapper, iframe);
                    wrapper.appendChild(iframe);
                }
            });
            
            // Convert code blocks with specific styling to code-block class
            const codeBlocks = tempDiv.querySelectorAll('pre[style*="padding"][style*="background"]');
            codeBlocks.forEach(pre => {
                const style = pre.getAttribute('style') || '';
                if (style.includes('padding') && style.includes('background') && style.includes('border-radius')) {
                    pre.className = pre.className ? pre.className + ' code-block' : 'code-block';
                    pre.removeAttribute('style');
                }
            });
            
            // Clean up any remaining malformed style attributes
            const elementsWithMalformedStyles = tempDiv.querySelectorAll('[style*=":"][style*=";"]:not([style*="::"])');
            elementsWithMalformedStyles.forEach(element => {
                const style = element.getAttribute('style') || '';
                // Check for malformed attributes like 'style="text-align:" center;=""'
                if (style.includes('":') || style.match(/[^:]+:\s*[^;]*;[^"]*=""/)) {
                    element.removeAttribute('style');
                }
            });
            
            const result = tempDiv.innerHTML;
            return result;
            
        } catch (error) {
            return html;
        }
    }

    /**
     * Process content text to HTML (플레인 텍스트용)
     */
    processContent(content) {
        if (!content) return '';

        // Simple text processing - convert line breaks to paragraphs
        return content
            .split('\n\n')
            .map(paragraph => paragraph.trim())
            .filter(paragraph => paragraph.length > 0)
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    /**
     * Estimate reading time
     */
    // estimateReadTime(content) {
    //     if (!content) return 1;
        
    //     const wordsPerMinute = 200; // Average reading speed
    //     const wordCount = content.split(/\s+/).length;
    //     const readTime = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
        
    //     return readTime;
    // }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Browser back/forward buttons
        window.addEventListener('popstate', () => {
            // If user navigates back, go to blog page
            window.location.href = 'blog.html';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape: Go back to blog
            if (e.key === 'Escape') {
                window.location.href = 'blog.html';
            }
            
            // Arrow keys for navigation
            if (e.key === 'ArrowLeft') {
                this.navigateToPrevious();
            } else if (e.key === 'ArrowRight') {
                this.navigateToNext();
            }
        });
    }

    /**
     * Setup social sharing
     */
    setupSocialSharing() {
        if (!this.post) return;

        const url = window.location.href;
        const title = this.post.title;
        const text = this.post.excerpt || this.post.title;

        // Twitter share
        const shareTwitter = document.getElementById('shareTwitter');
        if (shareTwitter) {
            shareTwitter.addEventListener('click', () => {
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
                window.open(twitterUrl, '_blank', 'width=600,height=400');
            });
        }

        // Facebook share
        const shareFacebook = document.getElementById('shareFacebook');
        if (shareFacebook) {
            shareFacebook.addEventListener('click', () => {
                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                window.open(facebookUrl, '_blank', 'width=600,height=400');
            });
        }

        // Copy URL
        const copyUrl = document.getElementById('copyUrl');
        if (copyUrl) {
            copyUrl.addEventListener('click', async (e) => {
                try {
                    await navigator.clipboard.writeText(url);
                    
                    // Show tooltip popup
                    const tooltip = copyUrl.querySelector('.copied-tooltip');
                    if (tooltip) {
                        tooltip.classList.add('show');
                        
                        // Hide tooltip after 2 seconds
                        setTimeout(() => {
                            tooltip.classList.remove('show');
                        }, 2000);
                    }
                    
                    // Optional: Also show toast (you can remove this if you prefer only the tooltip)
                    // showToast('링크가 복사되었습니다', 'success');
                } catch (error) {
                    console.error('Failed to copy URL:', error);
                    showToast('링크 복사에 실패했습니다', 'error');
                }
            });
        }
    }

    /**
     * Load related posts
     */
    loadRelatedPosts() {
        if (!this.post || !this.allPosts || this.allPosts.length <= 1) return;

        // Find posts with similar tags
        const relatedPosts = this.findRelatedPosts();
        
        if (relatedPosts.length > 0) {
            this.renderRelatedPosts(relatedPosts);
        }
    }

    /**
     * Find related posts based on tags
     */
    findRelatedPosts() {
        const currentTags = this.post.tags || [];
        let otherPosts = this.allPosts.filter(p => String(p.id) !== String(this.postId));
        
        // 비공개 포스트 필터링 (로그인하지 않은 경우)
        const isLoggedIn = window.Auth && window.Auth.isLoggedIn();
        if (!isLoggedIn) {
            otherPosts = otherPosts.filter(post => post.status !== 'private');
        }
        
        // Score posts based on common tags
        const scoredPosts = otherPosts.map(post => {
            const commonTags = currentTags.filter(tag => post.tags.includes(tag));
            return {
                post,
                score: commonTags.length
            };
        });

        // Sort by score and take top 3
        return scoredPosts
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(item => item.post);
    }

    /**
     * Render related posts
     */
    renderRelatedPosts(relatedPosts) {
        const relatedPostsSection = document.getElementById('relatedPosts');
        const relatedPostsGrid = document.getElementById('relatedPostsGrid');

        if (!relatedPostsSection || !relatedPostsGrid) return;

        const postsHTML = relatedPosts.map(post => `
            <article class="related-post-card" onclick="navigateToPost('${post.id}')">
                ${post.thumbnail ? `
                    <div class="related-post-thumbnail">
                        <img src="${post.thumbnail}" alt="${post.title}" loading="lazy">
                    </div>
                ` : ''}
                <div class="related-post-content">
                    <h3 class="related-post-title">${post.title}</h3>
                    <p class="related-post-excerpt">${post.excerpt}</p>
                    <div class="related-post-meta">
                        <span class="related-post-date">${formatDate(post.date)}</span>
                    </div>
                </div>
            </article>
        `).join('');

        relatedPostsGrid.innerHTML = postsHTML;
        relatedPostsSection.style.display = 'block';
    }

    /**
     * Setup navigation between posts
     */
    setupNavigation() {
        if (!this.allPosts || this.allPosts.length <= 1) return;

        // 비공개 포스트 필터링 (로그인하지 않은 경우)
        const isLoggedIn = window.Auth && window.Auth.isLoggedIn();
        let visiblePosts = this.allPosts;
        if (!isLoggedIn) {
            visiblePosts = this.allPosts.filter(post => post.status !== 'private');
        }

        const currentIndex = visiblePosts.findIndex(p => String(p.id) === String(this.postId));
        
        if (currentIndex === -1) return;

        // Previous post
        if (currentIndex < visiblePosts.length - 1) {
            const prevPost = visiblePosts[currentIndex + 1];
            this.setupNavigationLink('prevPost', prevPost);
        }

        // Next post
        if (currentIndex > 0) {
            const nextPost = visiblePosts[currentIndex - 1];
            this.setupNavigationLink('nextPost', nextPost);
        }
    }

    /**
     * Setup navigation link
     */
    setupNavigationLink(elementId, post) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const titleElement = element.querySelector('.nav-title');
        if (titleElement) {
            titleElement.textContent = post.title;
        }

        element.href = `post.html?id=${post.id}`;
        element.style.display = 'block';
    }

    /**
     * Navigate to previous post
     */
    navigateToPrevious() {
        const prevPost = document.getElementById('prevPost');
        if (prevPost && prevPost.style.display !== 'none') {
            window.location.href = prevPost.href;
        }
    }

    /**
     * Navigate to next post
     */
    navigateToNext() {
        const nextPost = document.getElementById('nextPost');
        if (nextPost && nextPost.style.display !== 'none') {
            window.location.href = nextPost.href;
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        const loadingState = document.getElementById('loadingState');
        const postContent = document.getElementById('postContent');
        const errorState = document.getElementById('errorState');
        
        if (loadingState) loadingState.style.display = 'flex';
        if (postContent) postContent.style.display = 'none';
        if (errorState) errorState.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        const loadingState = document.getElementById('loadingState');
        
        if (loadingState) loadingState.style.display = 'none';
    }

    /**
     * Show error state
     */
    showError(message) {
        this.hideLoading();
        const errorState = document.getElementById('errorState');
        const postContent = document.getElementById('postContent');
        
        if (errorState) {
            const errorContent = errorState.querySelector('.error-content p');
            if (errorContent) {
                errorContent.textContent = message;
            }
            errorState.style.display = 'flex';
        }
        
        if (postContent) postContent.style.display = 'none';
        
        // Update page title
        document.title = '포스트를 찾을 수 없습니다 - JW.BAEK Blog';
    }
}

// Global function for related post navigation
function navigateToPost(postId) {
    window.location.href = `post.html?id=${postId}`;
}

// Initialize post app
let postApp = null;

document.addEventListener('DOMContentLoaded', () => {
    postApp = new PostApp();
});

// Export for global use
if (typeof window !== 'undefined') {
    window.PostApp = PostApp;
    window.postApp = postApp;
}

// Add smooth scroll for back to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Admin Actions Functions
function toggleAdminActions(button) {
    const wrapper = button.closest('.admin-actions-wrapper');
    const isActive = wrapper.classList.contains('active');
    
    // Close all other menus
    document.querySelectorAll('.admin-actions-wrapper.active').forEach(w => {
        w.classList.remove('active');
    });
    
    // Toggle current menu
    if (!isActive) {
        wrapper.classList.add('active');
    }
}

function editCurrentPost() {
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        alert('수정하려면 로그인이 필요합니다.');
        return;
    }
    
    if (postApp && postApp.postId) {
        window.location.href = `editor.html?edit=${encodeURIComponent(postApp.postId)}`;
    } else {
        alert('포스트 정보를 찾을 수 없습니다.');
    }
}

async function deleteCurrentPost() {
    if (!window.Auth || !window.Auth.isLoggedIn()) {
        alert('삭제하려면 로그인이 필요합니다.');
        return;
    }
    
    if (!postApp || !postApp.post || !postApp.postId) {
        alert('포스트 정보를 찾을 수 없습니다.');
        return;
    }
    
    const confirmed = confirm(`"${postApp.post.title}" 포스트를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) {
        return;
    }
    
    try {
        // 삭제 중 표시
        const deleteBtn = document.querySelector('.admin-action-btn.delete-btn');
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span style="opacity: 0.6;">삭제 중...</span>';
        deleteBtn.disabled = true;
        
        // Google Sheets에서 삭제
        await window.SheetsAPI.deletePost(postApp.postId);
        
        alert('포스트가 삭제되었습니다.');
        
        // 블로그 페이지로 이동
        window.location.href = 'blog.html';
        
    } catch (error) {
        console.error('❌ Delete error:', error);
        alert('포스트 삭제에 실패했습니다.');
        
        // 버튼 상태 복원
        const deleteBtn = document.querySelector('.admin-action-btn.delete-btn');
        if (deleteBtn) {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }
}

// Close admin menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.admin-actions-wrapper')) {
        document.querySelectorAll('.admin-actions-wrapper.active').forEach(wrapper => {
            wrapper.classList.remove('active');
        });
    }
});

// Show admin actions if logged in
function checkAndShowAdminActions() {
    const adminActions = document.getElementById('postAdminActions');
    if (adminActions && window.Auth && window.Auth.isLoggedIn()) {
        adminActions.style.display = 'block';
    }
}

// Initialize admin actions after auth is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(checkAndShowAdminActions, 100);
    });
} else {
    setTimeout(checkAndShowAdminActions, 100);
}