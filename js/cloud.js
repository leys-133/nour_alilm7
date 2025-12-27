// Cloud Module - Firebase Integration
// قاعدة البيانات السحابية - Firebase

const CLOUD = {
    // Firebase Configuration
    firebaseConfig: {
        apiKey: "AIzaSyDwgtszUyCX5AZKT1CZrrPQFnIdsRWPDsM",
        authDomain: "rafiq-5076f.firebaseapp.com",
        databaseURL: "https://rafiq-5076f-default-rtdb.firebaseio.com",
        projectId: "rafiq-5076f",
        storageBucket: "rafiq-5076f.firebasestorage.app",
        messagingSenderId: "357494459974",
        appId: "1:357494459974:web:d13c69702035bb66860447",
        measurementId: "G-JQMQMC16HF"
    },

    app: null,
    database: null,
    isInitialized: false,

    // Initialize Firebase
    async init() {
        if (this.isInitialized) return true;

        try {
            // Check if Firebase is loaded
            if (typeof firebase === 'undefined') {
                console.warn('Firebase library not loaded, using localStorage only');
                return false;
            }

            // Initialize Firebase
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(this.firebaseConfig);
            } else {
                this.app = firebase.apps[0];
            }

            this.database = firebase.database();
            this.isInitialized = true;
            console.log('✅ Firebase connected successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            return false;
        }
    },

    // Check if cloud is available
    isAvailable() {
        return this.isInitialized && this.database !== null;
    },

    // Sync user to cloud (register/update)
    async syncUser(user) {
        if (!this.isAvailable()) return null;

        try {
            const userRef = this.database.ref('users/' + user.id);
            await userRef.set({
                id: user.id,
                email: user.email,
                name: user.name,
                accountType: user.accountType,
                roomCode: user.roomCode || null,
                updatedAt: new Date().toISOString()
            });

            console.log('✅ User synced to Firebase:', user.id);
            return user;
        } catch (error) {
            console.error('Error syncing user:', error);
            return null;
        }
    },

    // Find teacher by room code (cloud search)
    async findTeacherByRoomCode(roomCode) {
        if (!this.isAvailable()) {
            console.log('Cloud not available, searching locally');
            return null;
        }

        try {
            const snapshot = await this.database.ref('users')
                .orderByChild('roomCode')
                .equalTo(roomCode.toUpperCase())
                .once('value');

            if (!snapshot.exists()) {
                console.log('No teacher found with room code:', roomCode);
                return null;
            }

            let teacher = null;
            snapshot.forEach((child) => {
                const data = child.val();
                if (data.accountType === 'teacher') {
                    teacher = {
                        id: data.id,
                        email: data.email,
                        name: data.name,
                        accountType: data.accountType,
                        roomCode: data.roomCode
                    };
                }
            });

            if (teacher) {
                console.log('✅ Teacher found in Firebase:', teacher.name);
            }
            return teacher;
        } catch (error) {
            console.error('Error finding teacher:', error);
            return null;
        }
    },

    // Create connection between student and teacher
    async createConnection(studentId, teacherId) {
        if (!this.isAvailable()) return null;

        try {
            const connectionRef = this.database.ref('connections/' + studentId);
            await connectionRef.set({
                studentId: studentId,
                teacherId: teacherId,
                createdAt: new Date().toISOString()
            });

            console.log('✅ Connection created in Firebase');
            return { studentId, teacherId };
        } catch (error) {
            console.error('Error creating connection:', error);
            return null;
        }
    },

    // Get teacher's connected students from cloud
    async getConnectedStudents(teacherId) {
        if (!this.isAvailable()) return [];

        try {
            const snapshot = await this.database.ref('connections')
                .orderByChild('teacherId')
                .equalTo(teacherId)
                .once('value');

            if (!snapshot.exists()) {
                return [];
            }

            const students = [];
            const promises = [];

            snapshot.forEach((child) => {
                const connection = child.val();
                // Get student data
                const promise = this.database.ref('users/' + connection.studentId)
                    .once('value')
                    .then((studentSnapshot) => {
                        if (studentSnapshot.exists()) {
                            const student = studentSnapshot.val();
                            students.push({
                                id: student.id,
                                name: student.name,
                                email: student.email
                            });
                        }
                    });
                promises.push(promise);
            });

            await Promise.all(promises);
            console.log('✅ Found', students.length, 'connected students');
            return students;
        } catch (error) {
            console.error('Error getting students:', error);
            return [];
        }
    },

    // Update user's room code
    async updateRoomCode(userId, roomCode) {
        if (!this.isAvailable()) return false;

        try {
            await this.database.ref('users/' + userId + '/roomCode').set(roomCode);
            console.log('✅ Room code updated in Firebase');
            return true;
        } catch (error) {
            console.error('Error updating room code:', error);
            return false;
        }
    },

    // Sync all user data to cloud (for backup)
    async syncUserData(user) {
        if (!this.isAvailable()) return false;

        try {
            const userRef = this.database.ref('users/' + user.id);
            await userRef.update({
                quranProgress: user.quranProgress || {},
                hadithProgress: user.hadithProgress || [],
                lessonsWatched: user.lessonsWatched || [],
                reports: user.reports || [],
                activities: user.activities || [],
                points: user.points || 0,
                messages: user.messages || [],
                updatedAt: new Date().toISOString()
            });

            console.log('✅ User data synced to Firebase');
            return true;
        } catch (error) {
            console.error('Error syncing user data:', error);
            return false;
        }
    },

    // Get user data from cloud
    async getUserData(userId) {
        if (!this.isAvailable()) return null;

        try {
            const snapshot = await this.database.ref('users/' + userId).once('value');
            if (snapshot.exists()) {
                return snapshot.val();
            }
            return null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    },

    // Send message via cloud
    async sendMessage(fromId, toId, message) {
        if (!this.isAvailable()) return false;

        try {
            // Get recipient's current messages
            const recipientRef = this.database.ref('users/' + toId + '/messages');
            const snapshot = await recipientRef.once('value');
            const messages = snapshot.val() || [];

            // Add new message
            messages.unshift({
                id: 'msg_' + Date.now(),
                from: fromId,
                title: message.title,
                content: message.content,
                timestamp: new Date().toISOString(),
                read: false
            });

            await recipientRef.set(messages);
            console.log('✅ Message sent via Firebase');
            return true;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    },

    // Listen for real-time updates (optional)
    listenToUserUpdates(userId, callback) {
        if (!this.isAvailable()) return null;

        const userRef = this.database.ref('users/' + userId);
        userRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                callback(snapshot.val());
            }
        });

        return userRef;
    },

    // Stop listening to updates
    stopListening(ref) {
        if (ref) {
            ref.off();
        }
    }
};

// Initialize Firebase when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CLOUD.init();
});
