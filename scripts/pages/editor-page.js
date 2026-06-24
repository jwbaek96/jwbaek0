// Rich Text Editor Implementation

// URL 마스킹 함수 (민감한 정보 보호)
function maskSensitiveUrl(url) {
    if (!url) return 'Not set';
    if (url.startsWith('/api/')) return url; // Vercel API는 안전
    if (url.includes('script.google.com')) {
        // Google Apps Script URL은 마스킹
        const parts = url.split('/');
        if (parts.length >= 6) {
            parts[5] = parts[5].substring(0, 8) + '...' + parts[5].substring(parts[5].length - 4);
        }
        return parts.join('/');
    }
    return url;
}

class RichTextEditor {
    constructor(editorId) {
        this.editor = document.getElementById(editorId);
        this.toolbar = document.querySelector('.editor-toolbar');
        this.isInitialized = false;
        this.isCodeView = false;
        this.originalContent = '';
        
        if (this.editor) {
            this.init();
        }
    }

    /**
     * Initialize the editor
     */
    init() {
        if (this.isInitialized) return;
        
        this.setupEditor();
        this.setupToolbar();
        this.setupKeyboardShortcuts();
        this.setupDragAndDrop();
        this.setupAutoSave();
        this.initializeHighlightButton();
        
        this.isInitialized = true;
        window.debugLog?.success('editor', 'Rich Text Editor initialized');
    }

