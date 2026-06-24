// Shared footer component

(function() {
    const footerHTML = `
<footer>
        <div class="footer-content">
            <!-- <div class="footer-links">
                <a href="mailto:jwbaek96@gmail.com">
                    <i class="fa-regular fa-envelope"></i>
                </a>
                <a href="https://www.instagram.com/jw.baek.96/" target="_blank" rel="noopener">
                    <i class="fa-brands fa-instagram"></i>
                </a>
                <a href="blog.html">
                    <span>Blog</span>
                </a>
            </div> -->
            
            <!-- <div class="footer-divider"></div> -->
            
            <div class="footer-bottom">
                <!-- <span>jwbaek96@gmail.com</span> -->
                <!-- <p>OAD</p> -->
                <p>&copy; 2025 <a href="/login.html" class="tologinpage">JW.BAEK</a>. All rights reserved.</p>
            </div>
        </div>
    </footer>
`;

    function mountFooter() {
        const placeholder = document.getElementById('footer-placeholder');
        if (placeholder) {
            placeholder.outerHTML = footerHTML;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountFooter);
    } else {
        mountFooter();
    }
})();