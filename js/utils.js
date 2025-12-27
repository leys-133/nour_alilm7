// Utils Module - أدوات مساعدة
const UTILS = {
    // =============================================
    // Theme Management - إدارة الوضع المظلم
    // =============================================
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeColor(savedTheme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeColor(newTheme);

        showToast(newTheme === 'dark' ? '🌙 تم تفعيل الوضع المظلم' : '☀️ تم تفعيل الوضع الفاتح', 'success');
    },

    updateThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f1419' : '#1a7a5c');
        }
    },

    // =============================================
    // Notification Sound - صوت الإشعارات
    // =============================================
    notificationSound: null,

    initNotificationSound() {
        // إنشاء صوت إشعار بسيط باستخدام Web Audio API
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    },

    playNotificationSound() {
        if (!this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);

            // نغمة ثانية
            setTimeout(() => {
                const osc2 = this.audioContext.createOscillator();
                const gain2 = this.audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(this.audioContext.destination);
                osc2.frequency.value = 1000;
                osc2.type = 'sine';
                gain2.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                osc2.start(this.audioContext.currentTime);
                osc2.stop(this.audioContext.currentTime + 0.3);
            }, 150);
        } catch (e) {
            console.log('Notification sound error:', e);
        }
    },

    // =============================================
    // Cache Manager - مدير التخزين المؤقت
    // =============================================
    cache: new Map(),
    cacheTimeout: 5 * 60 * 1000, // 5 دقائق

    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },

    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    },

    clearCache() {
        this.cache.clear();
    },

    // =============================================
    // Network Status - حالة الاتصال
    // =============================================
    initNetworkStatus() {
        this.updateNetworkStatus();

        window.addEventListener('online', () => {
            this.updateNetworkStatus();
            showToast('✅ تم استعادة الاتصال بالإنترنت', 'success');
        });

        window.addEventListener('offline', () => {
            this.updateNetworkStatus();
            showToast('⚠️ انقطع الاتصال بالإنترنت', 'warning');
        });
    },

    updateNetworkStatus() {
        const isOnline = navigator.onLine;
        document.body.classList.toggle('offline', !isOnline);
    },

    isOnline() {
        return navigator.onLine;
    },

    // =============================================
    // Share Progress - مشاركة التقدم
    // =============================================
    async shareProgress(data) {
        const shareText = `🌙 منصة نور العلم\n\n` +
            `📖 تقدمي في حفظ القرآن: ${data.quranProgress}%\n` +
            `📚 الأحاديث المحفوظة: ${data.hadithCount}/40\n` +
            `🎥 الدروس المشاهدة: ${data.lessonsWatched}\n` +
            `🏆 نقاطي: ${data.points}\n\n` +
            `#نور_العلم #حفظ_القرآن`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'تقدمي في منصة نور العلم',
                    text: shareText
                });
                showToast('✅ تمت المشاركة بنجاح', 'success');
            } catch (e) {
                if (e.name !== 'AbortError') {
                    this.copyToClipboard(shareText);
                    showToast('📋 تم نسخ التقدم للحافظة', 'success');
                }
            }
        } else {
            this.copyToClipboard(shareText);
            showToast('📋 تم نسخ التقدم للحافظة', 'success');
        }
    },

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(() => {
            // Fallback للمتصفحات القديمة
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    },

    // =============================================
    // Weekly Summary - ملخص أسبوعي
    // =============================================
    getWeeklySummary(user) {
        if (!user) return null;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekActivities = (user.activities || []).filter(a =>
            new Date(a.timestamp) > weekAgo
        );

        const weekReports = (user.reports || []).filter(r =>
            new Date(r.timestamp) > weekAgo
        );

        return {
            activitiesCount: weekActivities.length,
            reportsCount: weekReports.length,
            quranSessions: weekActivities.filter(a => a.type === 'quran').length,
            hadithSessions: weekActivities.filter(a => a.type === 'hadith').length,
            lessonsSessions: weekActivities.filter(a => a.type === 'lesson').length
        };
    },

    // =============================================
    // Enhanced Error Handler - معالج الأخطاء
    // =============================================
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);

        let message = 'حدث خطأ غير متوقع';

        if (error.message) {
            if (error.message.includes('network') || error.message.includes('fetch')) {
                message = 'خطأ في الاتصال بالشبكة';
            } else if (error.message.includes('storage') || error.message.includes('quota')) {
                message = 'مساحة التخزين ممتلئة';
            }
        }

        showToast(`❌ ${message}`, 'error');
    },

    // =============================================
    // Initialize All Utils
    // =============================================
    init() {
        this.initTheme();
        this.initNotificationSound();
        this.initNetworkStatus();
    }
};

// Global function for theme toggle
function toggleTheme() {
    UTILS.toggleTheme();
}

// Initialize utils when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    UTILS.init();
});
