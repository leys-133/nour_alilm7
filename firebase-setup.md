# Firebase Setup - منصة نور العلم

## إعدادات Firebase المستخدمة

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDwgtszUyCX5AZKT1CZrrPQFnIdsRWPDsM",
    authDomain: "rafiq-5076f.firebaseapp.com",
    databaseURL: "https://rafiq-5076f-default-rtdb.firebaseio.com",
    projectId: "rafiq-5076f",
    storageBucket: "rafiq-5076f.firebasestorage.app",
    messagingSenderId: "357494459974",
    appId: "1:357494459974:web:d13c69702035bb66860447",
    measurementId: "G-JQMQMC16HF"
};
```

## هيكل قاعدة البيانات (Realtime Database)

```
rafiq-5076f-default-rtdb/
├── users/
│   └── {userId}/
│       ├── id
│       ├── email
│       ├── name
│       ├── accountType (student/teacher)
│       ├── roomCode (للأساتذة فقط)
│       ├── quranProgress
│       ├── hadithProgress
│       ├── lessonsWatched
│       ├── reports
│       ├── messages
│       ├── activities
│       ├── points
│       └── updatedAt
│
└── connections/
    └── {studentId}/
        ├── studentId
        ├── teacherId
        └── createdAt
```

## قواعد أمان Firebase (Realtime Database Rules)

انسخ هذه القواعد في Firebase Console > Realtime Database > Rules:

```json
{
  "rules": {
    "users": {
      ".read": true,
      ".write": true,
      ".indexOn": ["roomCode", "accountType"]
    },
    "connections": {
      ".read": true,
      ".write": true,
      ".indexOn": ["teacherId", "studentId"]
    }
  }
}
```

## ملاحظة
هذه القواعد مفتوحة للتطوير. للإنتاج، يجب تشديد الأمان.
