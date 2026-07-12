import React, { useState, useMemo } from "react";
import { Scissors, User, Lock, MapPin, Check, X, Trash2, Power, ChevronRight, Send, Clock, Phone, Camera, Sun, Moon } from "lucide-react";

// ---------- ثيم موحد (فاتح وداكن) ----------
const LIGHT_THEME = {
  bg: "#EFF6F7",
  card: "#FFFFFF",
  primary: "#3E7CA6",
  primaryDark: "#2E6389",
  primarySoft: "#E4EEF2",
  text: "#1E3A4C",
  muted: "#7C93A0",
  border: "#D7E4E8",
  danger: "#C1554F",
  dangerSoft: "#F6E3E1",
  good: "#4C8B64",
  goodSoft: "#E3F0E7",
};

const DARK_THEME = {
  bg: "#0F1A21",
  card: "#182530",
  primary: "#5AA3D0",
  primaryDark: "#3E7CA6",
  primarySoft: "#20323D",
  text: "#E7F0F4",
  muted: "#8FA5B0",
  border: "#2A3B45",
  danger: "#E07872",
  dangerSoft: "#3A2422",
  good: "#6FBA88",
  goodSoft: "#20362A",
};

let T = { ...LIGHT_THEME };
function applyTheme(isDark) {
  Object.assign(T, isDark ? DARK_THEME : LIGHT_THEME);
}

// ملاحظة: رمز الإدارة الافتراضي هو "saif"، ويصير قابل للتغيير من داخل لوحة الإدارة نفسها ومحفوظ بالتخزين الدائم
const SLOTS = (() => {
  const s = [];
  for (let h = 9; h < 24; h++) {
    s.push(`${String(h).padStart(2, "0")}:00`);
    s.push(`${String(h).padStart(2, "0")}:30`);
  }
  return s;
})();

// يحوّل وقت 24 ساعة (HH:mm) إلى نظام 12 ساعة بالعربي (صباحاً/مساءً)
function to12h(t) {
  const [hStr, m] = t.split(":");
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? "م" : "ص";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${period}`;
}

const pad2 = (n) => String(n).padStart(2, "0");
const uid = () => Math.random().toString(36).slice(2, 9);
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// يتحقق إذا الوقت المحدد فات (بس لليوم الحالي - الأيام الجاية كلها متاحة عادي)
function isPastSlot(date, time) {
  if (date !== todayStr()) return false;
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const slotMinutes = h * 60 + m;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return slotMinutes <= nowMinutes;
}
const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
function nextDays(n) {
  const out = [];
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(t);
    d.setDate(d.getDate() + i);
    out.push(d);
  }
  return out;
}
const ds = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// ---------- بيانات ابتدائية ----------
const SEED_BARBERS = [
  { id: "h1", name: "أبو علي", phone: "07701234567", address: "شارع الكرادة الرئيسي", approved: true, active: true },
  { id: "h2", name: "كريم", phone: "07709876543", address: "شارع 14 رمضان", approved: true, active: true },
];

// ================= التطبيق الرئيسي =================
const K_BARBERS = "saloni-barbers";
const K_APPTS = "saloni-appointments";
const K_HOLDS = "saloni-holds";
const K_ADMIN_PIN = "saloni-admin-pin";
const K_DARK_MODE = "saloni-dark-mode";

// رابط قاعدة بيانات Firebase Realtime Database - غيّره برابط مشروعك
// مثال: https://saloni-xxxx-default-rtdb.firebaseio.com
const FIREBASE_URL = "https://saloni-497d1-default-rtdb.firebaseio.com";

async function loadOrSeed(key, seed) {
  try {
    const res = await fetch(`${FIREBASE_URL}/${key}.json`);
    const data = await res.json();
    if (data !== null && data !== undefined) {
      // إذا المفروض تكون قائمة (array) بس البيانات المخزنة تلفت وصارت شي ثاني، نرجع قائمة فارغة بدل ما يعلق التطبيق
      if (Array.isArray(seed) && !Array.isArray(data)) {
        return Object.values(data || {});
      }
      return data;
    }
  } catch (e) {
    // غير موجود بعد أو تعذر الاتصال، نرجع القيمة الافتراضية
  }
  try {
    await fetch(`${FIREBASE_URL}/${key}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(seed),
    });
  } catch (e) {
    console.error("تعذر الحفظ الأولي", e);
  }
  return seed;
}