    /**
     * Setup editor element
     */
    setupEditor() {
        // Enable contenteditable
        this.editor.contentEditable = true;
        
        // Set initial content if empty
        if (!this.editor.innerHTML.trim() || this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>' || this.editor.innerHTML === '<p>여기에 텍스트를 입력하세요...</p>') {
            this.editor.innerHTML = '<div><br></div>';
        }

        // Focus event
        this.editor.addEventListener('focus', () => {
            if (this.editor.innerHTML === '<p>여기에 내용을 작성하세요...</p>' || this.editor.innerHTML === '<p>여기에 텍스트를 입력하세요...</p>') {
                this.editor.innerHTML = '<div><br></div>';
            }
        });

        // Blur event - handle empty editor
        this.editor.addEventListener('blur', () => {
            if (this.editor.innerHTML.trim() === '') {
                this.editor.innerHTML = '<div><br></div>';
            }
        });

        // Paste event - clean pasted content
        this.editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        // Input event - update toolbar state
        this.editor.addEventListener('input', () => {
            this.updateToolbarState();
            this.saveToLocalStorage();
        });

        // Selection change event
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });

        // Initial focus with delay
        setTimeout(() => {
            if (this.editor) {
                this.editor.focus();
            }
        }, 100);

        // Initialize color inputs
        this.initializeColorInputs();
    }

    /**
     * Initialize color input elements
     */
    initializeColorInputs() {
        const textColorInput = document.getElementById('textColor');
        const bgColorInput = document.getElementById('bgColor');
        const textColorBar = document.getElementById('textColorBar');

        if (textColorInput) {
            textColorInput.value = '#000000';
        }
        
        if (bgColorInput) {
            bgColorInput.value = '#ffff00';
        }
        
        if (textColorBar) {
            textColorBar.style.backgroundColor = '#000000';
        }
    }

    /**
     * Setup toolbar buttons
     */
    setupToolbar() {
        if (!this.toolbar) return;

        // Text formatting buttons
        this.toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;

            e.preventDefault();
            this.editor.focus();

            const command = button.dataset.command;
            if (command) {
                this.executeCommand(command);
            }
        });

        // Heading select
        const headingSelect = document.getElementById('headingSelect');
        if (headingSelect) {
            headingSelect.addEventListener('change', (e) => {
                this.editor.focus();
                const value = e.target.value;
                
                if (value) {
                    this.executeCommand('formatBlock', `<${value}>`);
                } else {
                    this.executeCommand('formatBlock', '<div>');
                }
            });
        }

        // Color inputs
        const textColor = document.getElementById('textColor');
        const backgroundColor = document.getElementById('backgroundColor');

        if (textColor) {
            textColor.addEventListener('change', (e) => {
                this.editor.focus();
                this.executeCommand('foreColor', e.target.value);
            });
        }

        if (backgroundColor) {
            backgroundColor.addEventListener('change', (e) => {
                this.editor.focus();
                this.executeCommand('backColor', e.target.value);
            });
        }

        // Media upload buttons
        this.setupMediaUpload();

        // Other toolbar buttons
        this.setupToolbarActions();
    }

    /**
     * Setup media upload functionality
     */
    setupMediaUpload() {
        const imageUpload = document.getElementById('imageUpload');
        const videoUpload = document.getElementById('videoUpload');
        const imageUploadBtn = document.getElementById('imageUploadBtn');
        const videoUploadBtn = document.getElementById('videoUploadBtn');
        const linkBtn = document.getElementById('linkBtn');

        // Image upload
        if (imageUploadBtn && imageUpload) {
            imageUploadBtn.addEventListener('click', () => {
                imageUpload.click();
            });

            imageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImageUpload(file);
                }
                e.target.value = ''; // Reset input
            });
        }

        // Video upload
        if (videoUploadBtn && videoUpload) {
            videoUploadBtn.addEventListener('click', () => {
                videoUpload.click();
            });

            videoUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleVideoUpload(file);
                }
                e.target.value = ''; // Reset input
            });
        }

        // Link button
        if (linkBtn) {
            linkBtn.addEventListener('click', () => {
                this.insertLink();
            });
        }
    }

    /**
     * Setup other toolbar actions
     */
    setupToolbarActions() {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.executeCommand('undo');
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                this.executeCommand('redo');
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('모든 내용을 삭제하시겠습니까?')) {
                    this.editor.innerHTML = '<p><br></p>';
                    this.editor.focus();
                }
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        this.editor.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.executeCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.executeCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.executeCommand('underline');
                        break;
                    case 'z':
                        e.preventDefault();
                        this.executeCommand('undo');
                        break;
                    case 'y':
                        e.preventDefault();
                        this.executeCommand('redo');
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportHTML();
                        break;
                }
            }

            // Enter key - create new div instead of paragraph
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    
                    // 새로운 div 요소 생성
                    const newDiv = document.createElement('div');
                    newDiv.innerHTML = '<br>'; // 빈 줄을 위한 br 태그
                    
                    // 현재 위치에 새 div 삽입
                    range.deleteContents();
                    range.insertNode(newDiv);
                    
                    // 커서를 새 div 안의 br 뒤로 이동
                    const newRange = document.createRange();
                    newRange.setStartAfter(newDiv.querySelector('br'));
                    newRange.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                    
                    // 스크롤을 새로 생성된 위치로 이동
                    setTimeout(() => {
                        newDiv.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'nearest' 
                        });
                    }, 10);
                }
            }
        });
    }

    /**
     * Setup drag and drop
     */
    setupDragAndDrop() {
        if (window.UploadManager) {
            window.UploadManager.setupDragAndDrop(
                this.editor,
                (file) => this.handleImageUpload(file),
                (file) => this.handleVideoUpload(file)
            );
        }
    }

    /**
     * Setup auto-save to localStorage
     */
    setupAutoSave() {
        // 자동 저장만 설정 (초안 복원 기능 제거)
        
        // Save every 30 seconds
        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);
        
        // Save on page unload
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });
    }

    /**
     * Execute editor command
     * @param {string} command - Command name
     * @param {string} value - Command value
     */
    executeCommand(command, value = null) {
        try {
            document.execCommand(command, false, value);
            this.updateToolbarState();
        } catch (error) {
            console.error('Command execution error:', error);
        }
    }

    /**
     * Set content to editor
     * @param {string} content - HTML content to set
     */
    setContent(content) {
        if (this.editor && content) {
            this.editor.innerHTML = content;
            console.log('📝 Content set to editor');
        }
    }

    /**
     * Get content from editor
     * @returns {string} HTML content
     */
    getContent() {
        if (this.editor) {
            return this.editor.innerHTML;
        }
        return '';
    }

    /**
     * Format command wrapper (for backward compatibility)
     * @param {string} cmd - Command name
     * @param {string} value - Command value
     */
    format(cmd, value = null) {
        // 에디터에 포커스 보장
        this.editor.focus();
        
        // 서식 명령 실행 - execCommand는 기본적으로 현재 커서 위치의 서식을 변경함
        this.executeCommand(cmd, value);
        
        // 포커스 유지 (툴바 클릭으로 인한 포커스 손실 방지)
        setTimeout(() => {
            this.editor.focus();
        }, 10);
    }

    /**
     * Change text color
     * @param {string} color - Color value
     */
    changeTextColor(color) {
        this.format('foreColor', color);
        const textColorBar = document.getElementById('textColorBar');
        if (textColorBar) {
            textColorBar.style.backgroundColor = color;
        }
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
            this.moveCaretToEnd();
        }, 10);
    }

    /**
     * Change background color
     * @param {string} color - Color value
     */
    changeBgColor(color) {
        this.format('hiliteColor', color);
        // bgColorBar는 제거되었으므로 더 이상 업데이트하지 않음
        
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
            this.moveCaretToEnd();
        }, 10);
    }

    /**
     * Toggle highlight color picker
     */
    toggleHighlight() {
        // 현재 하이라이트 색상 가져오기 (기본값: 노란색)
        const currentColor = this.getCurrentHighlightColor() || '#ffff6b';
        
        // 현재 색상으로 하이라이트 적용
        this.format('hiliteColor', currentColor);
        
        // 색상 선택 팝업 토글
        const colorPicker = document.getElementById('highlightColors');
        const highlightBtn = document.querySelector('.highlight-btn');
        
        if (colorPicker && highlightBtn) {
            const isVisible = colorPicker.style.display !== 'none';
            
            if (isVisible) {
                colorPicker.style.display = 'none';
            } else {
                // 버튼의 위치를 계산하여 팝업 위치 설정
                const btnRect = highlightBtn.getBoundingClientRect();
                
                colorPicker.style.left = btnRect.left + 'px';
                colorPicker.style.top = (btnRect.bottom + 5) + 'px';
                colorPicker.style.display = 'flex';
                
                // 다른 곳 클릭시 닫기
                setTimeout(() => {
                    const closeHandler = (e) => {
                        if (!e.target.closest('.highlight-wrapper')) {
                            colorPicker.style.display = 'none';
                            document.removeEventListener('click', closeHandler);
                        }
                    };
                    document.addEventListener('click', closeHandler);
                }, 100);
            }
        }
        
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
        }, 10);
    }

    /**
     * Apply specific highlight color
     * @param {string} color - Color value
     */
    applyHighlight(color) {
        this.format('hiliteColor', color);
        
        // 하이라이트 버튼 색상 업데이트
        this.updateHighlightButtonColor(color);
        
        // 색상 선택 팝업 닫기
        const colorPicker = document.getElementById('highlightColors');
        if (colorPicker) {
            colorPicker.style.display = 'none';
        }
        
        // 에디터에 포커스를 다시 맞춤
        setTimeout(() => {
            this.editor.focus();
        }, 10);
    }

    /**
     * Update highlight button color
     * @param {string} color - Color value
     */
    updateHighlightButtonColor(color) {
        const colorDisplay = document.getElementById('highlightColorDisplay');
        if (colorDisplay) {
            colorDisplay.style.backgroundColor = color;
        }
        // 로컬 스토리지에 마지막 선택한 색상 저장
        localStorage.setItem('lastHighlightColor', color);
    }

    /**
     * Get current highlight color from localStorage
     * @returns {string} Current highlight color
     */
    getCurrentHighlightColor() {
        return localStorage.getItem('lastHighlightColor') || '#ffff6b';
    }

    /**
     * Initialize highlight button with saved color
     */
    initializeHighlightButton() {
        const savedColor = this.getCurrentHighlightColor();
        this.updateHighlightButtonColor(savedColor);
    }

    /**
     * Toggle HTML code view
     */
    toggleCodeView() {
        const codeButton = document.getElementById('codeViewToggle');
        const toolbar = document.querySelector('.simple-toolbar');
        
        if (!this.isCodeView) {
            // 텍스트 모드에서 HTML 코드 모드로 전환
            this.originalContent = this.editor.innerHTML;
            const htmlCode = this.formatHTML(this.originalContent);
            this.editor.innerHTML = `<pre class="code-block">${this.escapeHtml(htmlCode)}</pre>`;
            this.editor.contentEditable = false;
            
            // 버튼 상태 변경
            if (codeButton) {
                codeButton.style.backgroundColor = '#007bff';
                codeButton.style.color = 'white';
                codeButton.title = '텍스트 모드로 돌아가기';
            }
            
            // 다른 버튼들 비활성화
            if (toolbar) {
                const buttons = toolbar.querySelectorAll('button:not(#codeViewToggle), select');
                buttons.forEach(btn => btn.disabled = true);
            }
            
            this.isCodeView = true;
        } else {
            // HTML 코드 모드에서 텍스트 모드로 전환
            this.editor.innerHTML = this.originalContent;
            this.editor.contentEditable = true;
            this.editor.focus();
            
            // 버튼 상태 원래대로
            if (codeButton) {
                codeButton.style.backgroundColor = '';
                codeButton.style.color = '';
                codeButton.title = 'HTML 코드 보기';
            }
            
            // 다른 버튼들 활성화
            if (toolbar) {
                const buttons = toolbar.querySelectorAll('button:not(#codeViewToggle), select');
                buttons.forEach(btn => btn.disabled = false);
            }
            
            this.isCodeView = false;
        }
    }

    /**
     * Format HTML with proper indentation
     * @param {string} html - HTML content
     * @returns {string} Formatted HTML
     */
    formatHTML(html) {
        let formatted = html
            .replace(/></g, '>\n<')
            .replace(/\n\s*\n/g, '\n');
        
        let indent = 0;
        const lines = formatted.split('\n');
        const indentedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            
            if (trimmed.startsWith('</')) {
                indent--;
            }
            
            const indentedLine = '  '.repeat(Math.max(0, indent)) + trimmed;
            
            if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
                indent++;
            }
            
            return indentedLine;
        });
        
        return indentedLines.join('\n');
    }

    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Move caret to the end of the editor content
     */
    moveCaretToEnd() {
        try {
            this.editor.focus();
            
            const range = document.createRange();
            const sel = window.getSelection();
            
            // 에디터의 모든 내용을 순회하여 마지막 위치 찾기
            const walker = document.createTreeWalker(
                this.editor,
                NodeFilter.SHOW_ALL,
                null,
                false
            );
            
            let lastNode = null;
            let node;
            while (node = walker.nextNode()) {
                lastNode = node;
            }
            
            if (lastNode) {
                if (lastNode.nodeType === Node.TEXT_NODE) {
                    // 마지막이 텍스트 노드인 경우
                    range.setStart(lastNode, lastNode.textContent.length);
                    range.collapse(true);
                } else if (lastNode.nodeType === Node.ELEMENT_NODE) {
                    // 마지막이 요소 노드인 경우 (예: <br>, <div> 등)
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                }
                
                sel.removeAllRanges();
                sel.addRange(range);
                
                // 스크롤을 마지막 위치로 이동
                this.editor.scrollTop = this.editor.scrollHeight;
                
            } else {
                // 빈 에디터인 경우
                range.selectNodeContents(this.editor);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            
        } catch (error) {
            console.error('Caret positioning error:', error);
            // 폴백: 에디터 끝으로 이동
            try {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(this.editor);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
                this.editor.scrollTop = this.editor.scrollHeight;
            } catch (fallbackError) {
                console.error('Fallback caret positioning failed:', fallbackError);
                this.editor.focus();
            }
        }
    }

    /**
     * Update toolbar button states
     */
    updateToolbarState() {
        if (!this.toolbar) return;

        const commands = ['bold', 'italic', 'underline', 'strikeThrough'];
        
        commands.forEach(command => {
            const button = this.toolbar.querySelector(`[data-command="${command}"]`);
            if (button) {
                const isActive = document.queryCommandState(command);
                button.classList.toggle('active', isActive);
            }
        });

        // Update heading select
        const headingSelect = document.getElementById('headingSelect');
        if (headingSelect) {
            try {
                const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
                const value = formatBlock.replace('<', '').replace('>', '');
                headingSelect.value = ['h1', 'h2', 'h3'].includes(value) ? value : '';
            } catch (e) {
                headingSelect.value = '';
            }
        }
    }

    /**
     * Handle image upload
     * @param {File} file - Image file
     */
    handleImageUpload(file) {
        if (!window.UploadManager) {
            showToast('업로드 기능을 사용할 수 없습니다', 'error');
            return;
        }

        window.UploadManager.handleImageUpload(
            file,
            (imageUrl) => {
                this.insertImage(imageUrl);
            },
            (error) => {
                console.error('Image upload error:', error);
            }
        );
    }

    /**
     * Handle video upload
     * @param {File} file - Video file
     */
    handleVideoUpload(file) {
        if (!window.UploadManager) {
            showToast('업로드 기능을 사용할 수 없습니다', 'error');
            return;
        }

        window.UploadManager.handleVideoUpload(
            file,
            (videoUrl) => {
                this.insertVideo(videoUrl);
            },
            (error) => {
                console.error('Video upload error:', error);
            }
        );
    }

    /**
     * Insert image into editor
     * @param {string} imageUrl - Image URL
     */
    insertImage(imageUrl) {
        // Create DOM elements safely with CSS classes
        const wrapper = document.createElement('div');
        wrapper.className = 'media-wrapper';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '업로드된 이미지';
        img.loading = 'lazy';
        img.className = 'media-image';
        
        wrapper.appendChild(img);
        
        // Insert the wrapper element directly to avoid innerHTML issues
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(wrapper);
            
            // Move cursor after the inserted element
            range.setStartAfter(wrapper);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // Fallback: append to editor
            this.editor.appendChild(wrapper);
        }
        
        showToast('이미지가 삽입되었습니다', 'success');
    }

    /**
     * Insert video into editor
     * @param {string} videoUrl - Video URL
     */
    insertVideo(videoUrl) {
        // Extract Google Drive file ID from various URL formats
        let fileId = null;
        
        // Format 1: https://drive.google.com/uc?id=FILE_ID
        let fileIdMatch = videoUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
            fileId = fileIdMatch[1];
        }
        
        // Format 2: https://drive.google.com/file/d/FILE_ID/view
        if (!fileId) {
            fileIdMatch = videoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
                fileId = fileIdMatch[1];
            }
        }

        // Create HTML string with CSS classes - iframe for Google Drive, video for others
        let videoHTML;
        if (fileId) {
            // Google Drive video - use iframe preview mode (구글 드라이브는 iframe으로만 재생 가능)
            videoHTML = `<div class="media-wrapper"><iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="auto" class="media-video" frameborder="0" allowfullscreen></iframe></div>`;
        } else {
            // Non-Google Drive video URLs - use video tag
            videoHTML = `<div class="media-wrapper"><video controls class="media-video"><source src="${videoUrl}" type="video/mp4">브라우저에서 비디오를 지원하지 않습니다.</video></div>`;
        }

        // Insert using execCommand to ensure proper HTML
        this.executeCommand('insertHTML', videoHTML);

        showToast('동영상이 삽입되었습니다', 'success');
    }

    /**
     * Insert link
     */
    insertLink() {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        
        const url = prompt('링크 URL을 입력하세요:', 'https://');
        if (!url) return;

        const linkText = selectedText || prompt('링크 텍스트를 입력하세요:', url);
        if (!linkText) return;

        const link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        this.executeCommand('insertHTML', link);
    }

    /**
     * Get editor content as HTML
     * @param {boolean} minify - Whether to minify the HTML
     * @returns {string} HTML content
     */
    getHTML(minify = false) {
        // Get HTML without aggressive cleaning that removes quotes
        let html = this.editor.innerHTML;
        
        // Only do minimal cleaning to avoid breaking HTML attributes
        html = html.trim();
        
        // Only clean up obvious empty elements
        html = html.replace(/<(p|div)>\s*<\/(p|div)>/gi, '');
        html = html.replace(/<(p|div)>\s*<br\s*\/?>\s*<\/(p|div)>/gi, '');
        
        // Apply minification if requested
        if (minify) {
            html = this.minifyHTML(html);
        }
        
        return html;
    }

    /**
     * Minify HTML content
     * @param {string} html - HTML content to minify
     * @returns {string} Minified HTML content
     */
    minifyHTML(html) {
        if (!html) return '';
        
        let minified = html;
        
        // Remove HTML comments (but preserve conditional comments)
        minified = minified.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
        
        // Remove excessive whitespace between tags (but preserve content whitespace)
        minified = minified.replace(/>\s+</g, '><');
        
        // Remove leading/trailing whitespace in text nodes (but preserve single spaces)
        minified = minified.replace(/>\s+([^<\s])/g, '>$1');
        minified = minified.replace(/([^>\s])\s+</g, '$1<');
        
        // Remove multiple consecutive whitespace characters
        minified = minified.replace(/\s{2,}/g, ' ');
        
        // Only do basic attribute cleanup (safer approach)
        // Remove excessive whitespace but preserve attribute structure
        minified = minified.replace(/\s*=\s*/g, '=');
        
        // Only remove truly empty attributes (more careful regex)
        minified = minified.replace(/\s+(\w+)=""\s+/g, ' ');
        
        // Final cleanup
        minified = minified.trim();
        
        console.log('📦 HTML minified:', {
            originalSize: html.length,
            minifiedSize: minified.length,
            compression: `${((1 - minified.length / html.length) * 100).toFixed(1)}%`
        });
        
        return minified;
    }

    /**
     * Set editor content
     * @param {string} html - HTML content
     */
    setHTML(html) {
        this.editor.innerHTML = html;
    }

    /**
     * Get editor content as plain text
     * @returns {string} Plain text content
     */
    getText() {
        return this.editor.textContent || this.editor.innerText || '';
    }

    /**
     * Clear editor content
     */
    clear() {
        this.editor.innerHTML = '<div><br></div>';
        this.editor.focus();
    }

    /**
     * Export HTML
     */
    exportHTML() {
        const html = this.getHTML();
        const htmlOutput = document.getElementById('htmlOutput');
        const htmlCode = document.getElementById('htmlCode');

        if (htmlOutput && htmlCode) {
            htmlCode.value = html;
            htmlOutput.style.display = 'block';
            htmlCode.focus();
            htmlCode.select();
        }

        return html;
    }

    /**
     * Save content to localStorage
     */
    saveToLocalStorage() {
        try {
            const content = this.getHTML();
            const metadata = {
                title: document.getElementById('postTitle')?.value || '',
                author: document.getElementById('postAuthor')?.value || '',
                tags: window.tagsInput ? window.tagsInput.getTags() : [],
                content: content,
                timestamp: Date.now()
            };
            
            localStorage.setItem('editor_draft', JSON.stringify(metadata));
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }

    /**
     * Load content from localStorage (disabled - no auto restore)
     */
    loadFromLocalStorage() {
        // 초안 복원 기능 비활성화
        // 자동 저장은 계속 작동하지만 자동 복원은 하지 않음
        return;
    }

    /**
     * Clear saved draft
     */
    clearDraft() {
        localStorage.removeItem('editor_draft');
    }
}

