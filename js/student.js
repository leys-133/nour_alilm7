// Student Module - نظام الطالب
const STUDENT = {
    currentUser: null,

    // Initialize student module
    init(user) {
        this.currentUser = user;
        this.setupNavigation();
        this.loadDashboard();
        this.checkConnection();
    },

    // Setup sidebar navigation
    setupNavigation() {
        const navItems = document.querySelectorAll('#student-dashboard .nav-item');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = item.dataset.section;

                // Update active nav
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');

                // Show section
                this.showSection(sectionId);

                // Update page title
                const title = item.querySelector('span').textContent;
                document.getElementById('current-page-title').textContent = title;

                // Close mobile sidebar
                document.querySelector('.sidebar').classList.remove('open');
                document.querySelector('.sidebar-overlay')?.classList.remove('active');
            });
        });
    },

    // Show specific section
    showSection(sectionId) {
        // Refresh current user data from storage to avoid stale state
        this.currentUser = AUTH.getCurrentUser();

        const sections = document.querySelectorAll('#student-dashboard .content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');

            // Auto-load section specific data
            if (sectionId === 'student-quran-section') {
                if (typeof QURAN !== 'undefined') QURAN.init(this.currentUser);
            } else if (sectionId === 'student-hadith-section') {
                if (typeof HADITH !== 'undefined') HADITH.init(this.currentUser);
            } else if (sectionId === 'student-reports-section') {
                if (typeof REPORTS !== 'undefined') REPORTS.init(this.currentUser);
            } else if (sectionId === 'student-messages-section') {
                this.loadMessages();
            } else if (sectionId === 'student-leaderboard-section') {
                this.loadLeaderboard();
            } else if (sectionId === 'student-main-dashboard') {
                this.loadDashboard();
            }
        }
    },

    // Load dashboard data
    loadDashboard() {
        this.updateStats();
        this.loadRecentActivity();
        this.loadLeaderboard();
        this.updateMessagesCount();
    },

    // Check and display connection status
    checkConnection() {
        const user = AUTH.getCurrentUser();
        if (!user) return;

        const statusDiv = document.getElementById('connection-status');
        const joinCard = document.getElementById('join-room-card');
        const connectedCard = document.getElementById('connected-info');

        if (user.connectedTeacher) {
            // Find teacher info from all users to ensure we have latest data
            const teacher = AUTH.getUserById(user.connectedTeacher);

            if (teacher) {
                statusDiv.innerHTML = `<i class="fas fa-link"></i><span>مرتبط بأستاذ: ${AUTH.sanitize(teacher.name)}</span>`;
                statusDiv.classList.add('connected');

                if (joinCard) joinCard.classList.add('hidden');
                if (connectedCard) {
                    connectedCard.classList.remove('hidden');
                    document.getElementById('connected-teacher-name').textContent = AUTH.sanitize(teacher.name);
                    document.getElementById('connected-room-code').textContent = teacher.roomCode;
                }
            } else {
                // If teacher no longer exists
                this.disconnectFromTeacher();
            }
        } else {
            if (statusDiv) {
                statusDiv.innerHTML = `<i class="fas fa-link-slash"></i><span>غير مرتبط</span>`;
                statusDiv.classList.remove('connected');
            }

            if (joinCard) joinCard.classList.remove('hidden');
            if (connectedCard) connectedCard.classList.add('hidden');
        }
    },

    // Disconnect if teacher not found
    disconnectFromTeacher() {
        const user = AUTH.getCurrentUser();
        AUTH.updateUser(user.id, { connectedTeacher: null });
        this.checkConnection();
    },

    // Join room function
    async joinRoom() {
        const input = document.getElementById('room-code');
        const code = input.value.toUpperCase().trim();
        const errorDiv = document.getElementById('room-error');

        // Reset error
        errorDiv.classList.add('hidden');
        errorDiv.textContent = '';

        if (!code) {
            errorDiv.textContent = 'يرجى إدخال رمز الحلقة';
            errorDiv.classList.remove('hidden');
            return;
        }

        if (code.length < 4) {
            errorDiv.textContent = 'رمز الحلقة يجب أن يكون 4 أحرف على الأقل';
            errorDiv.classList.remove('hidden');
            return;
        }

        // Show loading state
        const submitBtn = input.parentElement.querySelector('button');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري البحث...';
        submitBtn.disabled = true;

        let teacher = null;
        let isCloudTeacher = false;

        // Try cloud search first
        if (typeof CLOUD !== 'undefined' && CLOUD.isAvailable()) {
            teacher = await CLOUD.findTeacherByRoomCode(code);
            if (teacher) {
                isCloudTeacher = true;
                console.log('Teacher found in cloud');
            }
        }

        // Fallback to local search if cloud not available or teacher not found
        if (!teacher) {
            const users = AUTH.getUsers();
            teacher = users.find(u =>
                u.accountType === 'teacher' &&
                u.roomCode &&
                u.roomCode.toUpperCase() === code
            );
        }

        // Reset button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;

        if (!teacher) {
            errorDiv.textContent = 'رمز الحلقة غير صحيح أو الأستاذ غير مسجل';
            errorDiv.classList.remove('hidden');
            return;
        }

        // Connect student to teacher
        const currentUser = AUTH.getCurrentUser();

        // Prevent connecting if already connected to the same teacher
        if (currentUser.connectedTeacher === teacher.id) {
            showToast('أنت مرتبط بالفعل بهذه الحلقة', 'info');
            return;
        }

        // Update local storage
        AUTH.updateUser(currentUser.id, { connectedTeacher: teacher.id });

        // Create cloud connection in Firebase (always sync when available)
        if (typeof CLOUD !== 'undefined' && CLOUD.isAvailable()) {
            await CLOUD.createConnection(currentUser.id, teacher.id);
            // Also sync the current user to cloud
            await CLOUD.syncUser(currentUser);
        }

        // Add activity
        AUTH.addActivity(currentUser.id, {
            type: 'connection',
            text: `تم الربط بالأستاذ ${teacher.name}`
        });

        // Add points for first connection
        if (!currentUser.activities?.some(a => a.type === 'connection')) {
            this.addPoints(10, 'الانضمام للحلقة الأولى');
        }

        input.value = '';
        showToast(`🎉 تم الربط بالأستاذ ${teacher.name} بنجاح!`, 'success');

        // Refresh connection status and dashboard data
        this.currentUser = AUTH.getCurrentUser();
        this.checkConnection();
        this.loadDashboard();
    },

    // Update stats display
    updateStats() {
        const user = AUTH.getCurrentUser();
        if (!user) return;

        // Quran progress
        const memorizedSurahs = Object.values(user.quranProgress || {}).filter(s => s.status === 'memorized').length;
        const totalSurahs = 114;
        const quranPercentage = Math.round((memorizedSurahs / totalSurahs) * 100);
        const quranProgressEl = document.getElementById('quran-progress');
        if (quranProgressEl) quranProgressEl.textContent = quranPercentage + '%';

        // Hadith count
        const hadithCount = (user.hadithProgress || []).length;
        const hadithEl = document.getElementById('hadith-count');
        if (hadithEl) hadithEl.textContent = hadithCount;

        // Lessons watched
        const lessonsWatched = (user.lessonsWatched || []).length;
        const lessonsEl = document.getElementById('lessons-watched');
        if (lessonsEl) lessonsEl.textContent = lessonsWatched;

        // Reports sent
        const reportsSent = (user.reports || []).length;
        const reportsEl = document.getElementById('reports-sent');
        if (reportsEl) reportsEl.textContent = reportsSent;
    },

    // Load recent activity
    loadRecentActivity() {
        const user = AUTH.getCurrentUser();
        const container = document.getElementById('recent-activity');
        const activities = user.activities || [];

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>لا توجد نشاطات حديثة</p>
                </div>
            `;
            return;
        }

        const recentActivities = activities.slice(0, 5);
        container.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    },

    // Get activity icon
    getActivityIcon(type) {
        const icons = {
            'quran': 'fa-quran',
            'hadith': 'fa-book-open',
            'lesson': 'fa-video',
            'report': 'fa-file-alt',
            'message': 'fa-envelope'
        };
        return icons[type] || 'fa-star';
    },

    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'الآن';
        if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
        if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;

        return date.toLocaleDateString('ar-SA');
    },

    // Load leaderboard
    loadLeaderboard() {
        const users = AUTH.getUsers();
        const students = users.filter(u => u.accountType === 'student');

        // Calculate scores
        const scores = students.map(student => ({
            id: student.id,
            name: student.name,
            totalScore: calculateStudentScore(student)
        })).sort((a, b) => b.totalScore - a.totalScore);

        const container = document.getElementById('leaderboard');

        if (scores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-trophy"></i>
                    <p>لا توجد بيانات بعد</p>
                </div>
            `;
            return;
        }

        container.innerHTML = scores.slice(0, 10).map((student, index) => `
            <div class="leaderboard-item ${student.id === this.currentUser.id ? 'current-user' : ''}">
                <div class="leaderboard-rank">${index + 1}</div>
                <div class="leaderboard-name">${student.name}</div>
                <div class="leaderboard-points">${student.totalScore} نقطة</div>
            </div>
        `).join('');

        // Update user rank
        const userRank = scores.findIndex(s => s.id === this.currentUser.id) + 1;
        const userScore = scores.find(s => s.id === this.currentUser.id);

        document.getElementById('your-rank').textContent = userRank ? `#${userRank}` : '#-';
        document.getElementById('your-points').textContent = userScore ? `${userScore.totalScore} نقطة` : '0 نقطة';
    },

    // Update messages count
    updateMessagesCount() {
        const user = AUTH.getCurrentUser();
        const unreadCount = (user.messages || []).filter(m => !m.read).length;
        const badge = document.getElementById('student-messages-badge');

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');

            // Play notification sound for new messages
            if (typeof UTILS !== 'undefined' && UTILS.playNotificationSound) {
                UTILS.playNotificationSound();
            }
        } else {
            badge.classList.add('hidden');
        }
    },

    // Load messages
    loadMessages() {
        const user = AUTH.getCurrentUser();
        const container = document.getElementById('student-messages-list');
        const messages = (user.messages || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <p>لا توجد رسائل</p>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(msg => {
            const sender = AUTH.getUserById(msg.from);
            return `
                <div class="message-item ${msg.read ? '' : 'unread'}" onclick="STUDENT.markMessageRead('${msg.id}')">
                    <div class="message-header">
                        <span class="message-title">${AUTH.sanitize(msg.title)}</span>
                        <span class="message-date">${this.formatTime(msg.timestamp)}</span>
                    </div>
                    <div class="message-content">${AUTH.sanitize(msg.content)}</div>
                    <div class="message-from">
                        <i class="fas fa-user"></i>
                        من: ${sender ? AUTH.sanitize(sender.name) : 'الأستاذ'}
                    </div>
                </div>
            `;
        }).join('');

        // Mark all as read
        this.markAllMessagesRead();
    },

    // Mark message as read
    markMessageRead(messageId) {
        const user = AUTH.getCurrentUser();
        const messages = user.messages || [];
        const msg = messages.find(m => m.id === messageId);

        if (msg && !msg.read) {
            msg.read = true;
            AUTH.updateUser(user.id, { messages });
            this.updateMessagesCount();
        }
    },

    // Mark all messages as read
    markAllMessagesRead() {
        const user = AUTH.getCurrentUser();
        const messages = (user.messages || []).map(m => ({ ...m, read: true }));
        AUTH.updateUser(user.id, { messages });
        this.updateMessagesCount();
    },

    // Add points to user
    addPoints(points, reason) {
        const user = AUTH.getCurrentUser();
        const newPoints = (user.points || 0) + points;
        AUTH.updateUser(user.id, { points: newPoints });

        showToast(`+${points} نقطة: ${reason}`, 'success');
    }
};

// Global functions for HTML onclick handlers
async function joinRoom() {
    if (typeof STUDENT !== 'undefined') {
        await STUDENT.joinRoom();
    }
}

// Share progress function
function shareMyProgress() {
    const user = AUTH.getCurrentUser();
    if (!user) {
        showToast('يرجى تسجيل الدخول أولاً', 'error');
        return;
    }

    const quranProgress = Object.values(user.quranProgress || {}).filter(s => s.status === 'memorized').length;
    const quranPercentage = Math.round((quranProgress / 114) * 100);
    const hadithCount = (user.hadithProgress || []).length;
    const lessonsWatched = (user.lessonsWatched || []).length;
    const points = calculateStudentScore(user);

    UTILS.shareProgress({
        quranProgress: quranPercentage,
        hadithCount: hadithCount,
        lessonsWatched: lessonsWatched,
        points: points
    });
}

// Toggle sidebar for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');

    // Create overlay if doesn't exist
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    overlay.classList.toggle('active');
}