async function saveKey(key, value) {
  try {
    await fetch(`${FIREBASE_URL}/${key}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  } catch (e) {
    console.error("تعذر الحفظ", e);
  }
}

export default function SaloniPreview() {
  const [screen, setScreen] = useState("welcome"); // welcome | barberEntry | barberJoin | barberDash | customer | admin
  const [barbers, setBarbersState] = useState([]);
  const [appointments, setAppointmentsState] = useState([]);
  const [holds, setHoldsState] = useState([]); // حجوزات مؤقتة: {id, barberId, date, time, until}
  const [adminPin, setAdminPinState] = useState("saif");
  const [darkMode, setDarkModeState] = useState(false);
  const [currentBarberId, setCurrentBarberId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  // تحديث الثيم فوراً حسب الوضع الداكن قبل أي رسم بالشاشة
  applyTheme(darkMode);

  const setDarkMode = (val) => {
    setDarkModeState(val);
    saveKey(K_DARK_MODE, val);
  };

  // تحميل البيانات المحفوظة عند فتح التطبيق لأول مرة
  React.useEffect(() => {
    (async () => {
      const [b, a, h, p, dm] = await Promise.all([
        loadOrSeed(K_BARBERS, SEED_BARBERS),
        loadOrSeed(K_APPTS, []),
        loadOrSeed(K_HOLDS, []),
        loadOrSeed(K_ADMIN_PIN, "saif"),
        loadOrSeed(K_DARK_MODE, false),
      ]);
      setBarbersState(b);
      setAppointmentsState(a);
      setHoldsState(h);
      setAdminPinState(p);
      setDarkModeState(dm);
      setLoading(false);
    })();
  }, []);

  // دوال تحديث تحفظ بالتخزين الدائم فوراً بعد كل تغيير
  const setBarbers = (updater) => {
    setBarbersState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveKey(K_BARBERS, next);
      return next;
    });
  };
  const setAppointments = (updater) => {
    setAppointmentsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveKey(K_APPTS, next);
      return next;
    });
  };
  const setHolds = (updater) => {
    setHoldsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveKey(K_HOLDS, next);
      return next;
    });
  };
  const changeAdminPin = (newPin) => {
    setAdminPinState(newPin);
    saveKey(K_ADMIN_PIN, newPin);
  };

  // تحديث دوري بسيط عشان الأوقات المنتهية تتحرر تلقائياً بالواجهة بدون تفاعل يدوي
  React.useEffect(() => {
    const iv = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(iv);
  }, []);

  const addHold = (hold) => setHolds((prev) => [...prev, hold]);
  const removeHold = (id) => setHolds((prev) => prev.filter((h) => h.id !== id));
  const activeHolds = (Array.isArray(holds) ? holds : []).filter((h) => h.until > Date.now());

  const togglePauseToday = (barberId) => {
    const today = todayStr();
    setBarbers((prev) =>
      prev.map((b) => {
        if (b.id !== barberId) return b;
        const paused = b.pausedDates || [];
        const isPaused = paused.includes(today);
        return { ...b, pausedDates: isPaused ? paused.filter((d) => d !== today) : [...paused, today] };
      })
    );
  };

  const changeBarberPin = (barberId, newPin) => {
    setBarbers((prev) => prev.map((b) => (b.id === barberId ? { ...b, pin: newPin } : b)));
  };
  const changeBarberPhoto = (barberId, photo) => {
    setBarbers((prev) => prev.map((b) => (b.id === barberId ? { ...b, photo } : b)));
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.primary, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", fontFamily: "'Tajawal','Segoe UI',sans-serif", background: T.bg }}>
      <style>{`
        * { box-sizing: border-box; }
        button { cursor: pointer; font-family: inherit; transition: transform 0.12s ease, opacity 0.12s ease, background 0.15s ease, border-color 0.15s ease; }
        button:active:not(:disabled) { transform: scale(0.96); }
        input:focus { outline: none; border-color: ${T.primary} !important; }
        input, .slot-btn { transition: all 0.15s ease; }

        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes pulseSoft { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
        @keyframes toastSlide { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes checkPop { 0% { transform: scale(0); opacity: 0; } 55% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }

        .screen-enter { animation: fadeSlideUp 0.32s ease both; }
        .card-item { transition: transform 0.12s ease, box-shadow 0.15s ease; }
        .card-item:active { transform: scale(0.98); }
        .logo-breathe { animation: pulseSoft 3.2s ease-in-out infinite; }
      `}</style>

      {screen === "welcome" && (
        <WelcomeScreen
          onBarber={() => setScreen("barberEntry")}
          onCustomer={() => setScreen("customer")}
          onAdmin={() => setScreen("admin")}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(!darkMode)}
        />
      )}

      {screen === "barberEntry" && (
        <BarberEntryScreen
          barbers={barbers}
          onBack={() => setScreen("welcome")}
          onGoRegister={() => setScreen("barberJoin")}
          onGoDashboard={(id) => { setCurrentBarberId(id); setScreen("barberDash"); }}
        />
      )}

      {screen === "barberJoin" && (
        <BarberJoinScreen
          onBack={() => setScreen("barberEntry")}
          onSubmit={(b) => setBarbers((prev) => [...prev, { ...b, id: uid(), approved: false, active: true }])}
        />
      )}

      {screen === "barberDash" && (
        <BarberDashboard
          barber={barbers.find((b) => b.id === currentBarberId)}
          appointments={appointments.filter((a) => a.barberId === currentBarberId)}
          onLogout={() => { setCurrentBarberId(null); setScreen("welcome"); }}
          onTogglePauseToday={() => togglePauseToday(currentBarberId)}
          onChangePin={(newPin) => changeBarberPin(currentBarberId, newPin)}
          onChangePhoto={(photo) => changeBarberPhoto(currentBarberId, photo)}
        />
      )}

      {screen === "customer" && (
        <CustomerFlow
          barbers={barbers}
          appointments={appointments}
          holds={activeHolds}
          onAddHold={addHold}
          onRemoveHold={removeHold}
          onBack={() => setScreen("welcome")}
          onBook={(a) => setAppointments((prev) => [...prev, a])}
        />
      )}

      {screen === "admin" && (
        <AdminScreen
          barbers={barbers}
          appointments={appointments}
          adminPin={adminPin}
          onChangeAdminPin={changeAdminPin}
          onBack={() => setScreen("welcome")}
          onApprove={(id) => setBarbers((prev) => prev.map((b) => (b.id === id ? { ...b, approved: true } : b)))}
          onToggleActive={(id) => setBarbers((prev) => prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)))}
          onDeleteBarber={(id) => {
            setBarbers((prev) => prev.filter((b) => b.id !== id));
            setAppointments((prev) => prev.filter((a) => a.barberId !== id));
          }}
          onDeleteAppt={(id) => setAppointments((prev) => prev.filter((a) => a.id !== id))}
        />
      )}
    </div>
  );
}

// ================= شاشة الترحيب =================
function Logo() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <g transform="translate(28,50) rotate(-28)" stroke={T.primary} strokeWidth="5" strokeLinecap="round" fill="none">
        <circle cx="0" cy="-12" r="7" />
        <circle cx="0" cy="12" r="7" />
        <line x1="5" y1="-7" x2="40" y2="0" />
        <line x1="5" y1="7" x2="40" y2="0" />
      </g>
      <g fill={T.primary}>
        <rect x="55" y="20" width="26" height="10" rx="3" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={55 + i * 4.6} y="30" width="2.6" height="34" rx="1" />
        ))}
      </g>
    </svg>
  );
}

function WelcomeScreen({ onBarber, onCustomer, onAdmin, darkMode, onToggleDark }) {
  return (
    <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 32px", position: "relative" }}>
      <button
        onClick={onToggleDark}
        aria-label="تبديل الوضع الداكن"
        style={{
          position: "absolute", top: 20, left: 20,
          width: 40, height: 40, borderRadius: 20,
          background: T.card, border: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {darkMode ? <Sun size={18} color={T.primary} /> : <Moon size={18} color={T.primary} />}
      </button>

      <div className="logo-breathe" style={{ marginTop: 60 }}>
        <Logo />
      </div>
      <h1 style={{ color: T.primary, fontSize: 34, fontWeight: 800, margin: "-18px 0 0" }}>صالوني</h1>

      <div style={{ flex: 1 }} />

      <div style={{ width: "100%", maxWidth: 280 }}>
        <PrimaryBtn onClick={onBarber} icon={<Scissors size={19} />} label="أنا حلاق" />
        <div style={{ height: 14 }} />
        <OutlineBtn onClick={onCustomer} icon={<User size={19} />} label="أنا زبون" />
      </div>
      <p style={{ color: T.muted, fontSize: 14.5, textAlign: "center", margin: "18px 0 0", lineHeight: 1.6 }}>
        أهلاً بيك، احجز موعدك عند حلاقك المفضل بكل سهولة
      </p>

      <div style={{ height: 40 }} />
      <button onClick={onAdmin} style={{ background: "none", border: "none", color: T.muted, fontSize: 12.5, marginBottom: 6 }}>
        دخول الإدارة
      </button>
      <div style={{ color: T.muted, fontSize: 11 }}>تصميم وتطوير: المهندس سيف بهاء عبد اللطيف</div>
    </div>
  );
}

// ================= دخول الحلاق (رقم الهاتف) =================
function BarberEntryScreen({ barbers, onBack, onGoRegister, onGoDashboard }) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [status, setStatus] = useState(null); // null | 'pending' | 'notfound' | 'wrongpin'

  const check = () => {
    const found = barbers.find((b) => b.phone === phone.trim());
    if (!found) {
      setStatus("notfound");
      return;
    }
    if (!found.approved) {
      setStatus("pending");
      return;
    }
    if ((found.pin || "") !== pin.trim()) {
      setStatus("wrongpin");
      return;
    }
    onGoDashboard(found.id);
  };

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", padding: "24px 24px" }}>
      <BackBtn onClick={onBack} />
      <div style={{ textAlign: "center", marginTop: 30 }}>
        <Scissors size={30} color={T.primary} />
        <h2 style={{ fontSize: 19, margin: "10px 0 2px", color: T.text }}>دخول الحلاق</h2>
        <p style={{ color: T.muted, fontSize: 12.5, marginBottom: 24 }}>أدخل رقم هاتفك ورمزك السري للدخول لحجوزاتك</p>
      </div>

      <Field label="رقم الهاتف" value={phone} onChange={(v) => { setPhone(v); setStatus(null); }} placeholder="07xxxxxxxxx" dir="ltr" icon={<Phone size={15} />} />
      <Field label="الرمز السري" value={pin} onChange={(v) => { setPin(v); setStatus(null); }} placeholder="الرمز اللي اخترته وقت التسجيل" dir="ltr" icon={<Lock size={15} />} />

      {status === "pending" && (
        <div style={{ background: T.primarySoft, border: `1px solid ${T.primary}55`, borderRadius: 12, padding: 12, fontSize: 12.5, color: T.primaryDark, marginTop: 8 }}>
          طلبك لسه قيد المراجعة من الإدارة، انتظر الموافقة وحاول مرة ثانية.
        </div>
      )}
      {status === "notfound" && (
        <div style={{ background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 12, padding: 12, fontSize: 12.5, color: T.danger, marginTop: 8 }}>
          ما لكينا هذا الرقم. سجّل حساب جديد كحلاق من تحت.
        </div>
      )}
      {status === "wrongpin" && (
        <div style={{ background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 12, padding: 12, fontSize: 12.5, color: T.danger, marginTop: 8 }}>
          الرمز السري غلط، جرب مرة ثانية.
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <PrimaryBtn onClick={check} label="دخول" disabled={!phone.trim() || !pin.trim()} />
      </div>

      <div style={{ textAlign: "center", marginTop: 22 }}>
        <span style={{ color: T.muted, fontSize: 12.5 }}>ما عندك حساب؟ </span>
        <button onClick={onGoRegister} style={{ background: "none", border: "none", color: T.primary, fontSize: 12.5, fontWeight: 700 }}>
          سجّل كحلاق جديد
        </button>
      </div>
    </div>
  );
}

// ================= طلب انضمام حلاق =================
function BarberJoinScreen({ onBack, onSubmit }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState(null);
  const [sent, setSent] = useState(false);
  const canSubmit = name.trim() && phone.trim() && address.trim() && pin.trim().length >= 4;

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", padding: "24px 24px" }}>
      {sent ? (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ animation: "popIn 0.4s ease" }}>
            <Clock size={40} color={T.primary} />
          </div>
          <h2 style={{ marginTop: 16, fontSize: 18, color: T.text }}>تم إرسال طلبك</h2>
          <p style={{ color: T.muted, fontSize: 13, lineHeight: 1.7, padding: "0 10px" }}>
            بانتظار موافقة الإدارة على حسابك، بعدها تقدر تدخل برقم هاتفك وتشوف حجوزاتك
          </p>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.primary, marginTop: 12, fontSize: 13, fontWeight: 700 }}>
            رجوع للرئيسية
          </button>
        </div>
      ) : (
        <>
          <BackBtn onClick={onBack} />
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            <PhotoPicker photo={photo} onPick={pickPhoto} />
          </div>
          <h2 style={{ fontSize: 19, margin: "10px 0 2px", color: T.text, textAlign: "center" }}>طلب الانضمام كحلاق</h2>
          <p style={{ color: T.muted, fontSize: 12.5, marginBottom: 20, textAlign: "center" }}>عبّي بياناتك، وراح يصير حسابك فعّال بعد موافقة الإدارة</p>

          <Field label="الاسم" value={name} onChange={setName} placeholder="اسمك الكامل" />
          <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="07xxxxxxxxx" dir="ltr" />
          <Field label="العنوان" value={address} onChange={setAddress} placeholder="عنوان محلك أو منطقة عملك" />
          <Field label="اختار رمز سري (4 أرقام أو أكثر)" value={pin} onChange={setPin} placeholder="مثال: 4517" dir="ltr" icon={<Lock size={15} />} />

          <div style={{ marginTop: 10 }}>
            <PrimaryBtn
              disabled={!canSubmit}
              icon={<Send size={15} />}
              label="إرسال الطلب"
              onClick={() => {
                onSubmit({ name: name.trim(), phone: phone.trim(), address: address.trim(), pin: pin.trim(), photo });
                setSent(true);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// منتقي الصورة الشخصية - دائرة بمعاينة + أيقونة كاميرا
function PhotoPicker({ photo, onPick, size = 92, inputId = "barber-photo-input" }) {
  const badgeSize = Math.round(size * 0.32);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div
        style={{
          width: size, height: size, borderRadius: "50%", overflow: "hidden",
          background: T.primarySoft, border: `2px solid ${T.primary}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {photo ? (
          <img src={photo} alt="صورة الحلاق" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <User size={Math.round(size * 0.37)} color={T.primary} />
        )}
      </div>
      <label
        htmlFor={inputId}
        style={{
          position: "absolute", bottom: -2, left: -2, width: badgeSize, height: badgeSize, borderRadius: "50%",
          background: T.primary, border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <Camera size={Math.round(badgeSize * 0.47)} color="#fff" />
      </label>
      <input id={inputId} type="file" accept="image/*" onChange={onPick} style={{ display: "none" }} />
    </div>
  );
}

// ================= لوحة الحلاق (حجوزاته) =================
function BarberDashboard({ barber, appointments, onLogout, onTogglePauseToday, onChangePin, onChangePhoto }) {
  const [showPinForm, setShowPinForm] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState(null); // {type:'ok'|'err', text}

  if (!barber) return null;
  const sorted = [...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const today = todayStr();
  const todayAppts = sorted.filter((a) => a.date === today);
  const upcoming = sorted.filter((a) => a.date !== today);
  const isPaused = (barber.pausedDates || []).includes(today);

  const submitPinChange = () => {
    if (oldPin.trim() !== (barber.pin || "")) {
      setPinMsg({ type: "err", text: "الرمز الحالي غلط" });
      return;
    }
    if (newPin.trim().length < 4) {
      setPinMsg({ type: "err", text: "الرمز الجديد لازم 4 أرقام أو أكثر" });
      return;
    }
    onChangePin(newPin.trim());
    setPinMsg({ type: "ok", text: "تم تغيير الرمز بنجاح" });
    setOldPin("");
    setNewPin("");
    setTimeout(() => { setShowPinForm(false); setPinMsg(null); }, 1400);
  };

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", padding: "18px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PhotoPicker
            photo={barber.photo}
            size={52}
            inputId="barber-dash-photo-input"
            onPick={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onChangePhoto(reader.result);
              reader.readAsDataURL(file);
            }}
          />
          <div>
            <div style={{ fontSize: 12, color: T.muted }}>أهلاً بيك</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: T.text }}>{barber.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => setShowPinForm((s) => !s)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 9px", color: T.muted, display: "flex", alignItems: "center" }}>
            <Lock size={15} />
          </button>
          <button onClick={onLogout} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 12px", color: T.muted, fontSize: 12 }}>
            خروج
          </button>
        </div>
      </div>

      {showPinForm && (
        <Card style={{ animation: "fadeSlideUp 0.25s ease" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text, marginBottom: 10 }}>تغيير الرمز السري</div>
          <Field label="الرمز الحالي" value={oldPin} onChange={setOldPin} placeholder="أدخل رمزك الحالي" dir="ltr" />
          <Field label="الرمز الجديد" value={newPin} onChange={setNewPin} placeholder="4 أرقام أو أكثر" dir="ltr" />
          {pinMsg && (
            <div style={{ fontSize: 12, fontWeight: 700, color: pinMsg.type === "ok" ? T.good : T.danger, marginBottom: 8 }}>
              {pinMsg.text}
            </div>
          )}
          <PrimaryBtn label="حفظ الرمز الجديد" onClick={submitPinChange} disabled={!oldPin.trim() || !newPin.trim()} />
        </Card>
      )}

      <div style={{ background: T.primary, borderRadius: 16, padding: 16, color: "#fff", marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, opacity: 0.85 }}>حجوزات اليوم</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>{todayAppts.length}</div>
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: isPaused ? T.dangerSoft : T.goodSoft, border: `1px solid ${isPaused ? T.danger : T.good}44`,
          borderRadius: 14, padding: "12px 14px", marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Power size={18} color={isPaused ? T.danger : T.good} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: isPaused ? T.danger : T.good }}>
              {isPaused ? "الحجز موقف اليوم" : "الحجز شغال اليوم"}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>
              {isPaused ? "الزباين ما يكدرون يحجزون عندك اليوم" : "الزباين يكدرون يحجزون عندك عادي"}
            </div>
          </div>
        </div>
        <button
          onClick={onTogglePauseToday}
          style={{
            background: isPaused ? T.good : T.danger, color: "#fff", border: "none", borderRadius: 10,
            padding: "8px 14px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
          }}
        >
          {isPaused ? "تشغيل" : "إيقاف"}
        </button>
      </div>

      {todayAppts.length > 0 && (
        <>
          <div style={{ fontWeight: 800, fontSize: 14, color: T.text, marginBottom: 8 }}>اليوم</div>
          {todayAppts.map((a) => <ApptCard key={a.id} a={a} />)}
          <div style={{ height: 10 }} />
        </>
      )}

      <div style={{ fontWeight: 800, fontSize: 14, color: T.text, marginBottom: 8 }}>الحجوزات القادمة</div>
      {upcoming.length === 0 && todayAppts.length === 0 && <Empty text="ماكو حجوزات لحد الآن" />}
      {upcoming.length === 0 && todayAppts.length > 0 && <Empty text="ماكو حجوزات قادمة بعد" />}
      {upcoming.map((a) => <ApptCard key={a.id} a={a} />)}
    </div>
  );
}

function ApptCard({ a }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{a.customerName}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2, direction: "ltr", textAlign: "right" }}>{a.customerPhone}</div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 11.5, color: T.muted }}>{a.date}</div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: T.primary }}>{to12h(a.time)}</div>
        </div>
      </div>
    </Card>
  );
}

