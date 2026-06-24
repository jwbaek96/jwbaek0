// Google Drive Uploader for Blog Media (Google Identity Services)
// Handles file uploads to Google Drive with organized folder structure

class DriveUploader {
    constructor() {
        this.isInitialized = false;
        this.isAuthenticated = false;
        this.accessToken = null;
        this.rootFolderId = null;
        this.apiKey = null;
        this.clientId = null;
        this.tokenClient = null;
        
        // 자동 로그인을 위한 저장소 키
        this.STORAGE_KEY = 'blog_google_auth';
        
        // Config 값들을 초기화 시점에 설정
        this.updateConfigValues();
        
        console.log('📦 DriveUploader instance created');
    }
    
    /**
     * Update config values from CONFIG object
     */
    updateConfigValues() {
        this.rootFolderId = CONFIG.GOOGLE_DRIVE_FOLDER_ID;
        this.apiKey = CONFIG.GOOGLE_DRIVE_API_KEY;
        this.clientId = CONFIG.GOOGLE_CLIENT_ID;
        
        console.log('🔧 DriveUploader config values:', {
            rootFolderId: this.rootFolderId ? '✅' : '❌',
            apiKey: this.apiKey ? '✅' : '❌',
            clientId: this.clientId ? '✅' : '❌'
        });
    }