// Initialize editor when DOM is ready
let editor = null;

document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
        editor = new RichTextEditor('editor');
        
        // Setup additional buttons
        setupEditorButtons();
        
        // Setup global functions for HTML compatibility
        setupGlobalFunctions();
        
        // 수정 모드 처리 - URL 파라미터 확인
        checkAndLoadEditMode();
    }
});

// 전역 변수: 현재 편집 중인 포스트 ID
let currentEditingPostId = null;

/**
 * 수정 모드인지 확인하고 기존 포스트 데이터 로드
 */
async function checkAndLoadEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editPostId = urlParams.get('edit');
    
    console.log('🔍 Checking edit mode. URL params:', Object.fromEntries(urlParams.entries()));
    
    if (editPostId) {
        window.debugLog?.editor('Edit mode detected for post ID:', editPostId);
        currentEditingPostId = editPostId; // 전역 변수에 저장
        
        // 에디터 초기화 대기
        let retries = 0;
        const maxRetries = 10;
        
        const waitForEditor = async () => {
            while (retries < maxRetries && !editor) {
                console.log(`⏳ Waiting for editor initialization... (${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (!editor) {
                console.error('❌ Editor not initialized after waiting');
                return false;
            }
            
            return true;
        };
        
        const editorReady = await waitForEditor();
        if (editorReady) {
            await loadPostForEditing(editPostId);
        } else {
            alert('에디터 초기화에 실패했습니다.');
        }
    } else {
        console.log('📝 New post mode');
        // 새 포스트 모드 - 업로드된 파일 목록 초기화
        if (typeof resetUploadedFiles === 'function') {
            resetUploadedFiles();
        }
    }
}

/**
 * 수정할 포스트 데이터 로드
 */
async function loadPostForEditing(postId) {
    try {
        console.log('📥 Loading post for editing:', postId);
        
        // 로딩 상태 표시
        showLoadingState();
        
        // SheetsAPI 존재 여부 확인
        if (!window.SheetsAPI) {
            throw new Error('SheetsAPI가 로드되지 않았습니다. sheets.js 파일을 확인하세요.');
        }
        
        // SheetsAPI를 통해 포스트 데이터 가져오기
        const posts = await window.SheetsAPI.fetchPosts();
        
        const post = posts.find(p => String(p.id) === String(postId));
        
        if (!post) {
            console.log('❌ Post not found. Available post IDs:', posts.map(p => p.id));
            throw new Error(`포스트를 찾을 수 없습니다. (ID: ${postId})`);
        }
        
        console.log('📄 Post data loaded:', post);
        
        // 폼 필드에 데이터 채우기
        populateFormFields(post);
        
        // 에디터에 내용 로드
        if (editor && post.content) {
            console.log('📝 Setting content to editor:', post.content.substring(0, 100) + '...');
            editor.setContent(post.content);
        } else {
            console.warn('⚠️ Editor not ready or no content:', {
                editorExists: !!editor,
                contentExists: !!post.content
            });
        }
        
        // 업로드된 파일 목록 로드
        if (typeof loadUploadedFiles === 'function') {
            loadUploadedFiles(post);
        } else {
            console.warn('⚠️ loadUploadedFiles function not available');
        }
        
        // 페이지 제목 변경
        document.title = `수정: ${post.title} - 리치 텍스트 에디터`;
        
        hideLoadingState();
        
    } catch (error) {
        console.error('❌ Error loading post for editing:', error);
        console.error('Error stack:', error.stack);
        hideLoadingState();
        alert('포스트를 불러오는데 실패했습니다: ' + error.message);
        
        // 에러 발생 시 블로그 페이지로 돌아가기
        // window.location.href = 'blog.html';
    }
}

/**
 * 폼 필드에 포스트 데이터 채우기
 */
function populateFormFields(post) {
    console.log('📝 Populating form fields with post data:', post);
    
    // 제목 (실제 HTML의 ID 사용)
    const titleInput = document.getElementById('postTitle');
    if (titleInput && post.title) {
        titleInput.value = post.title;
    } else {
        console.warn('⚠️ Title not set:', { inputExists: !!titleInput, titleValue: post.title });
    }
    
    // 썸네일 - 에디터에는 없을 수 있음
    const thumbnailInput = document.getElementById('thumbnail');
    if (thumbnailInput && post.thumbnail) {
        thumbnailInput.value = post.thumbnail;
    } else {
        console.log('ℹ️ Thumbnail field not found (normal for this editor)');
    }
    
    // 태그 - TagsInput 클래스 사용 (안전하게 처리)
    const setTags = () => {
        if (window.tagsInput && post.tags) {
            console.log('🏷️ 편집 모드 태그 설정 시작:', post.tags);
            
            // 태그가 문자열인 경우 배열로 변환
            let tagsArray = [];
            if (typeof post.tags === 'string') {
                tagsArray = post.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            } else if (Array.isArray(post.tags)) {
                tagsArray = post.tags.filter(tag => tag && tag.trim());
            }
            
            console.log('🏷️ 처리된 태그 배열:', tagsArray);
            
            // TagsInput에 태그 설정
            if (typeof window.tagsInput.setTags === 'function') {
                window.tagsInput.setTags(tagsArray);
            } else {
                // fallback: 직접 설정
                window.tagsInput.tags = tagsArray;
                if (typeof window.tagsInput.renderTags === 'function') {
                    window.tagsInput.renderTags();
                }
            }
        } else {
            console.log('ℹ️ 태그 설정 불가:', { 
                tagsInputExists: !!window.tagsInput, 
                tagsValue: post.tags,
                tagsType: typeof post.tags
            });
        }
    };
    
    // TagsInput이 아직 초기화되지 않은 경우 잠시 대기 후 재시도
    if (!window.tagsInput) {
        console.log('⏳ TagsInput 대기 중...');
        let retryCount = 0;
        const retrySetTags = () => {
            retryCount++;
            if (window.tagsInput) {
                setTags();
            } else if (retryCount < 10) {
                setTimeout(retrySetTags, 200);
            } else {
                console.error('❌ TagsInput 초기화 시간 초과');
            }
        };
        setTimeout(retrySetTags, 100);
    } else {
        setTags();
    }
    
    // 상태 - 에디터에는 없을 수 있음
    const statusSelect = document.getElementById('status');
    if (statusSelect && post.status) {
        statusSelect.value = post.status;
    }
}

/**
 * 로딩 상태 표시
 */
function showLoadingState() {
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
        editorContainer.style.opacity = '0.5';
        editorContainer.style.pointerEvents = 'none';
    }
    
    // 로딩 메시지 표시
    const loadingMessage = document.createElement('div');
    loadingMessage.id = 'loading-message';
    loadingMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        text-align: center;
    `;
    loadingMessage.innerHTML = `
        <div style="margin-bottom: 10px;">📥</div>
        <div>포스트 데이터를 불러오는 중...</div>
    `;
    document.body.appendChild(loadingMessage);
}

/**
 * 로딩 상태 숨기기
 */
function hideLoadingState() {
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
        editorContainer.style.opacity = '1';
        editorContainer.style.pointerEvents = 'auto';
    }
    
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

/**
 * Setup global functions for HTML inline script compatibility
 */
function setupGlobalFunctions() {
    // Make editor methods globally accessible for inline HTML scripts
    window.format = (cmd, value = null) => {
        if (editor) {
            editor.format(cmd, value);
        }
    };
    
    window.insertLink = () => {
        if (editor) {
            editor.insertLink();
        }
    };
    
    window.changeTextColor = (color) => {
        if (editor) {
            editor.changeTextColor(color);
        }
    };
    
    window.changeBgColor = (color) => {
        if (editor) {
            editor.changeBgColor(color);
        }
    };
    
    window.toggleHighlight = () => {
        if (editor) {
            editor.toggleHighlight();
        }
    };
    
    window.applyHighlight = (color) => {
        if (editor) {
            editor.applyHighlight(color);
        }
    };
    
    window.toggleCodeView = () => {
        if (editor) {
            editor.toggleCodeView();
        }
    };
}

/**
 * Setup additional editor buttons
 */
function setupEditorButtons() {
    // Export HTML button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (editor) {
                editor.exportHTML();
            }
        });
    }

    // Copy HTML button
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');
    if (copyHtmlBtn) {
        copyHtmlBtn.addEventListener('click', async () => {
            const htmlCode = document.getElementById('htmlCode');
            if (htmlCode) {
                const success = await copyToClipboard(htmlCode.value);
                if (success) {
                    showToast('HTML 코드가 클립보드에 복사되었습니다', 'success');
                } else {
                    showToast('클립보드 복사에 실패했습니다', 'error');
                }
            }
        });
    }

    /**
     * Convert HTML content to plain text for storage
     */
    function htmlToText(html) {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Get text content and clean up
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Remove extra whitespace and line breaks
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }
    
    /**
     * Create excerpt from HTML content
     */
    function createExcerpt(html, maxLength = 150) {
        const text = htmlToText(html);
        if (text.length <= maxLength) {
            return text;
        }
        
        // Find the last complete word within the limit
        const truncated = text.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }
    
    /**
     * Save post to Google Sheets
     */
    async function savePostToSheets() {
        console.log('📤 포스트 저장 시작...');
        
        if (!editor) {
            console.error('❌ 에디터가 초기화되지 않았습니다');
            showToast('에디터가 초기화되지 않았습니다', 'error');
            return;
        }
        
        // 필수 의존성 확인
        console.log('🔍 의존성 확인:', {
            editor: !!editor,
            SheetsAPI: !!window.SheetsAPI,
            CONFIG: !!window.CONFIG,
            APPS_SCRIPT_URL: window.CONFIG?.APPS_SCRIPT_URL
        });
        
        if (!window.SheetsAPI) {
            console.error('❌ SheetsAPI가 로드되지 않았습니다');
            showToast('SheetsAPI가 로드되지 않았습니다. 페이지를 새로고침해 주세요.', 'error');
            return;
        }
        
        // Get form data
        const title = document.getElementById('postTitle')?.value?.trim();
        const tags = window.tagsInput ? window.tagsInput.getTagsString() : '';
        // Get minified HTML content for storage
        const content = editor.getHTML(true); // Always minify
        const status = document.getElementById('statusSelect')?.value || 'published';
        // 로컬 시간 사용 (한국 사용자 기준)
        const getKSTTime = () => {
            // 사용자의 로컬 시간을 그대로 사용
            // 한국에 있는 사용자라면 로컬 시간이 곧 한국 시간
            return new Date();
        };
        
        // 로컬 시간을 YYYY-MM-DD HH:MM:SS 형식으로 변환 (UTC 아님)
        const kstTime = getKSTTime();
        const year = kstTime.getFullYear();
        const month = String(kstTime.getMonth() + 1).padStart(2, '0');
        const day = String(kstTime.getDate()).padStart(2, '0');
        const hours = String(kstTime.getHours()).padStart(2, '0');
        const minutes = String(kstTime.getMinutes()).padStart(2, '0');
        const seconds = String(kstTime.getSeconds()).padStart(2, '0');
        const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        

        
        // Validate required fields
        if (!title) {
            showToast('제목을 입력해주세요', 'error');
            document.getElementById('postTitle')?.focus();
            return;
        }
        
        if (!content || content === '<p></p>' || content === '<div><br></div>') {
            showToast('내용을 입력해주세요', 'error');
            return;
        }
        
        // Show loading state
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn?.textContent;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '저장 중...';
        }
        
        try {
            // 편집 모드인지 확인
            const isEditMode = !!currentEditingPostId;
            
            // 저장할 데이터 구조 (Google Sheets 컬럼 순서에 맞춤)
            // [id, title, date, thumbnail, content, tags, images, videos, status]
            const postData = {
                id: isEditMode ? currentEditingPostId : undefined, // 편집 모드면 기존 ID 사용
                title: title,
                author: CONFIG.BLOG_AUTHOR || 'Admin',  // 작성자 (사용 안함)
                date: currentDateTime,
                excerpt: createExcerpt(content),  // 요약 (사용 안함)
                content: content, 
                tags: tags,
                readTime: Math.max(1, Math.ceil(htmlToText(content).split(' ').length / 200)), // 읽는 시간 (사용 안함)
                thumbnail: getAutoThumbnail(), // 업로드된 첫 번째 미디어를 썸네일로 자동 설정
                images: getUploadedFilesByType('image'), // 업로드된 이미지 목록
                videos: getUploadedFilesByType('video'), // 업로드된 비디오 목록
                status: status
            };
            
            // 저장할 전체 요청 데이터 (수정 모드와 새 포스트 구분)
            const requestData = {
                action: isEditMode ? 'updatePost' : 'savePost',
                postData: postData
            };
            

            
            console.log('📊 저장할 포스트 데이터:', {
                isEditMode,
                postId: postData.id,
                title: postData.title,
                contentLength: postData.content?.length,
                tags: postData.tags,
                status: postData.status
            });
            
            // Send to Google Apps Script (수정 모드에 따라 다른 API 호출)
            let result;
            
            console.log('🚀 API 호출 시작:', isEditMode ? 'updatePost' : 'createPost');
            
            if (isEditMode) {
                result = await window.SheetsAPI.updatePost(postData);
            } else {
                // POST 방식으로 새 포스트 생성
                result = await window.SheetsAPI.createPost(postData);
            }
            
            if (result.success) {
                // 편집 모드였는지 확인하여 메시지 변경
                const successMessage = isEditMode ? 
                    `포스트가 성공적으로 수정되었습니다! (ID: ${result.postId})` : 
                    `포스트가 성공적으로 저장되었습니다! (ID: ${result.postId})`;
                
                showToast(successMessage, 'success', 5000);
                
                // Clear saved draft
                editor.clearDraft();
                
                // 편집 모드 해제
                if (isEditMode) {
                    currentEditingPostId = null;
                }
                
                // 저장 완료 후 2초 뒤에 뒤로가기
                setTimeout(() => {
                    // 편집 모드였다면 해당 포스트 페이지로, 아니면 뒤로가기
                    if (isEditMode && result.postId) {
                        window.location.href = `post.html?id=${result.postId}`;
                    } else if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.href = 'blog.html';
                    }
                }, 2000);
                
            } else {
                throw new Error(result.error || '저장에 실패했습니다');
            }
            
        } catch (error) {
            console.error('❌ Save error details:');
            console.error('- Error type:', error.constructor.name);
            console.error('- Error message:', error.message);
            console.error('- Error stack:', error.stack);
            console.error('- Current CONFIG:', window.CONFIG);
            
            let errorMessage = '저장에 실패했습니다';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage = '네트워크 연결을 확인해주세요. Google Apps Script에 접근할 수 없습니다.';
            } else if (error.message.includes('HTTP')) {
                errorMessage = `서버 오류: ${error.message}`;
                // HTTP 에러일 때 더 자세한 정보 표시
                if (error.message.includes('500')) {
                    errorMessage += '\n\n가능한 원인:\n1. Vercel 환경변수 설정 확인 필요\n2. Google Apps Script URL 확인 필요';
                }
            } else if (error.message.includes('Google Apps Script URL')) {
                errorMessage = 'Google Apps Script URL이 설정되지 않았습니다.';
            } else if (error.message.includes('V_GOOGLE_APPSCRIPT_URL not configured')) {
                errorMessage = 'Vercel 환경변수가 설정되지 않았습니다. V_GOOGLE_APPSCRIPT_URL을 확인하세요.';
            } else {
                errorMessage = `저장 실패: ${error.message}`;
            }
            
            showToast(errorMessage, 'error', 8000);
        } finally {
            // Reset button state
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    }

    // Save to Google Sheets button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            savePostToSheets();
        });
    }


}



