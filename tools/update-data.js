const fs = require('fs');
const path = require('path');

/**
 * Google Sheets에서 데이터를 가져와서 JSON 파일들을 생성하는 스크립트
 * GitHub Actions에서 실행됩니다
 */

class DataUpdater {
    constructor() {
        this.googleScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
        this.dataDir = path.join(__dirname, '../content/data');
        
        if (!this.googleScriptUrl) {
            throw new Error('GOOGLE_APPS_SCRIPT_URL environment variable is required');
        }
    }

    /**
     * Google Apps Script에서 모든 포스트 데이터 가져오기
     */
    async fetchAllPosts() {
        try {
            console.log('📡 Fetching posts from Google Sheets...');
            
            const response = await fetch(`${this.googleScriptUrl}?action=getPosts`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(`API error: ${data.error}`);
            }
            
            console.log(`✅ Fetched ${data.posts.length} posts`);
            return data.posts;
            
        } catch (error) {
            console.error('❌ Error fetching posts:', error);
            throw error;
        }
    }

    /**
     * 포스트를 카테고리별로 분류
     */
    categorizePostsByTags(posts) {
        const categorized = {
            posts: [],
            artworks: [],
            projects: []
        };

        posts.forEach(post => {
            // 게시된 포스트만 포함
            if (post.status !== 'published') {
                return;
            }

            // 태그를 배열로 변환
            let tags = [];
            if (post.tags) {
                if (Array.isArray(post.tags)) {
                    tags = post.tags;
                } else if (typeof post.tags === 'string') {
                    tags = post.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
                }
            }

            // 댓글 데이터는 제거 (동적으로 로드)
            const cleanPost = {
                ...post,
                tags: tags
            };
            delete cleanPost.comment;

            // 태그에 따라 분류
            if (tags.includes('artwork')) {
                categorized.artworks.push(cleanPost);
            } else if (tags.includes('project')) {
                categorized.projects.push(cleanPost);
            } else {
                categorized.posts.push(cleanPost);
            }
        });

        // 날짜 순으로 정렬 (최신순)
        const sortByDate = (a, b) => new Date(b.date) - new Date(a.date);
        categorized.posts.sort(sortByDate);
        categorized.artworks.sort(sortByDate);
        categorized.projects.sort(sortByDate);

        return categorized;
    }

    /**
     * JSON 파일 업데이트
     */
    async updateJsonFiles(categorizedData) {
        const timestamp = new Date().toISOString();

        // posts.json 업데이트
        const postsData = {
            lastUpdated: timestamp,
            count: categorizedData.posts.length,
            posts: categorizedData.posts
        };
        
        await this.writeJsonFile('posts.json', postsData);
        console.log(`✅ Updated posts.json with ${categorizedData.posts.length} posts`);

        // artworks.json 업데이트
        const artworksData = {
            lastUpdated: timestamp,
            count: categorizedData.artworks.length,
            artworks: categorizedData.artworks
        };
        
        await this.writeJsonFile('artworks.json', artworksData);
        console.log(`✅ Updated artworks.json with ${categorizedData.artworks.length} artworks`);

        // projects.json 업데이트
        const projectsData = {
            lastUpdated: timestamp,
            count: categorizedData.projects.length,
            projects: categorizedData.projects
        };
        
        await this.writeJsonFile('projects.json', projectsData);
        console.log(`✅ Updated projects.json with ${categorizedData.projects.length} projects`);
    }

    /**
     * JSON 파일 쓰기
     */
    async writeJsonFile(filename, data) {
        const filePath = path.join(this.dataDir, filename);
        
        try {
            await fs.promises.writeFile(
                filePath, 
                JSON.stringify(data, null, 2), 
                'utf8'
            );
        } catch (error) {
            console.error(`❌ Error writing ${filename}:`, error);
            throw error;
        }
    }

    /**
     * 메인 업데이트 실행
     */
    async run() {
        try {
            console.log('🚀 Starting data update process...');
            
            // 1. Google Sheets에서 데이터 가져오기
            const allPosts = await this.fetchAllPosts();
            
            // 2. 카테고리별로 분류
            const categorizedData = this.categorizePostsByTags(allPosts);
            
            console.log('📊 Categorization results:');
            console.log(`   - Posts: ${categorizedData.posts.length}`);
            console.log(`   - Artworks: ${categorizedData.artworks.length}`);
            console.log(`   - Projects: ${categorizedData.projects.length}`);
            
            // 3. JSON 파일들 업데이트
            await this.updateJsonFiles(categorizedData);
            
            console.log('🎉 Data update completed successfully!');
            
        } catch (error) {
            console.error('💥 Data update failed:', error);
            process.exit(1);
        }
    }
}

// 스크립트 실행
if (require.main === module) {
    const updater = new DataUpdater();
    updater.run();
}

module.exports = DataUpdater;