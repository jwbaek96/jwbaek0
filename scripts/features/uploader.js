// Upload functionality for Google Drive integration

class UploadManager {
    constructor() {
        this.appsScriptUrl = CONFIG.UPLOAD_API_URL;
        this.maxFileSize = CONFIG.MAX_FILE_SIZE;
        this.allowedImageTypes = CONFIG.ALLOWED_IMAGE_TYPES;
        this.allowedVideoTypes = CONFIG.ALLOWED_VIDEO_TYPES;
        this.imageMaxWidth = CONFIG.IMAGE_MAX_WIDTH;
        this.imageQuality = CONFIG.IMAGE_QUALITY;
    }

    /**
     * Google Drive 인증 확인 및 자동 인증 시도
     * @returns {Promise<boolean>} 인증 성공 여부
     */
    async ensureGoogleDriveAuth() {
        try {
            // DriveUploader 초기화
            if (!window.driveUploader) {
                console.log('🚀 Initializing DriveUploader for file upload...');
                if (typeof initializeDriveUploader === 'function') {
                    await initializeDriveUploader();
                } else {
                    window.driveUploader = new DriveUploader();
                    await window.driveUploader.waitForInitialization();
                }
            }

            // 이미 인증된 경우
            if (window.driveUploader.isAuthenticated) {
                console.log('✅ Already authenticated');
                return true;
            }

            // 자동 인증 시도
            console.log('🔄 Attempting authentication for file upload...');
            
            const authResult = await window.driveUploader.authenticate(false);
            
            if (authResult && authResult.success) {
                console.log('✅ Authentication successful');
                return true;
            } else {
                throw new Error('Google Drive 인증에 실패했습니다');
            }

        } catch (error) {
            console.error('❌ Google Drive authentication failed:', error);
            showToast(`Google Drive 연결 실패: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Validate file before upload
     * @param {File} file - File to validate
     * @param {string} type - Expected file type ('image' or 'video')
     * @returns {boolean} Whether file is valid
     */
    validateFile(file, type = 'image') {
        try {
            // Check file size
            if (file.size > this.maxFileSize) {
                throw new Error(`파일 크기는 ${Math.round(this.maxFileSize / 1024 / 1024)}MB를 초과할 수 없습니다`);
            }

            // Check file type
            const allowedTypes = type === 'image' ? this.allowedImageTypes : this.allowedVideoTypes;
            if (!allowedTypes.includes(file.type)) {
                const typeNames = type === 'image' ? '이미지' : '동영상';
                throw new Error(`지원하지 않는 ${typeNames} 형식입니다`);
            }

            return true;
        } catch (error) {
            showToast(error.message, 'error');
            return false;
        }
    }

    /**
     * Resize image for optimization
     * @param {File} file - Image file to resize
     * @param {number} maxWidth - Maximum width
     * @param {number} quality - JPEG quality (0-1)
     * @returns {Promise<File>} Resized image file
     */
    async resizeImage(file, maxWidth = this.imageMaxWidth, quality = this.imageQuality) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const img = new Image();
                    
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // Calculate new dimensions
                            let { width, height } = img;
                            
                            if (width > maxWidth) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            }
                            
                            // Set canvas dimensions
                            canvas.width = width;
                            canvas.height = height;
                            
                            // Draw and compress image
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            canvas.toBlob(
                                (blob) => {
                                    if (blob) {
                                        resolve(new File([blob], file.name, { 
                                            type: 'image/jpeg',
                                            lastModified: Date.now()
                                        }));
                                    } else {
                                        reject(new Error('이미지 압축에 실패했습니다'));
                                    }
                                },
                                'image/jpeg',
                                quality
                            );
                        } catch (error) {
                            reject(error);
                        }
                    };
                    
                    img.onerror = () => reject(new Error('이미지 로드에 실패했습니다'));
                    img.src = e.target.result;
                };
                
                reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다'));
                reader.readAsDataURL(file);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Upload file to Google Drive via Apps Script
     * @param {File} file - File to upload
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<string>} Uploaded file URL
     */
    async uploadToGoogleDrive(file, onProgress = null) {
        try {
            if (!this.appsScriptUrl || this.appsScriptUrl.includes('YOUR_')) {
                throw new Error('Google Apps Script URL이 설정되지 않았습니다');
            }

            // Show progress
            if (onProgress) onProgress(0, '파일 준비 중...');

            // Convert file to base64
            const base64Data = await this.fileToBase64(file);
            
            if (onProgress) onProgress(30, '업로드 중...');

            // Send to Apps Script
            const response = await this.sendToAppsScript({
                file: {
                    data: base64Data,
                    mimeType: file.type,
                    name: file.name,
                    size: file.size
                }
            });

            if (onProgress) onProgress(90, '업로드 완료 중...');

            if (!response.success) {
                throw new Error(response.error || '업로드에 실패했습니다');
            }

            if (onProgress) onProgress(100, '완료!');

            console.log('✅ File uploaded successfully:', response.url);
            return response.url;

        } catch (error) {
            console.error('❌ Upload error:', error);
            throw error;
        }
    }

    /**
     * Convert file to base64
     * @param {File} file - File to convert
     * @returns {Promise<string>} Base64 string (without data URL prefix)
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                try {
                    // Remove data URL prefix (data:image/png;base64,)
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Send data to Apps Script
     * @param {Object} data - Data to send
     * @returns {Promise<Object>} Response from Apps Script
     */
    async sendToAppsScript(data) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('POST', this.appsScriptUrl);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('서버 응답을 파싱할 수 없습니다'));
                }
            };
            
            xhr.onerror = () => reject(new Error('네트워크 오류가 발생했습니다'));
            xhr.ontimeout = () => reject(new Error('업로드 시간이 초과되었습니다'));
            
            // Set timeout (30 seconds)
            xhr.timeout = 30000;
            
            xhr.send(JSON.stringify(data));
        });
    }

    /**
     * Handle image upload with UI feedback
     * @param {File} file - Image file
     * @param {Function} onSuccess - Success callback
     * @param {Function} onError - Error callback
     */
    async handleImageUpload(file, onSuccess, onError) {
        let progressElement = null;
        
        try {
            // Validate file
            if (!this.validateFile(file, 'image')) {
                return;
            }

            // Google Drive 인증 확인 및 자동 인증 시도
            if (!await this.ensureGoogleDriveAuth()) {
                return;
            }

            // Show progress
            progressElement = this.showUploadProgress('이미지 최적화 중...');

            // Resize image for optimization
            const resizedFile = await this.resizeImage(file);
            
            console.log(`📷 Image optimized: ${Math.round(file.size / 1024)}KB → ${Math.round(resizedFile.size / 1024)}KB`);

            // Upload to Google Drive
            const imageUrl = await this.uploadToGoogleDrive(resizedFile, (progress, status) => {
                this.updateProgress(progressElement, progress, status);
            });

            // Success
            this.hideUploadProgress(progressElement);
            showToast('이미지가 업로드되었습니다', 'success');
            
            if (onSuccess) onSuccess(imageUrl);

        } catch (error) {
            // Error
            if (progressElement) this.hideUploadProgress(progressElement);
            showToast(`이미지 업로드 실패: ${error.message}`, 'error');
            
            if (onError) onError(error);
        }
    }

    /**
     * Handle video upload with UI feedback
     * @param {File} file - Video file
     * @param {Function} onSuccess - Success callback
     * @param {Function} onError - Error callback
     */
    async handleVideoUpload(file, onSuccess, onError) {
        let progressElement = null;
        
        try {
            // Validate file
            if (!this.validateFile(file, 'video')) {
                return;
            }

            // Google Drive 인증 확인 및 자동 인증 시도
            if (!await this.ensureGoogleDriveAuth()) {
                return;
            }

            // Show progress
            progressElement = this.showUploadProgress('동영상 업로드 중...');

            // Upload to Google Drive
            const videoUrl = await this.uploadToGoogleDrive(file, (progress, status) => {
                this.updateProgress(progressElement, progress, status);
            });

            // Success
            this.hideUploadProgress(progressElement);
            showToast('동영상이 업로드되었습니다', 'success');
            
            if (onSuccess) onSuccess(videoUrl);

        } catch (error) {
            // Error
            if (progressElement) this.hideUploadProgress(progressElement);
            showToast(`동영상 업로드 실패: ${error.message}`, 'error');
            
            if (onError) onError(error);
        }
    }

    /**
     * Show upload progress UI
     * @param {string} message - Progress message
     * @returns {HTMLElement} Progress element
     */
    showUploadProgress(message) {
        let progressElement = document.getElementById('uploadProgress');
        
        if (!progressElement) {
            progressElement = document.createElement('div');
            progressElement.id = 'uploadProgress';
            progressElement.className = 'upload-progress';
            document.body.appendChild(progressElement);
        }

        progressElement.innerHTML = `
            <div class="progress-bar">
                <div class="progress-fill"></div>
            </div>
            <span id="progressText">${message}</span>
        `;
        
        progressElement.style.display = 'block';
        return progressElement;
    }

    /**
     * Update progress UI
     * @param {HTMLElement} progressElement - Progress element
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Progress message
     */
    updateProgress(progressElement, progress, message) {
        if (!progressElement) return;

        const progressFill = progressElement.querySelector('.progress-fill');
        const progressText = progressElement.querySelector('#progressText');

        if (progressFill) {
            if (progress > 0) {
                progressFill.style.width = `${progress}%`;
                progressFill.style.animation = 'none';
            }
        }

        if (progressText && message) {
            progressText.textContent = message;
        }
    }

    /**
     * Hide upload progress UI
     * @param {HTMLElement} progressElement - Progress element
     */
    hideUploadProgress(progressElement) {
        if (progressElement) {
            setTimeout(() => {
                progressElement.style.display = 'none';
            }, 1000);
        }
    }

    /**
     * Setup drag and drop for an element
     * @param {HTMLElement} element - Element to enable drag and drop
     * @param {Function} onImageDrop - Image drop callback
     * @param {Function} onVideoDrop - Video drop callback
     */
    setupDragAndDrop(element, onImageDrop, onVideoDrop) {
        if (!element) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        element.addEventListener('dragover', () => {
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', () => {
            element.classList.remove('drag-over');
        });

        element.addEventListener('drop', (e) => {
            element.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                
                if (this.allowedImageTypes.includes(file.type)) {
                    if (onImageDrop) onImageDrop(file);
                } else if (this.allowedVideoTypes.includes(file.type)) {
                    if (onVideoDrop) onVideoDrop(file);
                } else {
                    showToast('지원하지 않는 파일 형식입니다', 'error');
                }
            }
        });
    }
}

// Create global instance
const uploadManager = new UploadManager();

// Export for use in other files
if (typeof window !== 'undefined') {
    window.UploadManager = uploadManager;
}