/**
 * Get uploaded files by type
 */
function getUploadedFilesByType(fileType) {
    if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
        return '';
    }
    
    const filesOfType = window.uploadedFiles.filter(file => file.type === fileType);
    return JSON.stringify(filesOfType);
}

/**
 * Auto-select thumbnail from uploaded media
 * 업로드된 미디어 중 첫 번째를 썸네일로 자동 선택
 */
function getAutoThumbnail() {
    console.log('🖼️ 썸네일 자동 선택 시작...');
    
    if (!window.uploadedFiles || window.uploadedFiles.length === 0) {
        console.log('ℹ️ 업로드된 파일이 없음');
        return '';
    }
    
    // 이미지 우선, 그 다음 비디오
    const imageFiles = window.uploadedFiles.filter(file => file.type === 'image');
    if (imageFiles.length > 0) {
        return imageFiles[0].url; // 첫 번째 이미지
    }
    
    const videoFiles = window.uploadedFiles.filter(file => file.type === 'video');
    if (videoFiles.length > 0) {
        // 비디오의 경우 썸네일 URL이 있으면 사용, 없으면 비디오 URL 사용
        const thumbnailUrl = videoFiles[0].thumbnailUrl || videoFiles[0].url;
        return thumbnailUrl;
    }
    return '';
}

