// ============================================================
// app.js — منطق الشات بوت الصوتي (يعمل في المتصفح)
// ============================================================

const micBtn = document.getElementById("micBtn");
const micIcon = document.getElementById("micIcon");
const chatLog = document.getElementById("chatLog");
const statusText = document.getElementById("statusText");

// عنوان الخادم الخلفي الذي يستدعي ASAC بأمان (انظر api/chat.php)
// مسار نسبي حتى يعمل تلقائيًا مهما كان اسم النطاق على InfinityFree
const BACKEND_URL = "api/ASAC4.php";

// اللغة المستخدمة للتعرف على الصوت وللنطق


let isListening = false;

// --------------------------------------------------------
// 1) إعداد التعرف على الصوت (Speech-to-Text)
// --------------------------------------------------------
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognitionAPI) {
  statusText.textContent = "متصفحك لا يدعم التعرف على الصوت. جرّب Chrome أو Edge.";
  micBtn.disabled = true;
} else {
  const recognition = new SpeechRecognitionAPI();
  recognition.lang = navigator.language || "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch (err) {
      console.error("تعذر بدء الاستماع:", err);
    }
  });

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    micIcon.textContent = "⏹️";
    statusText.textContent = "أستمع الآن... تحدّث بحرية";
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    micIcon.textContent = "🎤";
    statusText.textContent = "اضغط على الميكروفون وابدأ الحديث";
  };

  recognition.onerror = (event) => {
    console.error("خطأ في التعرف على الصوت:", event.error);
    statusText.textContent = "لم أستطع سماعك، حاول مرة أخرى";
  };

  recognition.onresult = async (event) => {
    const userText = event.results[0][0].transcript;
    if (!userText) return;

    addMessage("user", userText);
    const thinkingEl = addMessage("bot", "ASAC يفكر...", { thinking: true });

    try {
      const reply = await askASAC(userText);
      thinkingEl.remove();
      addMessage("bot", reply);
      speak(reply);
    } catch (err) {
      console.error(err);
      thinkingEl.remove();
      addMessage("bot", "تعذر على ASAC الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    }
  };
}

// --------------------------------------------------------
// 2) الاتصال بالخادم الخلفي الذي يستدعي ASAC
//    (لا نستدعي ASAC مباشرة من المتصفح لحماية مفتاح الـ API)
// --------------------------------------------------------
async function askASAC(prompt) {
  const res = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error(`فشل الطلب: ${res.status}`);
  }

  const data = await res.json();
  return data.reply || "لم يصل رد من الخادم.";
}

// --------------------------------------------------------
// 3) تحويل النص إلى كلام (Text-to-Speech)
// --------------------------------------------------------
function speak(text) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // اختيار اللغة حسب محتوى النص
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  utterance.lang = hasArabic ? "ar-SA" : "en-US";

  utterance.rate = 0.95;

  window.speechSynthesis.speak(utterance);
}

// --------------------------------------------------------
// أدوات مساعدة لواجهة الدردشة
// --------------------------------------------------------
function addMessage(role, text, opts = {}) {
  const el = document.createElement("div");
  el.className = `message ${role}${opts.thinking ? " thinking" : ""}`;
  const p = document.createElement("p");
  p.textContent = text;
  el.appendChild(p);
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
  return el;
}