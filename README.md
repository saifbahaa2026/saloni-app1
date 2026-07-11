# صالوني - دليل تحويله لتطبيق حقيقي على الموبايل

هذا المشروع جاهز، بس محتاج منك 3 خطوات: (1) تسوي قاعدة بيانات مجانية عشان البيانات تنحفظ وتتزامن بين كل الأجهزة، (2) تشغله على جهازك، (3) تبنيه كتطبيق أندرويد/آيفون.

## 1) قاعدة البيانات (Firebase - مجانية)

التطبيق فيه حلاقين وزباين وإدارة، كل وحد يفتحه من موبايله - يعني لازم قاعدة بيانات حقيقية على الإنترنت (مو تخزين محلي بالموبايل بس).

1. روح لـ https://console.firebase.google.com وسوي مشروع جديد (مجاني).
2. من القائمة الجانبية: **Build > Realtime Database > Create Database**.
3. اختار **Start in test mode** (تقدر تشدد الصلاحيات بعدين).
4. انسخ الرابط اللي يطلع فوق، شكله مثل:
   `https://saloni-xxxx-default-rtdb.firebaseio.com`
5. افتح ملف `src/App.jsx` ودور على هذا السطر بالأعلى:
   ```js
   const FIREBASE_URL = "https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com";
   ```
   وبدله برابطك الحقيقي.

## 2) تشغيل المشروع على جهازك

تحتاج تنصب **Node.js** (من nodejs.org) إذا ما عندك.

```bash
cd saloni-app
npm install
npm run dev
```

بيفتح لك رابط محلي (مثل `http://localhost:5173`) تقدر تجربه بالمتصفح قبل لا تسويه تطبيق.

## 3) تحويله لتطبيق أندرويد حقيقي (APK)

تحتاج تنصب **Android Studio** (من developer.android.com/studio) - مجاني.

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

هذا الأمر الأخير يفتح المشروع بـ Android Studio. من داخله:
- روح لـ **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- بينبني لك ملف `.apk` تكدر تنزله مباشرة بموبايلك (أو تنشره على Google Play لاحقاً).

## تطبيق آيفون (اختياري)

لازم جهاز **Mac** ونسخة **Xcode**:

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

وبعدين تبني وتشغل من Xcode مباشرة على آيفونك أو تنشره على App Store.

## ملاحظات مهمة

- رمز الإدارة الافتراضي: `saif` (تقدر تغيره من داخل التطبيق).
- كل مرة تسوي تعديل بالكود لازم تعيد: `npm run build` ثم `npx cap sync`.
- إذا حاب يبقى موقع ويب بس (رابط تفتحه بأي متصفح بدون تنزيل)، ارفع مجلد `dist` بعد `npm run build` على أي استضافة مجانية مثل Vercel أو Netlify.