/**
 * Reset uploaded files list (call when creating new post)
 */
function resetUploadedFiles() {
    window.uploadedFiles = [];
}

/**
 * Load uploaded files from post data
 */
function loadUploadedFiles(postData) {
    try {
        window.uploadedFiles = [];
        
        if (postData.images && postData.images.trim()) {
            try {
                const images = JSON.parse(postData.images);
                if (Array.isArray(images)) {
                    window.uploadedFiles.push(...images);
                }
            } catch (e) {
                console.warn('⚠️ Failed to parse images JSON:', postData.images);
            }
        }
        
        if (postData.videos && postData.videos.trim()) {
            try {
                const videos = JSON.parse(postData.videos);
                if (Array.isArray(videos)) {
                    window.uploadedFiles.push(...videos);
                }
            } catch (e) {
                console.warn('⚠️ Failed to parse videos JSON:', postData.videos);
            }
        }
        
    } catch (error) {
        console.warn('❌ Failed to load uploaded files:', error);
        window.uploadedFiles = [];
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.RichTextEditor = RichTextEditor;
    window.editor = editor;
    window.getUploadedFilesByType = getUploadedFilesByType;
    window.getAutoThumbnail = getAutoThumbnail;
    window.resetUploadedFiles = resetUploadedFiles;
    window.loadUploadedFiles = loadUploadedFiles;
}