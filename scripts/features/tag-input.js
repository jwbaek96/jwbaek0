/**
 * 간단한 TagsInput 클래스 - 원래 잘 작동하던 버전
 */
class TagsInput {
    constructor() {
        this.tags = [];
        this.tagInput = document.getElementById('tagInput');
        this.tagsWrapper = document.getElementById('tagsWrapper');
        
        this.init();
    }
    
    init() {
        if (!this.tagInput || !this.tagsWrapper) {
            console.error('TagInput 요소를 찾을 수 없습니다');
            return;
        }
        
        window.debugLog?.success('tags', 'TagsInput 초기화 완료');
        
        this.tagInput.addEventListener('keydown', (e) => {
            if (e.key === ',' || e.key === 'Enter') {
                e.preventDefault();
                this.addTag();
            } else if (e.key === 'Backspace' && this.tagInput.value === '') {
                this.removeLastTag();
            }
        });
        
        this.tagInput.addEventListener('blur', () => {
            if (this.tagInput.value.trim()) {
                this.addTag();
            }
        });
    }
    
    addTag(tagText) {
        const value = tagText || this.tagInput.value.trim();
        if (value && !this.tags.includes(value)) {
            this.tags.push(value);
            this.renderTags();
            this.tagInput.value = '';
            window.debugLog?.tags('태그 추가됨:', value, '현재 태그:', this.tags);
        }
    }
    
    removeTag(tagToRemove) {
        this.tags = this.tags.filter(tag => tag !== tagToRemove);
        this.renderTags();
        window.debugLog?.tags('태그 제거됨:', tagToRemove, '현재 태그:', this.tags);
    }
    
    removeLastTag() {
        if (this.tags.length > 0) {
            const removed = this.tags.pop();
            this.renderTags();
            window.debugLog?.tags('마지막 태그 제거됨:', removed, '현재 태그:', this.tags);
        }
    }
    
    renderTags() {
        if (!this.tagsWrapper) {
            console.error('❌ tagsWrapper가 없습니다');
            return;
        }
        
        // 기존 태그들 제거 (input 제외)
        const existingTags = this.tagsWrapper.querySelectorAll('.tag');
        existingTags.forEach(tag => tag.remove());
        
        // 새 태그들 추가
        this.tags.forEach(tagText => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.innerHTML = `
                <span>${tagText}</span>
                <button type="button" class="tag-remove" onclick="window.tagsInput.removeTag('${tagText}')">&times;</button>
            `;
            
            // input 앞에 삽입
            this.tagsWrapper.insertBefore(tagElement, this.tagInput);
        });
        
        window.debugLog?.tags('태그 렌더링 완료:', this.tags.length, '개');
    }
    
    getTags() {
        return this.tags;
    }
    
    setTags(tags) {
        window.debugLog?.tags('setTags 호출됨:', tags);
        this.tags = Array.isArray(tags) ? [...tags] : [];
        this.renderTags();
        window.debugLog?.success('tags', '태그 설정 완료:', this.tags);
    }
    
    clearTags() {
        window.debugLog?.tags('clearTags 호출됨');
        this.tags = [];
        this.renderTags();
        window.debugLog?.success('tags', '태그 초기화 완료');
    }
    
    getTagsString() {
        return this.tags.join(', ');
    }
}

// 전역 변수 초기화
let tagsInput;

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.debugLog?.log('tags', 'TagsInput 초기화 시작...');
    
    // 이미 초기화되었다면 다시 초기화하지 않음
    if (window.tagsInput) {
        window.debugLog?.warn('tags', 'TagsInput이 이미 초기화되어 있습니다');
        return;
    }
    
    tagsInput = new TagsInput();
    window.tagsInput = tagsInput;
    window.debugLog?.success('tags', 'TagsInput 전역 설정 완료');
    
    // 편집 모드 확인 및 태그 로드를 위한 대기
    setTimeout(() => {
        if (window.currentEditingPostId) {
            window.debugLog?.log('tags', '편집 모드 감지됨, 태그 로드 대기 중...');
        }
    }, 1000);
});