// ================= مسار الزبون =================
function CustomerFlow({ barbers, appointments, holds, onAddHold, onRemoveHold, onBack, onBook }) {
  const [tab, setTab] = useState("book"); // book | mine
  const [step, setStep] = useState(1);
  const [barber, setBarber] = useState(null);
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [toast, setToast] = useState(null);
  const [myHoldId, setMyHoldId] = useState(null);
  const [justBooked, setJustBooked] = useState(false);

  const days = useMemo(() => nextDays(14), []);
  const activeBarbers = barbers.filter((b) => b.approved && b.active);

  // الأوقات المحجوزة = مواعيد مؤكدة + حجوزات مؤقتة نشطة (غير حجزي الحالي)
  const bookedTimes = useMemo(() => {
    const confirmed = appointments.filter((a) => a.barberId === barber?.id && a.date === date).map((a) => a.time);
    const held = holds.filter((h) => h.barberId === barber?.id && h.date === date && h.id !== myHoldId).map((h) => h.time);
    return new Set([...confirmed, ...held]);
  }, [appointments, holds, barber, date, myHoldId]);

  const releaseMyHold = () => {
    if (myHoldId) {
      onRemoveHold(myHoldId);
      setMyHoldId(null);
    }
  };

  const reset = () => {
    releaseMyHold();
    setStep(1); setBarber(null); setDate(todayStr()); setTime(null); setName(""); setPhone("");
  };

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: T.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Scissors size={19} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 19, color: T.text }}>صالوني</div>
          <div style={{ fontSize: 11.5, color: T.muted }}>احجز موعدك بدون انتظار</div>
        </div>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontSize: 12.5 }}>خروج</button>
      </div>

      <div style={{ flex: 1, padding: "16px 20px 90px", overflowY: "auto" }}>
        {tab === "book" && (
          <>
            {step > 1 && <BackBtn onClick={() => { if (step === 3) releaseMyHold(); setStep((s) => s - 1); }} />}
            {step === 1 && (
              <>
                <SectionTitle title="اختر الحلاق" sub="اختر الحلاق اللي تحب تحجز عنده" />
                {activeBarbers.length === 0 && <Empty text="لا يوجد حلاقين متاحين حالياً" />}
                {activeBarbers.map((b) => (
                  <Card key={b.id} onClick={() => { setBarber(b); setStep(2); }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar photo={b.photo} size={38} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: T.muted, display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={11} /> {b.address}
                        </div>
                      </div>
                      <CallButton phone={b.phone} size="sm" />
                    </div>
                  </Card>
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <SectionTitle title={`موعدك مع ${barber.name}`} sub="اختر اليوم والوقت المناسب" />
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
                  {days.map((d) => {
                    const dd = ds(d);
                    const active = dd === date;
                    return (
                      <button key={dd} onClick={() => { setDate(dd); setTime(null); }} style={{
                        flexShrink: 0, minWidth: 56, padding: "8px 4px", borderRadius: 12,
                        border: `1px solid ${active ? T.primary : T.border}`, background: active ? T.primarySoft : T.card,
                        color: active ? T.primaryDark : T.text, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      }}>
                        <span style={{ fontSize: 10.5, color: T.muted }}>{dayNames[d.getDay()]}</span>
                        <span style={{ fontSize: 15, fontWeight: 800 }}>{d.getDate()}</span>
                        <span style={{ fontSize: 9, color: T.muted }}>{monthNames[d.getMonth()]}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: T.text }}>الوقت</div>
                {(barber.pausedDates || []).includes(date) ? (
                  <div style={{ background: T.dangerSoft, border: `1px solid ${T.danger}44`, borderRadius: 14, padding: 16, textAlign: "center" }}>
                    <Power size={22} color={T.danger} />
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.danger, marginTop: 6 }}>الحلاق موقف الحجز بهذا اليوم</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>جرب تختار يوم ثاني من فوق</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                    {SLOTS.map((t) => {
                      const taken = bookedTimes.has(t);
                      const past = isPastSlot(date, t);
                      const disabled = taken || past;
                      const active = t === time;
                      return (
                        <button key={t} className="slot-btn" disabled={disabled} onClick={() => setTime(t)} style={{
                          padding: "9px 2px", borderRadius: 10, border: `1px solid ${active ? T.primary : T.border}`,
                          background: disabled ? "#F2F2F2" : active ? T.primarySoft : T.card,
                          color: disabled ? "#B7B7B7" : active ? T.primaryDark : T.text,
                          fontSize: disabled ? 10.5 : 12.5, fontWeight: active ? 700 : 500,
                          textDecoration: taken ? "line-through" : "none",
                          transform: active ? "scale(1.04)" : "scale(1)",
                        }}>
                          {past ? "غير متاح" : taken ? "محجوز" : to12h(t)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: 20 }}>
                  <PrimaryBtn
                    disabled={!time}
                    onClick={() => {
                      if (isPastSlot(date, time)) {
                        setToast("هذا الوقت صار غير متاح");
                        setTime(null);
                        return;
                      }
                      if (bookedTimes.has(time)) {
                        setToast("عذراً، هذا الوقت انحجز حالياً");
                        setTime(null);
                        return;
                      }
                      const hold = { id: uid(), barberId: barber.id, date, time, until: Date.now() + 60 * 60 * 1000 };
                      onAddHold(hold);
                      setMyHoldId(hold.id);
                      setStep(3);
                    }}
                    label="متابعة"
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <SectionTitle title="بياناتك" sub="أدخل بياناتك لتأكيد الموعد" />
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar photo={barber.photo} size={34} />
                      <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{barber.name}</span>
                    </div>
                    <CallButton phone={barber.phone} size="sm" />
                  </div>
                  <SummaryRow label="العنوان" value={barber.address} />
                  <SummaryRow label="الموعد" value={`${date} — ${to12h(time)}`} last />
                </Card>
                <div style={{ background: T.primarySoft, border: `1px solid ${T.primary}44`, borderRadius: 10, padding: "8px 12px", fontSize: 11.5, color: T.primaryDark, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={13} /> محجوزلك هذا الوقت مؤقتاً، أكمل بياناتك خلال ساعة قبل ما يفتح لغيرك
                </div>
                <Field label="الاسم" value={name} onChange={setName} placeholder="اسمك الكامل" />
                <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="07xxxxxxxxx" dir="ltr" />
                <div style={{ marginTop: 8 }}>
                  <PrimaryBtn
                    disabled={!name.trim() || !phone.trim()}
                    icon={<Check size={16} />}
                    label="تأكيد الحجز"
                    onClick={() => {
                      const takenByOther = appointments.some((a) => a.barberId === barber.id && a.date === date && a.time === time);
                      if (takenByOther) {
                        setToast("عذراً، هذا الوقت انحجز للتو من شخص ثاني");
                        releaseMyHold();
                        setStep(2);
                        setTime(null);
                        setTimeout(() => setToast(null), 2600);
                        return;
                      }
                      releaseMyHold();
                      onBook({ id: uid(), barberId: barber.id, date, time, customerName: name.trim(), customerPhone: phone.trim() });
                      setJustBooked(true);
                      setTimeout(() => {
                        setJustBooked(false);
                        reset();
                        setTab("mine");
                      }, 1000);
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}

        {tab === "mine" && <MyAppointments appointments={appointments} barbers={barbers} />}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 84, left: "50%", transform: "translateX(-50%)", background: T.danger, color: "#fff", padding: "9px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, animation: "toastSlide 0.25s ease" }}>
          {toast}
        </div>
      )}

      {justBooked && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(30,58,76,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "28px 36px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, animation: "popIn 0.35s ease" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.goodSoft, display: "flex", alignItems: "center", justifyContent: "center", animation: "checkPop 0.4s ease" }}>
              <Check size={30} color={T.good} strokeWidth={3} />
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text }}>تم تأكيد الحجز</div>
          </div>
        </div>
      )}

      <div style={{ position: "sticky", bottom: 0, display: "flex", borderTop: `1px solid ${T.border}`, background: T.card }}>
        {[{ id: "book", label: "الحجز" }, { id: "mine", label: "مواعيدي" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", padding: "10px 0", color: tab === t.id ? T.primary : T.muted, fontWeight: tab === t.id ? 700 : 500, fontSize: 12.5 }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MyAppointments({ appointments, barbers }) {
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);
  const mine = appointments.filter((a) => a.customerPhone === phone.trim()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  return (
    <>
      <SectionTitle title="مواعيدي" sub="أدخل رقم هاتفك لعرض مواعيدك" />
      <div style={{ display: "flex", gap: 8 }}>
        <input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxxx" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
        <button onClick={() => setSearched(true)} style={{ background: T.primary, color: "#fff", border: "none", borderRadius: 10, width: 80, fontWeight: 700, fontSize: 13 }}>بحث</button>
      </div>
      {searched && mine.length === 0 && <div style={{ marginTop: 12 }}><Empty text="لا توجد مواعيد بهذا الرقم" /></div>}
      {searched && mine.map((a) => {
        const b = barbers.find((x) => x.id === a.barberId);
        return (
          <Card key={a.id} style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: T.text }}>{b?.name || "حلاق محذوف"}</div>
                <div style={{ fontSize: 12, color: T.muted, margin: "3px 0" }}>{b?.address}</div>
                <div style={{ fontSize: 12.5, color: T.primary, fontWeight: 700 }}>{a.date} — {to12h(a.time)}</div>
              </div>
              {b?.phone && <CallButton phone={b.phone} size="sm" />}
            </div>
          </Card>
        );
      })}
    </>
  );
}

// ================= لوحة الإدارة =================
function AdminScreen({ barbers, appointments, adminPin, onChangeAdminPin, onBack, onApprove, onToggleActive, onDeleteBarber, onDeleteAppt }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [sub, setSub] = useState("appts");

  if (!unlocked) {
    return (
      <div className="screen-enter" style={{ minHeight: "100vh", padding: "60px 24px", textAlign: "center" }}>
        <Lock size={30} color={T.primary} />
        <h2 style={{ fontSize: 17, margin: "10px 0 2px", color: T.text }}>دخول الإدارة</h2>
        <p style={{ color: T.muted, fontSize: 12.5, marginBottom: 16 }}>أدخل الرمز الخاص بالإدارة</p>
        <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" dir="ltr" style={{ ...inputStyle, textAlign: "center" }} placeholder="الرمز السري" />
        <div style={{ marginTop: 10 }}>
          <PrimaryBtn onClick={() => (pin.trim() === adminPin ? setUnlocked(true) : alert("رمز غير صحيح"))} label="دخول" />
        </div>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, fontSize: 12.5, marginTop: 14 }}>رجوع</button>
      </div>
    );
  }

  const pending = barbers.filter((b) => !b.approved);
  const approved = barbers.filter((b) => b.approved);

  return (
    <div className="screen-enter" style={{ minHeight: "100vh", padding: "18px 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.text }}><X size={20} /></button>
          <div style={{ fontWeight: 700, marginRight: 8, color: T.text }}>لوحة الإدارة</div>
        </div>
        <AdminPinChanger currentPin={adminPin} onChange={onChangeAdminPin} />
      </div>

      <div style={{ display: "flex", gap: 6, background: T.primarySoft, padding: 4, borderRadius: 12, marginBottom: 16 }}>
        {[{ id: "appts", label: "المواعيد" }, { id: "barbers", label: "الحلاقين" }].map((t) => (
          <button key={t.id} onClick={() => setSub(t.id)} style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", background: sub === t.id ? T.primary : "transparent", color: sub === t.id ? "#fff" : T.primaryDark, fontWeight: 700, fontSize: 12.5 }}>
            {t.label}
          </button>
        ))}
      </div>

      {sub === "appts" && (
        <>
          <div style={{ color: T.muted, fontSize: 12.5, marginBottom: 10 }}>{appointments.length} موعد محجوز</div>
          {appointments.length === 0 && <Empty text="لا توجد مواعيد بعد" />}
          {[...appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((a) => {
            const b = barbers.find((x) => x.id === a.barberId);
            return (
              <Card key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.text }}>{a.customerName} <span style={{ color: T.muted, fontWeight: 400 }}>• {a.customerPhone}</span></div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>عند: {b?.name || "محذوف"}</div>
                    <div style={{ fontSize: 12, color: T.primary, fontWeight: 700, marginTop: 3 }}>{a.date} — {to12h(a.time)}</div>
                  </div>
                  <button onClick={() => onDeleteAppt(a.id)} style={iconDangerBtn}><Trash2 size={15} /></button>
                </div>
              </Card>
            );
          })}
        </>
      )}

      {sub === "barbers" && (
        <>
          {pending.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: T.text }}>طلبات انضمام جديدة</span>
                <span style={{ background: T.primary, color: "#fff", fontSize: 11, fontWeight: 800, padding: "1px 7px", borderRadius: 10 }}>{pending.length}</span>
              </div>
              {pending.map((b) => (
                <Card key={b.id} style={{ border: `1px solid ${T.primary}` }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <Avatar photo={b.photo} size={40} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: T.text }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{b.phone}</div>
                      <div style={{ fontSize: 12, color: T.muted }}>{b.address}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onApprove(b.id)} style={{ flex: 1, background: T.primary, color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 13, padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Check size={15} /> موافقة
                    </button>
                    <button onClick={() => onDeleteBarber(b.id)} style={{ ...outlineDangerBtn, padding: "8px 14px" }}>رفض</button>
                  </div>
                </Card>
              ))}
              <div style={{ height: 6 }} />
            </>
          )}

          <div style={{ fontWeight: 800, fontSize: 14, margin: "10px 0 8px", color: T.text }}>الحلاقين</div>
          {approved.map((b) => {
            return (
              <Card key={b.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar photo={b.photo} size={38} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: T.text }}>{b.name}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 8, background: b.active ? T.goodSoft : T.dangerSoft, color: b.active ? T.good : T.danger }}>
                          {b.active ? "مفعّل" : "متوقف"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2 }}>{b.phone} • {b.address}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => onToggleActive(b.id)} style={{ ...iconDangerBtn, background: b.active ? T.goodSoft : T.primarySoft, border: `1px solid ${b.active ? T.good : T.primary}55`, color: b.active ? T.good : T.primary }}>
                      <Power size={15} />
                    </button>
                    <button onClick={() => onDeleteBarber(b.id)} style={iconDangerBtn}><Trash2 size={15} /></button>
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

function AdminPinChanger({ currentPin, onChange }) {
  const [open, setOpen] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [msg, setMsg] = useState(null);

  const submit = () => {
    if (oldPin.trim() !== currentPin) {
      setMsg({ type: "err", text: "الرمز الحالي غلط" });
      return;
    }
    if (newPin.trim().length < 4) {
      setMsg({ type: "err", text: "الرمز الجديد لازم 4 أحرف أو أكثر" });
      return;
    }
    onChange(newPin.trim());
    setMsg({ type: "ok", text: "تم تغيير الرمز" });
    setOldPin("");
    setNewPin("");
    setTimeout(() => { setOpen(false); setMsg(null); }, 1200);
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 10, padding: "7px 9px", color: T.muted, display: "flex", alignItems: "center" }}>
        <Lock size={15} />
      </button>
      {open && (
        <div style={{ position: "absolute", left: 0, top: 40, width: 240, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, boxShadow: "0 8px 24px rgba(30,58,76,0.18)", zIndex: 20, animation: "fadeSlideUp 0.2s ease" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 8 }}>تغيير رمز الإدارة</div>
          <Field label="الرمز الحالي" value={oldPin} onChange={setOldPin} placeholder="الرمز الحالي" dir="ltr" />
          <Field label="الرمز الجديد" value={newPin} onChange={setNewPin} placeholder="4 أحرف أو أكثر" dir="ltr" />
          {msg && <div style={{ fontSize: 11.5, fontWeight: 700, color: msg.type === "ok" ? T.good : T.danger, marginBottom: 8 }}>{msg.text}</div>}
          <PrimaryBtn label="حفظ" onClick={submit} disabled={!oldPin.trim() || !newPin.trim()} />
        </div>
      )}
    </div>
  );
}

// ---------- عناصر مشتركة ----------
function CallButton({ phone, size = "md" }) {
  const dims = size === "sm" ? { w: 30, h: 30, icon: 14 } : { w: 38, h: 38, icon: 16 };
  return (
    <a
      href={`tel:${phone}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: dims.w, height: dims.h, borderRadius: "50%", background: T.good, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none",
      }}
    >
      <Phone size={dims.icon} />
    </a>
  );
}

function Avatar({ photo, size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
      background: T.primarySoft, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {photo ? (
        <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <User size={Math.round(size * 0.45)} color={T.primary} />
      )}
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 17, color: T.text }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
function Card({ children, onClick, style }) {
  return (
    <div className="card-item" onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 14, marginBottom: 10, cursor: onClick ? "pointer" : "default", boxShadow: "0 1px 3px rgba(30,58,76,0.05)", ...style }}>
      {children}
    </div>
  );
}
function SummaryRow({ label, value, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: last ? "none" : `1px solid ${T.border}` }}>
      <span style={{ color: T.muted, fontSize: 13 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{value}</span>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, dir, icon }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: icon ? 34 : 12 }} />
        {icon && <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: T.muted }}>{icon}</div>}
      </div>
    </div>
  );
}
function Empty({ text }) {
  return <div style={{ color: T.muted, fontSize: 13, textAlign: "center", padding: 24 }}>{text}</div>;
}
function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", color: T.muted, display: "flex", alignItems: "center", gap: 2, fontSize: 13, padding: 0, marginBottom: 14 }}>
      <ChevronRight size={16} /> رجوع
    </button>
  );
}
function PrimaryBtn({ onClick, label, icon, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", height: 52, background: T.primary, color: "#fff", border: "none", borderRadius: 14,
        fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon} {label}
    </button>
  );
}
function OutlineBtn({ onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", height: 52, background: "transparent", color: T.primaryDark, border: `1.4px solid ${T.primary}`, borderRadius: 14,
        fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {icon} {label}
    </button>
  );
}

const outlineDangerBtn = {
  background: "transparent",
  border: `1px solid ${T.danger}`,
  color: T.danger,
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 13,
};
const inputStyle = {
  width: "100%",
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "11px 12px",
  color: T.text,
  fontSize: 14,
  outline: "none",
};
const iconDangerBtn = {
  background: T.dangerSoft,
  border: `1px solid ${T.danger}55`,
  borderRadius: 8,
  color: T.danger,
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