    /**
     * Initialize Google Drive API with Google Identity Services
     */
    async init() {
        try {
            console.log('🚀 Initializing Google Drive API with GIS...');
            
            // 필수 설정 값 체크
            this.updateConfigValues();
            if (!this.clientId || !this.apiKey) {
                console.warn('⏳ Waiting for config to load...');
                console.log('Missing values:', {
                    clientId: !!this.clientId,
                    apiKey: !!this.apiKey
                });
                // 설정이 로드될 때까지 대기
                return;
            }
            
            // Wait for APIs to load
            await this.waitForApis();
            
            // Initialize Google API client (without auth)
            await new Promise((resolve, reject) => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
                            apiKey: this.apiKey,
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
                        });
                        
                        console.log('✅ Google API client initialized');
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
            
            // Initialize Google Identity Services token client
            this.tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: this.clientId,
                scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
                callback: (tokenResponse) => {
                    if (tokenResponse.error) {
                        console.error('❌ Authentication error:', tokenResponse.error);
                        return;
                    }
                    this.accessToken = tokenResponse.access_token;
                    this.isAuthenticated = true;
                    console.log('✅ Authentication successful with GIS');
                    
                    // 토큰 정보를 localStorage에 저장 (보안상 access_token은 저장하지 않음)
                    this.saveAuthState(tokenResponse);
                    
                    // 사용자 정보도 가져와서 저장 (힌트용)
                    this.saveUserInfo();
                    
                    // 인증 성공 시 이벤트 발생
                    if (this.onAuthSuccess) {
                        this.onAuthSuccess();
                    }
                },
            });
            
            this.isInitialized = true;
            console.log('✅ Google Drive API with GIS initialized successfully');
            
            // 자동 로그인 시도
            await this.tryAutoLogin();
            
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive API:', error);
            throw error;
        }
    }

    /**
     * Wait for Google APIs to load
     */
    waitForApis() {
        return new Promise((resolve) => {
            let gapiReady = false;
            let gisReady = false;
            
            // Check for gapi
            if (typeof gapi !== 'undefined') {
                gapiReady = true;
            } else {
                const checkGapi = setInterval(() => {
                    if (typeof gapi !== 'undefined') {
                        clearInterval(checkGapi);
                        gapiReady = true;
                        if (gisReady) resolve();
                    }
                }, 100);
            }
            
            // Check for Google Identity Services
            if (typeof google !== 'undefined' && google.accounts) {
                gisReady = true;
            } else {
                const checkGis = setInterval(() => {
                    if (typeof google !== 'undefined' && google.accounts) {
                        clearInterval(checkGis);
                        gisReady = true;
                        if (gapiReady) resolve();
                    }
                }, 100);
            }
            
            // If both are ready, resolve immediately
            if (gapiReady && gisReady) {
                resolve();
            }
        });
    }

    /**
     * Authenticate user with Google Drive using GIS
     * @param {boolean} immediate - Whether to attempt immediate authentication without popup
     */
    async authenticate(immediate = false) {
        // Wait for initialization if not completed
        if (!this.isInitialized) {
            console.log('⏳ Waiting for API initialization...');
            await this.waitForInitialization();
        }

        try {
            console.log('🔐 Authenticating with Google Drive using GIS...');
            
            return new Promise((resolve, reject) => {
                // Store original callback
                const originalCallback = this.tokenClient.callback;
                
                // Set callback for this authentication attempt
                this.tokenClient.callback = (tokenResponse) => {
                    // Restore original callback
                    this.tokenClient.callback = originalCallback;
                    
                    if (tokenResponse.error) {
                        reject(new Error(tokenResponse.error));
                        return;
                    }
                    
                    this.accessToken = tokenResponse.access_token;
                    this.isAuthenticated = true;
                    
                    // 인증 상태 저장
                    this.saveAuthState(tokenResponse);
                    
                    // 사용자 정보 저장 (힌트용)
                    this.saveUserInfo();
                    
                    console.log('✅ Authentication successful');
                    resolve({ success: true });
                };
                
                // Request access token
                if (immediate) {
                    // Try silent authentication first (might not work for first time)
                    this.tokenClient.requestAccessToken({ prompt: '' });
                } else {
                    this.tokenClient.requestAccessToken({ prompt: 'select_account' });
                }
            });
            
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Pre-authenticate (call this early, before user interactions)
     */
    async preAuthenticate() {
        if (this.isAuthenticated) {
            return { success: true };
        }
        
        console.log('🔐 Pre-authenticating for Google Drive access...');
        return this.authenticate();
    }

    /**
     * Wait for API initialization to complete
     */
    async waitForInitialization() {
        return new Promise((resolve) => {
            const checkInit = setInterval(() => {
                if (this.isInitialized) {
                    clearInterval(checkInit);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Upload file to Google Drive
     * @param {File} file - File to upload
     * @param {string|number} postId - Post ID for organization
     * @param {string} type - File type (image/video/thumbnail)
     * @returns {Promise<string>} Public URL of uploaded file
     */
    async uploadFile(file, postId = null, type = 'image') {
        // Check authentication status
        if (!this.isAuthenticated) {
            throw new Error('인증이 필요합니다. 먼저 Google Drive 연결을 승인해주세요.');
        }

        try {
            console.log(`📤 Uploading ${type}:`, file.name);
            
            // Validate file
            this.validateFile(file, type);
            
            // Get or create target folder
            const folderId = await this.getTargetFolder(type);
            
            // Generate filename
            const filename = this.generateFilename(file, postId || Date.now(), type);
            
            // Upload file
            const fileId = await this.uploadToFolder(file, filename, folderId);
            
            // Make file public and get URL
            await this.makeFilePublic(fileId);
            const publicUrl = this.getPublicUrl(fileId);
            
            console.log(`✅ Upload successful: ${filename}`);
            console.log(`🔗 Public URL: ${publicUrl}`);
            
            return publicUrl;
            
        } catch (error) {
            console.error('❌ Upload failed:', error);
            throw error;
        }
    }

    /**
     * Validate file before upload
     */
    validateFile(file, type) {
        const maxSize = type === 'video' ? CONFIG.MAX_VIDEO_SIZE : CONFIG.MAX_IMAGE_SIZE;
        const allowedTypes = type === 'video' ? CONFIG.ALLOWED_VIDEO_TYPES : CONFIG.ALLOWED_IMAGE_TYPES;
        
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
        }
    }

    /**
     * Get or create target folder for upload
     */
    async getTargetFolder(type) {
        try {
            if (type === 'thumbnail') {
                return await this.getOrCreateFolder(CONFIG.DRIVE_FOLDER_STRUCTURE.THUMBNAIL_FOLDER, this.rootFolderId);
            }
            
            if (CONFIG.DRIVE_FOLDER_STRUCTURE.USE_DATE_FOLDERS) {
                const now = new Date();
                const year = now.getFullYear().toString();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                
                const yearFolderId = await this.getOrCreateFolder(year, this.rootFolderId);
                const monthFolderId = await this.getOrCreateFolder(month, yearFolderId);
                
                return monthFolderId;
            }
            
            return this.rootFolderId;
            
        } catch (error) {
            console.error('❌ Failed to get target folder:', error);
            throw error;
        }
    }

    /**
     * Get existing folder or create new one
     */
    async getOrCreateFolder(folderName, parentId) {
        try {
            // Search for existing folder
            const response = await gapi.client.drive.files.list({
                q: `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)'
            });
            
            if (response.result.files.length > 0) {
                return response.result.files[0].id;
            }
            
            // Create new folder
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                },
                fields: 'id'
            });
            
            console.log(`📁 Created folder: ${folderName}`);
            return createResponse.result.id;
            
        } catch (error) {
            console.error('❌ Failed to get/create folder:', error);
            throw error;
        }
    }

    /**
     * Generate filename for uploaded file
     */
    generateFilename(file, postId, type) {
        const timestamp = Date.now();
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (type === 'thumbnail') {
            return `post_${postId}_thumb_${timestamp}.${extension}`;
        }
        
        const typePrefix = type === 'video' ? 'video' : 'image';
        return `post_${postId}_${typePrefix}_${timestamp}.${extension}`;
    }

    /**
     * Upload file to specific folder
     */
    async uploadToFolder(file, filename, folderId) {
        const metadata = {
            name: filename,
            parents: [folderId]
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
        form.append('file', file);
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: form
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ File uploaded:', result);
        return result.id;
    }

    /**
     * Make file publicly accessible using fetch API
     */
    async makeFilePublic(fileId) {
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'role': 'reader',
                    'type': 'anyone'
                })
            });
            
            if (response.ok) {
                console.log('✅ File made public successfully');
            } else {
                console.warn('⚠️ Failed to make file public:', response.statusText);
            }
        } catch (error) {
            console.warn('⚠️ Failed to make file public:', error);
            // Continue anyway - file might still be accessible
        }
    }

    /**
     * Get public URL for file
     */
    getPublicUrl(fileId) {
        return `https://drive.google.com/uc?id=${fileId}`;
    }

    /**
     * Check if user is authenticated
     */
    isUserAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * 인증 상태를 localStorage에 저장
     */
    saveAuthState(tokenResponse) {
        try {
            const authState = {
                timestamp: Date.now(),
                expires_in: tokenResponse.expires_in || 3600,
                // access_token은 보안상 저장하지 않음
                authenticated: true
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authState));
            console.log('💾 Auth state saved to localStorage:', {
                key: this.STORAGE_KEY,
                expires_in: authState.expires_in,
                timestamp: new Date(authState.timestamp).toLocaleString()
            });
        } catch (error) {
            console.warn('⚠️ Failed to save auth state:', error);
        }
    }

    /**
     * 저장된 인증 상태 확인 및 자동 로그인 시도
     */
    async tryAutoLogin() {
        console.log('🚀 tryAutoLogin() called');
        try {
            console.log('🔍 Checking for saved auth state with key:', this.STORAGE_KEY);
            const savedAuth = localStorage.getItem(this.STORAGE_KEY);
            
            if (!savedAuth) {
                console.log('📭 No saved auth state found - localStorage keys:', Object.keys(localStorage));
                return false;
            }

            const authState = JSON.parse(savedAuth);
            const now = Date.now();
            const expiryTime = authState.timestamp + (authState.expires_in * 1000);

            console.log('⏰ Auth state check:', {
                saved: new Date(authState.timestamp).toLocaleString(),
                expires: new Date(expiryTime).toLocaleString(),
                now: new Date(now).toLocaleString(),
                isExpired: now > (expiryTime - 30 * 60 * 1000)
            });

            // 토큰이 만료되었는지 확인 (30분 버퍼 적용)
            if (now > (expiryTime - 30 * 60 * 1000)) {
                console.log('⏰ Saved auth state expired, clearing...');
                localStorage.removeItem(this.STORAGE_KEY);
                return false;
            }

            console.log('� Valid auth state found - marking as requires reconnection');
            
            // Silent authentication은 브라우저 팝업 차단으로 인해 실패하므로
            // 대신 "재연결 필요" 상태로 표시
            return 'reconnect_needed';

        } catch (error) {
            console.warn('⚠️ Auto login failed:', error);
            localStorage.removeItem(this.STORAGE_KEY);
            return false;
        }
    }

    /**
     * 사용자 정보 저장 (자동 로그인용 힌트)
     */
    async saveUserInfo() {
        try {
            if (!this.accessToken) return;
            
            // Google 사용자 정보 API 호출
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (response.ok) {
                const userInfo = await response.json();
                if (userInfo.email) {
                    localStorage.setItem('google_user_hint', userInfo.email);
                    console.log('💾 User info saved for auto-login');
                }
            }
        } catch (error) {
            console.warn('⚠️ Failed to save user info:', error);
        }
    }

    /**
     * 사용자 힌트 저장 (이메일 등)
     */
    saveUserHint(email) {
        try {
            if (email) {
                localStorage.setItem('google_user_hint', email);
                console.log('💾 User hint saved');
            }
        } catch (error) {
            console.warn('⚠️ Failed to save user hint:', error);
        }
    }

    /**
     * Sign out user
     */
    async signOut() {
        if (this.isAuthenticated) {
            // With GIS, we just revoke the token
            if (this.accessToken) {
                try {
                    await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
                        method: 'POST',
                        headers: {
                            'Content-type': 'application/x-www-form-urlencoded'
                        }
                    });
                } catch (error) {
                    console.warn('⚠️ Token revocation failed:', error);
                }
            }
            
            // 저장된 인증 정보 삭제
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem('google_user_hint');
            
            this.isAuthenticated = false;
            this.accessToken = null;
            console.log('🔓 Signed out from Google Drive and cleared saved auth');
        }
    }
}

// Create global instance
window.DriveUploader = DriveUploader;