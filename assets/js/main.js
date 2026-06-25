import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, update, onValue, get, runTransaction, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAeHuCrGaIYVxfk7q1WAF2LZyejqhaAeWs",
    authDomain: "mks-quize.firebaseapp.com",
    databaseURL: "https://mks-quize-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mks-quize",
    storageBucket: "mks-quize.firebasestorage.app",
    messagingSenderId: "126371701720",
    appId: "1:126371701720:web:adbe9a8b3cc42a5cd608ad"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// AVATARS
const AVATARS = ['🦁','🐯','🦊','🐼','🐨','🦄','🐰','🐶','🐱','🐭','🐸','🐙','🐒','🐥','🐹','🦝','🦔','🐺','🦋','🐬','🐧','🦀','🐲','🌟'];
let currentAvatarIndex = Math.floor(Math.random() * AVATARS.length);

function buildAvatarGrid() {
    const grid = document.getElementById('avatar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    AVATARS.forEach((av, i) => {
        const btn = document.createElement('button');
        btn.className = 'avatar-btn' + (i === currentAvatarIndex ? ' selected' : '');
        btn.textContent = av;
        btn.onclick = () => selectAvatar(i);
        grid.appendChild(btn);
    });
    document.getElementById('selected-avatar-preview').textContent = AVATARS[currentAvatarIndex];
}

function selectAvatar(i) {
    currentAvatarIndex = i;
    document.querySelectorAll('.avatar-btn').forEach((b, idx) => {
        b.classList.toggle('selected', idx === i);
    });
    document.getElementById('selected-avatar-preview').textContent = AVATARS[i];
}

// LOCAL STORAGE QUIZ LIBRARY
const LS_KEY = 'mks_quizzes_v2';
const DEFAULT_QUIZZES = [
    {
        id: "default-it",
        name: "ทดสอบความรู้ไอทีเบื้องต้น 💻",
        createdAt: Date.now(),
        questions: [
            { q: "พอร์ตมาตรฐานของ HTTPS คืออะไร?", options: ["80","443","8080","21"], correct: 1, timeLimit: 15 },
            { q: "HTML ถือเป็นภาษาโปรแกรมมิ่งหรือไม่?", options: ["ใช่ เป็นภาษา","ไม่ใช่ เป็น Markup","",""], correct: 1, timeLimit: 10 },
            { q: "ข้อใดเป็นโปรโตคอลการเข้ารหัสสมมาตร?", options: ["AES","RSA","ECC","Diffie-Hellman"], correct: 0, timeLimit: 15 }
        ]
    }
];

function getQuizzes() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
        localStorage.setItem(LS_KEY, JSON.stringify(DEFAULT_QUIZZES));
        return DEFAULT_QUIZZES;
    }
    return JSON.parse(raw);
}

function saveQuizzesToStorage(list) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
}

function saveQuizToLibrary(name, questions) {
    const list = getQuizzes();
    const newQ = { id: 'quiz_' + Date.now(), name, questions, createdAt: Date.now() };
    list.push(newQ);
    saveQuizzesToStorage(list);
    renderQuizStudioList();
    return newQ;
}

function updateQuizInLibrary(id, name, questions) {
    const list = getQuizzes();
    const idx = list.findIndex(q => q.id === id);
    if (idx !== -1) {
        list[idx].name = name;
        list[idx].questions = questions;
        saveQuizzesToStorage(list);
        renderQuizStudioList();
    }
}

function deleteQuizFromLibrary(id) {
    let list = getQuizzes().filter(q => q.id !== id);
    saveQuizzesToStorage(list);
    renderQuizStudioList();
}

function renderQuizStudioList() {
    const container = document.getElementById('quiz-list-container');
    if (!container) return;
    container.innerHTML = '';
    const list = getQuizzes();
    document.getElementById('quiz-count').textContent = `${list.length} ชุด`;

    if (list.length === 0) {
        container.innerHTML = `<p class="text-slate-500 text-sm text-center py-10">ยังไม่มีชุดข้อสอบ กด "สร้างใหม่" หรือนำเข้า CSV</p>`;
        return;
    }

    list.forEach(quiz => {
        const item = document.createElement('div');
        item.className = "quiz-item flex justify-between items-center bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 p-3.5 rounded-xl transition";
        item.innerHTML = `
            <div class="min-w-0 mr-3">
                <h4 class="font-bold text-white text-sm truncate">${quiz.name}</h4>
                <p class="text-xs text-slate-500 mt-0.5">${quiz.questions.length} ข้อ · สร้างเมื่อ ${quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('th-TH') : '-'}</p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0 quiz-actions">
                <button class="bg-slate-700 hover:bg-indigo-600 border border-slate-600 text-slate-300 hover:text-white text-xs font-bold py-1.5 px-3 rounded-lg transition" onclick="window.openEditQuizModal('${quiz.id}')">✏️ แก้ไข</button>
                <button class="btn-primary text-xs text-white font-bold py-1.5 px-3 rounded-lg transition" onclick="window.launchQuiz('${quiz.id}')">🎮 เปิดห้อง</button>
                <button class="bg-red-950/40 hover:bg-red-800/60 border border-red-900/30 text-red-400 text-xs font-bold py-1.5 px-2 rounded-lg transition" onclick="window.confirmDeleteQuiz('${quiz.id}')">🗑</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// PASSWORD SYSTEM
const PW_KEY = 'mks_teacher_pw';
function getTeacherPassword() { return localStorage.getItem(PW_KEY) || 'teacher123'; }

window.verifyTeacherLogin = function() {
    const input = document.getElementById('teacher-password-input').value;
    const err = document.getElementById('login-error');
    if (input === getTeacherPassword()) {
        err.classList.add('hidden');
        showScreen('host-studio-screen');
        renderQuizStudioList();
    } else {
        err.classList.remove('hidden');
        document.getElementById('teacher-password-input').value = '';
        document.getElementById('teacher-password-input').focus();
    }
};

window.togglePasswordVisibility = function() {
    const inp = document.getElementById('teacher-password-input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
};

window.openChangePasswordModal = function() { document.getElementById('modal-change-password').classList.remove('hidden'); };

window.doChangePassword = function() {
    const old = document.getElementById('old-password').value;
    const nw = document.getElementById('new-password').value;
    const cn = document.getElementById('confirm-password').value;
    const msg = document.getElementById('pw-change-msg');
    msg.className = 'text-xs rounded-xl py-2 px-3';
    if (old !== getTeacherPassword()) {
        msg.textContent = '❌ รหัสผ่านเดิมไม่ถูกต้อง'; msg.classList.add('bg-red-950/40','text-red-400'); msg.classList.remove('hidden'); return;
    }
    if (nw.length < 4) {
        msg.textContent = '❌ รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร'; msg.classList.add('bg-red-950/40','text-red-400'); msg.classList.remove('hidden'); return;
    }
    if (nw !== cn) {
        msg.textContent = '❌ รหัสผ่านใหม่ไม่ตรงกัน'; msg.classList.add('bg-red-950/40','text-red-400'); msg.classList.remove('hidden'); return;
    }
    localStorage.setItem(PW_KEY, nw);
    msg.textContent = '✅ เปลี่ยนรหัสผ่านสำเร็จ!'; msg.classList.add('bg-emerald-950/40','text-emerald-400'); msg.classList.remove('hidden');
    setTimeout(() => window.closeModal('modal-change-password'), 1500);
};

// MODAL: ADD / EDIT QUIZ
let editingQuizId = null;

window.openAddQuizModal = function() {
    editingQuizId = null;
    document.getElementById('modal-quiz-title').textContent = '✏️ เพิ่มชุดข้อสอบใหม่';
    document.getElementById('modal-quiz-name').value = '';
    document.getElementById('modal-questions-list').innerHTML = '';
    window.addQuestionRow();
    window.addQuestionRow();
    document.getElementById('modal-add-quiz').classList.remove('hidden');
};

window.openEditQuizModal = function(id) {
    const quiz = getQuizzes().find(q => q.id === id);
    if (!quiz) return;
    editingQuizId = id;
    document.getElementById('modal-quiz-title').textContent = `✏️ แก้ไข: ${quiz.name}`;
    document.getElementById('modal-quiz-name').value = quiz.name;
    document.getElementById('modal-questions-list').innerHTML = '';
    quiz.questions.forEach(q => window.addQuestionRow(q));
    document.getElementById('modal-add-quiz').classList.remove('hidden');
};

window.addQuestionRow = function(data = null) {
    const container = document.getElementById('modal-questions-list');
    const rowIdx = container.children.length + 1;
    const row = document.createElement('div');
    row.className = 'question-row bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2';
    row.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-indigo-400">ข้อที่ ${rowIdx}</span>
            <button onclick="this.closest('.question-row').remove(); window.renumberRows()" class="text-slate-600 hover:text-red-400 text-xs transition">✕ ลบ</button>
        </div>
        <input type="text" class="q-text w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-indigo-500 transition" placeholder="คำถาม..." value="${data?.q || ''}">
        <div class="grid grid-cols-2 gap-2">
            <input type="text" class="opt opt-0 bg-slate-950 border border-red-900/40 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-red-500 transition" placeholder="▲ ตัวเลือก 1" value="${data?.options?.[0] || ''}">
            <input type="text" class="opt opt-1 bg-slate-950 border border-blue-900/40 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-blue-500 transition" placeholder="◆ ตัวเลือก 2" value="${data?.options?.[1] || ''}">
            <input type="text" class="opt opt-2 bg-slate-950 border border-yellow-900/40 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-yellow-500 transition" placeholder="● ตัวเลือก 3 (ไม่บังคับ)" value="${data?.options?.[2] || ''}">
            <input type="text" class="opt opt-3 bg-slate-950 border border-green-900/40 rounded-lg py-1.5 px-2.5 text-xs focus:outline-none focus:border-green-500 transition" placeholder="■ ตัวเลือก 4 (ไม่บังคับ)" value="${data?.options?.[3] || ''}">
        </div>
        <div class="flex gap-3 items-center">
            <label class="text-xs text-slate-400 shrink-0">ตอบถูก:</label>
            <select class="correct-sel bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 text-xs focus:outline-none flex-1">
                <option value="0" ${data?.correct === 0 ? 'selected' : ''}>▲ ตัวเลือก 1</option>
                <option value="1" ${data?.correct === 1 ? 'selected' : ''}>◆ ตัวเลือก 2</option>
                <option value="2" ${data?.correct === 2 ? 'selected' : ''}>● ตัวเลือก 3</option>
                <option value="3" ${data?.correct === 3 ? 'selected' : ''}>■ ตัวเลือก 4</option>
            </select>
            <label class="text-xs text-slate-400 shrink-0">เวลา:</label>
            <select class="time-sel bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2 text-xs focus:outline-none">
                <option value="5" ${data?.timeLimit===5?'selected':''}>5 วิ</option>
                <option value="10" ${data?.timeLimit===10?'selected':''}>10 วิ</option>
                <option value="15" ${!data || data?.timeLimit===15?'selected':''}>15 วิ</option>
                <option value="20" ${data?.timeLimit===20?'selected':''}>20 วิ</option>
                <option value="30" ${data?.timeLimit===30?'selected':''}>30 วิ</option>
            </select>
        </div>
    `;
    container.appendChild(row);
};

window.renumberRows = function() {
    document.querySelectorAll('#modal-questions-list .question-row').forEach((r, i) => {
        const label = r.querySelector('span.text-xs');
        if (label) label.textContent = `ข้อที่ ${i + 1}`;
    });
};

window.saveQuizFromModal = function() {
    const name = document.getElementById('modal-quiz-name').value.trim();
    if (!name) { showToast('❌ กรุณาใส่ชื่อชุดข้อสอบ'); return; }
    const rows = document.querySelectorAll('#modal-questions-list .question-row');
    if (rows.length === 0) { showToast('❌ กรุณาเพิ่มอย่างน้อย 1 ข้อ'); return; }
    const questions = [];
    for (const row of rows) {
        const q = row.querySelector('.q-text').value.trim();
        if (!q) { showToast('❌ กรุณากรอกคำถามให้ครบทุกข้อ'); return; }
        const opts = ['opt-0','opt-1','opt-2','opt-3'].map(c => row.querySelector('.'+c).value.trim());
        const correct = parseInt(row.querySelector('.correct-sel').value);
        const timeLimit = parseInt(row.querySelector('.time-sel').value);
        questions.push({ q, options: opts, correct, timeLimit });
    }
    if (editingQuizId) {
        updateQuizInLibrary(editingQuizId, name, questions);
        showToast('✅ อัปเดตชุดข้อสอบสำเร็จ');
    } else {
        saveQuizToLibrary(name, questions);
        showToast('✅ บันทึกชุดข้อสอบสำเร็จ');
    }
    window.closeModal('modal-add-quiz');
};

window.confirmDeleteQuiz = function(id) {
    const q = getQuizzes().find(x => x.id === id);
    if (q && confirm(`ต้องการลบ "${q.name}" ออกจากระบบหรือไม่?`)) {
        deleteQuizFromLibrary(id);
        showToast('🗑 ลบชุดข้อสอบแล้ว');
    }
};

window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); };

// AUDIO: Procedural Suspense BGM (Safeguarded Context)
let audioCtx = null;
let bgmInterval = null;
let synthStep = 0;
let currentScaleNotes = [110, 130.81, 146.83, 164.81];
let isTenseBgmActive = false;

function initAudio() {
    try {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.error("Audio Web API initialization blocked or failed.", e);
    }
}

function randomizeScale() {
    const scales = [
        [110, 123.47, 138.59, 164.81],
        [116.54, 138.59, 155.56, 174.61],
        [98, 116.54, 130.81, 155.56],
        [103.83, 123.47, 138.59, 155.56]
    ];
    currentScaleNotes = scales[Math.floor(Math.random() * scales.length)];
    synthStep = 0;
}

function startBGM() {
    stopBGM();
    initAudio();
    isTenseBgmActive = false;
    const statEl = document.getElementById('bgm-status');
    if (statEl) statEl.textContent = '🎵 Active';
    
    if (!audioCtx) return; // fail-safe if Audio is strictly blocked

    bgmInterval = setInterval(() => {
        if (audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(currentScaleNotes[synthStep % currentScaleNotes.length], now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now); osc.stop(now + 0.35);
            
            if (synthStep % 4 === 3) {
                const hiOsc = audioCtx.createOscillator();
                const hiGain = audioCtx.createGain();
                hiOsc.connect(hiGain); hiGain.connect(audioCtx.destination);
                hiOsc.type = 'sine';
                hiOsc.frequency.setValueAtTime(currentScaleNotes[(synthStep+2) % currentScaleNotes.length] * 2, now);
                hiGain.gain.setValueAtTime(0.04, now);
                hiGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                hiOsc.start(now); hiOsc.stop(now + 0.2);
            }
            synthStep++;
        } catch (e) {
            // Ignore sub-errors preventing crash loop
        }
    }, 400);
}

function speedUpBGM() {
    stopBGM();
    initAudio();
    isTenseBgmActive = true;
    const statEl = document.getElementById('bgm-status');
    if (statEl) statEl.textContent = '⚡ Tense!';

    if (!audioCtx) return;

    bgmInterval = setInterval(() => {
        if (audioCtx.state === 'suspended') return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(currentScaleNotes[synthStep % currentScaleNotes.length] * 1.5, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now); osc.stop(now + 0.15);
            synthStep++;
        } catch (e) {}
    }, 170);
}

function stopBGM() {
    if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    const statEl = document.getElementById('bgm-status');
    if (statEl) statEl.textContent = '⏸ Stop';
}

function playSound(type) {
    initAudio();
    if (!audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'correct') {
            osc.type = 'sine';
            [523.25, 659.25, 783.99].forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.08));
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        } else if (type === 'incorrect') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'tick') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'gameover') {
            osc.type = 'triangle';
            [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => osc.frequency.setValueAtTime(f, now + i * 0.1));
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.start(now); osc.stop(now + 0.7);
        }
    } catch(e) {}
}

// QR CODE & LINK
let currentJoinUrl = '';

function generateLobbyQR(pin) {
    const container = document.getElementById('lobby-qrcode');
    container.innerHTML = '';
    currentJoinUrl = `${window.location.origin}${window.location.pathname}?pin=${pin}`;
    document.getElementById('current-page-url').textContent = currentJoinUrl;

    new QRCode(container, {
        text: currentJoinUrl, width: 140, height: 140,
        colorDark: "#0a0f1e", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    container.onclick = window.openQRZoom;
    const btnZoom = document.getElementById('btn-zoom-qr');
    if (btnZoom) btnZoom.onclick = window.openQRZoom;

    document.getElementById('btn-copy-link').onclick = () => {
        navigator.clipboard.writeText(currentJoinUrl);
        showToast('✅ คัดลอกลิงก์แล้ว!');
    };
    document.getElementById('btn-copy-url-text').onclick = () => {
        navigator.clipboard.writeText(currentJoinUrl);
        showToast('✅ คัดลอก URL แล้ว!');
    };
}

window.openQRZoom = function() {
    const overlay = document.getElementById('qr-zoom-overlay');
    const zoomContainer = document.getElementById('qr-zoom-code');
    zoomContainer.innerHTML = '';
    overlay.classList.remove('hidden');
    document.getElementById('qr-zoom-url').textContent = currentJoinUrl;
    new QRCode(zoomContainer, {
        text: currentJoinUrl, width: 300, height: 300,
        colorDark: "#0a0f1e", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    document.getElementById('qr-zoom-copy').onclick = () => {
        navigator.clipboard.writeText(currentJoinUrl);
        showToast('✅ คัดลอกลิงก์แล้ว!');
    };
};

window.closeQRZoom = function() {
    document.getElementById('qr-zoom-overlay').classList.add('hidden');
};

function checkUrlParams() {
    const p = new URLSearchParams(window.location.search).get('pin');
    if (p) {
        currentRole = 'player';
        buildAvatarGrid();
        showScreen('player-join-screen');
        document.getElementById('player-pin-input').value = p;
        document.getElementById('player-name-input').focus();
    }
}

// STATE
let currentRole = null;
let currentPin = null;
let currentPlayerId = null;
let lastSeenState = null;
let lastSeenQIndex = -1;
let hostTimerInterval = null;
let activeQuizQuestions = [];
let questionAnswerHistory = {}; 
let currentQuestionStartTime = 0;
let roomListenerUnsub = null;
let lobbyListenerUnsub = null;

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function showToast(msg) {
    const existing = document.querySelector('.copy-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'copy-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
}

// EVENT LISTENERS & DOM SETUP (Safe execution)
window.addEventListener('DOMContentLoaded', () => {
    buildAvatarGrid();
    checkUrlParams();
    if (!document.getElementById('player-join-screen').classList.contains('hidden')) return;
    showScreen('teacher-login-screen');

    // Host - Create Dummy Data
    document.getElementById('btn-create-dummy-quiz')?.addEventListener('click', () => {
        saveQuizToLibrary("วิวัฒนาการคอมพิวเตอร์ 💻", [
            { q: "ใครพัฒนาภาษา HTML?", options: ["Tim Berners-Lee","Bill Gates","Dennis Ritchie","Linus Torvalds"], correct: 0, timeLimit: 15 },
            { q: "จริงหรือเท็จ: Bitcoin เป็นระบบกระจายศูนย์?", options: ["จริง","เท็จ","",""], correct: 0, timeLimit: 10 },
            { q: "ภาษาหลักจัดโครงสร้างรูปแบบเว็บไซต์คือ?", options: ["HTML","JavaScript","Python","CSS"], correct: 3, timeLimit: 15 }
        ]);
        showToast('✅ โหลดชุดตัวอย่างสำเร็จ');
    });

    // Host - CSV Input
    document.getElementById('input-excel-file')?.addEventListener('change', e => {
        handleCSVFile(e.target.files[0]);
        e.target.value = '';
    });

    // Host - CSV Drag Drop
    const dropZone = document.getElementById('csv-drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) handleCSVFile(file);
            else showToast('❌ กรุณาลากไฟล์ .csv เท่านั้น');
        });
    }

    document.getElementById('btn-download-template')?.addEventListener('click', () => {
        const csv = "\uFEFFQuestion,Option 1,Option 2,Option 3,Option 4,Correct Answer (1-4),Time Limit (seconds)\n"
            + "คอมพิวเตอร์ประมวลผลด้วยรหัสอะไร,เลขฐานสอง,เลขฐานแปด,เลขสิบหก,ตัวอักษร,1,15\n"
            + "จริงหรือเท็จ: CPU คือสมองของคอมพิวเตอร์,จริง,เท็จ,,,1,10\n"
            + "Port ของ MySQL คือ,80,443,3306,8080,3,15";
        const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'quiz_template.csv';
        a.click();
    });

    document.getElementById('btn-cancel-lobby')?.addEventListener('click', () => {
        if (confirm('ยืนยันปิดห้องและกลับคลังข้อสอบ?')) {
            remove(ref(db, `rooms/${currentPin}`));
            stopBGM();
            if (roomListenerUnsub) { roomListenerUnsub(); roomListenerUnsub = null; }
            if (lobbyListenerUnsub) { lobbyListenerUnsub(); lobbyListenerUnsub = null; }
            showScreen('host-studio-screen');
            renderQuizStudioList();
        }
    });

    // ==========================================
    // CRITICAL FIX: Host click Start Game
    // ==========================================
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
        initAudio(); // Force audio init on direct user click
        // Update specific room node instead of root ref to prevent permission/crash issues
        update(ref(db, `rooms/${currentPin}`), {
            state: 'question',
            currentQuestionIndex: 0,
            questionStartTime: Date.now()
        }).catch(err => {
            console.error("Firebase Update Failed:", err);
            showToast('❌ ขัดข้อง: ไม่สามารถเริ่มเกมได้');
        });
    });

    document.getElementById('btn-skip-question')?.addEventListener('click', () => {
        clearInterval(hostTimerInterval);
        transitionToLeaderboard();
    });

    document.getElementById('btn-next-question')?.addEventListener('click', () => {
        get(ref(db, `rooms/${currentPin}`)).then(snap => {
            const room = snap.val();
            const nextIdx = room.currentQuestionIndex + 1;
            if (nextIdx < room.questions.length) {
                const updates = {};
                Object.keys(room.players || {}).forEach(pid => {
                    updates[`rooms/${currentPin}/players/${pid}/answered`] = false;
                    updates[`rooms/${currentPin}/players/${pid}/lastAnswerCorrect`] = false;
                    updates[`rooms/${currentPin}/players/${pid}/pointsGained`] = 0;
                    updates[`rooms/${currentPin}/players/${pid}/selectedOptionIndex`] = -1;
                });
                updates[`rooms/${currentPin}/state`] = 'question';
                updates[`rooms/${currentPin}/currentQuestionIndex`] = nextIdx;
                updates[`rooms/${currentPin}/questionStartTime`] = Date.now();
                update(ref(db), updates);
            } else {
                update(ref(db, `rooms/${currentPin}`), { state: 'ended' });
            }
        });
    });

    document.getElementById('btn-export-results')?.addEventListener('click', () => {
        get(ref(db, `rooms/${currentPin}`)).then(snap => {
            const room = snap.val();
            if (!room || !room.players) { showToast('❌ ไม่มีข้อมูลผู้เล่น'); return; }
            const sorted = Object.values(room.players).sort((a, b) => b.score - a.score);
            let csv = "\uFEFFอันดับ,ชื่อ,อวาตาร์,คะแนน\n";
            sorted.forEach((p, i) => { csv += `${i+1},${p.nickname},${p.avatar || ''},${p.score}\n`; });
            const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `quiz_results_${currentPin}.csv`;
            a.click();
            showToast('✅ Export สำเร็จ');
        });
    });

    document.getElementById('btn-clear-history')?.addEventListener('click', () => {
        if (confirm('ยืนยันล้างข้อมูลผู้เล่นทั้งหมดหรือไม่?')) {
            remove(ref(db, `rooms/${currentPin}/players`)).then(() => {
                showToast('✅ ล้างข้อมูลแล้ว');
                showScreen('host-studio-screen');
                renderQuizStudioList();
            });
        }
    });

    document.getElementById('btn-restart-host')?.addEventListener('click', () => {
        showScreen('host-studio-screen');
        renderQuizStudioList();
    });

    document.getElementById('btn-join-game')?.addEventListener('click', () => {
        initAudio(); // Required to unlock sound for player
        const pin = document.getElementById('player-pin-input').value.trim();
        const nickname = document.getElementById('player-name-input').value.trim();
        if (!pin || !nickname) { showToast('❌ กรุณากรอก PIN และชื่อ'); return; }

        get(ref(db, `rooms/${pin}`)).then(snap => {
            if (!snap.exists()) { showToast('❌ ไม่พบห้องนี้'); return; }
            const room = snap.val();
            if (room.state !== 'lobby') { showToast('❌ เกมเริ่มไปแล้ว'); return; }

            currentPin = pin;
            currentPlayerId = 'player_' + Math.random().toString(36).substr(2, 9);
            currentRole = 'player';

            set(ref(db, `rooms/${pin}/players/${currentPlayerId}`), {
                nickname, avatar: AVATARS[currentAvatarIndex],
                score: 0, answered: false, lastAnswerCorrect: false,
                pointsGained: 0, selectedOptionIndex: -1
            }).then(() => {
                document.getElementById('player-lobby-avatar').textContent = AVATARS[currentAvatarIndex];
                document.getElementById('player-lobby-name').textContent = nickname;
                showScreen('player-lobby-screen');
                listenToRoomEvents(pin);
            });
        });
    });

    document.querySelectorAll('.btn-answer-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const selectedOpt = parseInt(btn.getAttribute('data-opt'));
            get(ref(db, `rooms/${currentPin}`)).then(snap => {
                const room = snap.val();
                if (room.state !== 'question') return;
                document.querySelectorAll('.btn-answer-opt').forEach(b => { b.disabled = true; b.classList.add('opacity-30'); });
                document.getElementById('player-locked-msg').classList.remove('hidden');
                const currentQ = room.questions[room.currentQuestionIndex];
                const isCorrect = selectedOpt === currentQ.correct;
                let points = 0;
                if (isCorrect) {
                    const elapsed = (Date.now() - room.questionStartTime) / 1000;
                    const ratio = Math.max(0, Math.min(1, 1 - elapsed / currentQ.timeLimit));
                    points = Math.round(500 + 500 * ratio);
                }
                playSound('tick');
                runTransaction(ref(db, `rooms/${currentPin}/players/${currentPlayerId}`), pd => {
                    if (pd) {
                        pd.answered = true;
                        pd.lastAnswerCorrect = isCorrect;
                        pd.pointsGained = points;
                        pd.score = (pd.score || 0) + points;
                        pd.selectedOptionIndex = selectedOpt;
                    }
                    return pd;
                });
            });
        });
    });

    document.getElementById('btn-restart-player')?.addEventListener('click', () => {
        currentRole = null; currentPin = null; currentPlayerId = null;
        lastSeenState = null; lastSeenQIndex = -1;
        buildAvatarGrid();
        showScreen('player-join-screen');
    });

});

// CSV Handling Helper
function handleCSVFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const lines = evt.target.result.split('\n');
            const questions = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cells = parseCSVLine(line);
                if (cells.length < 6) continue;
                questions.push({
                    q: cells[0].replace(/"/g,'').trim(),
                    options: [
                        cells[1].replace(/"/g,'').trim(),
                        cells[2].replace(/"/g,'').trim(),
                        (cells[3] || '').replace(/"/g,'').trim(),
                        (cells[4] || '').replace(/"/g,'').trim()
                    ],
                    correct: parseInt(cells[5].trim()) - 1,
                    timeLimit: parseInt(cells[6]?.trim()) || 15
                });
            }
            if (questions.length === 0) { showToast('❌ ไม่พบข้อมูลที่ถูกต้อง'); return; }
            const name = file.name.replace('.csv','') + ' (CSV)';
            saveQuizToLibrary(name, questions);
            showToast(`✅ นำเข้า ${questions.length} ข้อสำเร็จ`);
        } catch (err) {
            showToast('❌ เกิดข้อผิดพลาดในการอ่านไฟล์');
        }
    };
    reader.readAsText(file, 'UTF-8');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === ',' && !inQuotes) { result.push(current); current = ''; }
        else { current += line[i]; }
    }
    result.push(current);
    return result;
}

window.launchQuiz = function(id) {
    const quiz = getQuizzes().find(q => q.id === id);
    if (!quiz) return;
    activeQuizQuestions = quiz.questions;
    questionAnswerHistory = {};
    quiz.questions.forEach((_, i) => { questionAnswerHistory[i] = { correct: 0, wrong: 0, totalTime: 0, count: 0 }; });

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentPin = pin;
    currentRole = 'host';

    set(ref(db, 'rooms/' + pin), {
        state: 'lobby',
        currentQuestionIndex: 0,
        questionStartTime: 0,
        questions: activeQuizQuestions,
        players: {}
    }).then(() => {
        document.getElementById('host-pin-display').textContent = pin;
        generateLobbyQR(pin);
        showScreen('host-lobby-screen');
        
        if (lobbyListenerUnsub) lobbyListenerUnsub();
        lobbyListenerUnsub = onValue(ref(db, `rooms/${pin}/players`), snap => renderHostLobby(snap.val() || {}));
        
        listenToRoomEvents(pin);
    });
};

function renderHostLobby(players) {
    const grid = document.getElementById('player-list-grid');
    const list = Object.values(players);
    document.getElementById('player-count').textContent = list.length;
    if (list.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-slate-600 text-xs flex items-center justify-center h-full">รอผู้เล่นเข้าร่วม...</p>`;
        return;
    }
    grid.innerHTML = '';
    list.forEach(p => {
        const card = document.createElement('div');
        card.className = "bg-slate-800/70 border border-slate-700 p-2 rounded-xl flex items-center gap-2 text-sm font-bold truncate";
        card.innerHTML = `<span>${p.avatar || '🐯'}</span><span class="truncate text-slate-200">${p.nickname}</span>`;
        grid.appendChild(card);
    });
}

function listenToRoomEvents(pin) {
    if (roomListenerUnsub) roomListenerUnsub();
    roomListenerUnsub = onValue(ref(db, `rooms/${pin}`), snap => {
        const room = snap.val();
        if (!room) return;
        if (currentRole === 'host') handleHostRoomUpdate(room);
        else if (currentRole === 'player') handlePlayerRoomUpdate(room);
    });
}

// CRITICAL FIX: Safe execution for DOM elements
function handleHostRoomUpdate(room) {
    const { state, currentQuestionIndex: qIndex, questions, players } = room;
    const currentQ = questions ? questions[qIndex] : null;

    if (state === 'question' && currentQ) {
        if (lastSeenState !== 'question' || lastSeenQIndex !== qIndex) {
            showScreen('host-question-screen');
            currentQuestionStartTime = room.questionStartTime;
            const total = questions.length;
            
            const elIndex = document.getElementById('host-q-index');
            const elTotal = document.getElementById('host-q-total');
            const elProgress = document.getElementById('host-progress-fill');
            const elQuestion = document.getElementById('host-question-text');
            
            if (elIndex) elIndex.textContent = qIndex + 1;
            if (elTotal) elTotal.textContent = total;
            if (elProgress) elProgress.style.width = `${((qIndex) / total) * 100}%`;
            if (elQuestion) elQuestion.textContent = currentQ.q;
            
            const opts = currentQ.options || [];
            const elOpt0 = document.getElementById('opt-text-0');
            const elOpt1 = document.getElementById('opt-text-1');
            if (elOpt0) elOpt0.textContent = opts[0] || '-';
            if (elOpt1) elOpt1.textContent = opts[1] || '-';
            
            const hasOpt23 = opts[2] || opts[3];
            const cont2 = document.getElementById('container-opt-2');
            const cont3 = document.getElementById('container-opt-3');
            if (cont2) cont2.classList.toggle('hidden', !hasOpt23);
            if (cont3) cont3.classList.toggle('hidden', !hasOpt23);
            if (hasOpt23) {
                const elOpt2 = document.getElementById('opt-text-2');
                const elOpt3 = document.getElementById('opt-text-3');
                if (elOpt2) elOpt2.textContent = opts[2] || '';
                if (elOpt3) elOpt3.textContent = opts[3] || '';
            }

            isTenseBgmActive = false;
            randomizeScale();
            startBGM();
            runHostTimer(currentQ.timeLimit);

            for (let i = 0; i < 4; i++) {
                const barOpt = document.getElementById(`bar-opt-${i}`);
                const barCount = document.getElementById(`bar-count-${i}`);
                if (barOpt) barOpt.style.height = '2px';
                if (barCount) barCount.textContent = '0';
            }
        }
        updateRealtimeBars(players, questions, qIndex);
    } else if (state === 'leaderboard') {
        if (lastSeenState !== 'leaderboard') {
            clearInterval(hostTimerInterval);
            stopBGM();
            showScreen('host-leaderboard-screen');
            renderLeaderboard(players);
        }
    } else if (state === 'ended') {
        if (lastSeenState !== 'ended') {
            clearInterval(hostTimerInterval);
            stopBGM();
            showScreen('host-end-screen');
            renderPodium(players);
            renderPremiumAnalytics(room);
            playSound('gameover');
        }
    }
    lastSeenState = state;
    lastSeenQIndex = qIndex;
}

function updateRealtimeBars(players, questions, qIndex) {
    if (!players) return;
    const plist = Object.values(players);
    const total = plist.length;
    const answered = plist.filter(p => p.answered).length;
    
    const ansCount = document.getElementById('host-answers-count');
    const totCount = document.getElementById('host-total-count');
    if (ansCount) ansCount.textContent = answered;
    if (totCount) totCount.textContent = total;

    const counts = [0, 0, 0, 0];
    plist.forEach(p => { if (p.answered && p.selectedOptionIndex >= 0) counts[p.selectedOptionIndex]++; });

    const maxCount = Math.max(...counts, 1);
    for (let i = 0; i < 4; i++) {
        const pct = (counts[i] / maxCount) * 75;
        const bOpt = document.getElementById(`bar-opt-${i}`);
        const bCnt = document.getElementById(`bar-count-${i}`);
        if (bOpt) bOpt.style.height = `${Math.max(pct, 2)}px`;
        if (bCnt) bCnt.textContent = counts[i];
    }

    if (answered === total && total > 0 && lastSeenState === 'question') {
        const correct = plist.filter(p => p.answered && p.lastAnswerCorrect).length;
        const wrong = total - correct;
        if (questionAnswerHistory[qIndex]) {
            questionAnswerHistory[qIndex].correct = correct;
            questionAnswerHistory[qIndex].wrong = wrong;
            questionAnswerHistory[qIndex].count = total;
        }
        transitionToLeaderboard();
    }
}

function runHostTimer(seconds) {
    clearInterval(hostTimerInterval);
    let t = seconds;
    const el = document.getElementById('host-timer');
    if (!el) return;
    el.textContent = t;
    el.classList.remove('timer-critical');

    hostTimerInterval = setInterval(() => {
        t--;
        el.textContent = t;
        if (t <= 5 && !isTenseBgmActive) {
            speedUpBGM();
            el.classList.add('timer-critical');
        }
        if (t <= 0) { clearInterval(hostTimerInterval); transitionToLeaderboard(); }
    }, 1000);
}

function transitionToLeaderboard() {
    clearInterval(hostTimerInterval);
    stopBGM();
    update(ref(db, `rooms/${currentPin}`), { state: 'leaderboard' });
}

function renderLeaderboard(players) {
    const container = document.getElementById('host-leaderboard-list');
    if (!container) return;
    if (!players) { container.innerHTML = ''; return; }
    const sorted = Object.values(players).sort((a, b) => b.score - a.score).slice(0, 8);
    container.innerHTML = '';
    sorted.forEach((p, i) => {
        const medals = ['🥇','🥈','🥉'];
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-900/50 border border-slate-800 px-4 py-3 rounded-xl";
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xl w-7 text-center">${medals[i] || `<span class="text-sm font-bold text-slate-500">${i+1}</span>`}</span>
                <span class="text-2xl">${p.avatar || '🐯'}</span>
                <span class="font-bold text-white">${p.nickname}</span>
            </div>
            <span class="text-indigo-300 font-black text-xl tabular-nums">${p.score}</span>
        `;
        container.appendChild(div);
    });
}

function handlePlayerRoomUpdate(room) {
    const { state, currentQuestionIndex: qIndex, questions, players } = room;
    const me = players?.[currentPlayerId];
    if (!me) return;

    if (state === 'lobby') {
        showScreen('player-lobby-screen');
    } else if (state === 'question') {
        if (lastSeenState !== 'question' || lastSeenQIndex !== qIndex) {
            showScreen('player-question-screen');
            const lockedMsg = document.getElementById('player-locked-msg');
            if (lockedMsg) lockedMsg.classList.add('hidden');
            const currentQ = questions[qIndex];
            
            document.querySelectorAll('.btn-answer-opt').forEach((btn, idx) => {
                btn.disabled = false;
                btn.classList.remove('opacity-30');
                const textSpan = btn.querySelector('.opt-text-player');
                if (textSpan) textSpan.textContent = currentQ.options[idx] || '';
                const noOpt = idx >= 2 && !currentQ.options[2] && !currentQ.options[3];
                btn.classList.toggle('hidden', noOpt);
            });
        }
    } else if (state === 'leaderboard') {
        if (lastSeenState !== 'leaderboard') {
            const fbCard = document.getElementById('feedback-card');
            document.getElementById('feedback-total-score').textContent = me.score;
            document.getElementById('feedback-gained-score').textContent = `+${me.pointsGained}`;
            const allPlayers = Object.values(players).sort((a, b) => b.score - a.score);
            const myRank = allPlayers.findIndex(p => p.nickname === me.nickname) + 1;
            document.getElementById('feedback-rank').textContent = `#${myRank}`;
            if (me.lastAnswerCorrect) {
                if (fbCard) fbCard.className = "rounded-3xl p-8 border transition bg-emerald-900/60 border-emerald-700";
                document.getElementById('feedback-icon').textContent = '🎉';
                document.getElementById('feedback-title').textContent = 'ตอบถูก!';
                playSound('correct');
            } else {
                if (fbCard) fbCard.className = "rounded-3xl p-8 border transition bg-red-900/60 border-red-700";
                document.getElementById('feedback-icon').textContent = '❌';
                document.getElementById('feedback-title').textContent = 'ยังไม่ถูกต้อง';
                playSound('incorrect');
            }
            showScreen('player-feedback-screen');
        }
    } else if (state === 'ended') {
        if (lastSeenState !== 'ended') {
            const allPlayers = Object.values(players).sort((a, b) => b.score - a.score);
            const myRank = allPlayers.findIndex(p => p.nickname === me.nickname) + 1;
            document.getElementById('player-final-avatar').textContent = me.avatar || '🏆';
            document.getElementById('player-final-rank').textContent = `#${myRank}`;
            document.getElementById('player-final-score').textContent = `${me.score} แต้ม`;
            showScreen('player-end-screen');
        }
    }
    lastSeenState = state;
    lastSeenQIndex = qIndex;
}

function renderPodium(players) {
    if (!players) return;
    const sorted = Object.values(players).sort((a, b) => b.score - a.score);
    [1, 2, 3].forEach(rank => {
        const p = sorted[rank - 1];
        const aEl = document.getElementById(`podium-${rank}-avatar`);
        const nEl = document.getElementById(`podium-${rank}-name`);
        const sEl = document.getElementById(`podium-${rank}-score`);
        if (aEl) aEl.textContent = p?.avatar || '';
        if (nEl) nEl.textContent = p?.nickname || '-';
        if (sEl) sEl.textContent = p ? `${p.score} pts` : '0 pts';
    });
}

function renderPremiumAnalytics(room) {
    const { players, questions } = room;
    const plist = Object.values(players || {});
    if (plist.length === 0 || questions.length === 0) return;

    const stats = questions.map((q, i) => ({
        q: q.q,
        idx: i,
        correct: questionAnswerHistory[i]?.correct || 0,
        wrong: questionAnswerHistory[i]?.wrong || 0,
        total: questionAnswerHistory[i]?.count || plist.length
    }));

    const hardest = stats.reduce((a, b) => b.wrong > a.wrong ? b : a, stats[0]);
    if (hardest.wrong > 0) {
        document.getElementById('hardest-question-box').classList.remove('hidden');
        document.getElementById('hardest-question-text').textContent = `ข้อ ${hardest.idx + 1}: "${hardest.q}"`;
        document.getElementById('hardest-wrong-count').textContent = `✗ ตอบผิด ${hardest.wrong} คน`;
        document.getElementById('hardest-correct-count').textContent = `✓ ตอบถูก ${hardest.correct} คน`;
    }

    document.getElementById('speed-stats-box').classList.remove('hidden');
    const fastestPlayers = [...plist].sort((a, b) => b.score - a.score).slice(0, 3);
    document.getElementById('speed-stats-content').innerHTML = fastestPlayers.map((p, i) =>
        `<div class="flex justify-between text-xs"><span>${['🥇','🥈','🥉'][i]} ${p.avatar} ${p.nickname}</span><span class="text-indigo-300 font-bold">${p.score} pts</span></div>`
    ).join('');

    document.getElementById('all-question-stats').classList.remove('hidden');
    document.getElementById('all-question-stats-list').innerHTML = stats.map(s => {
        const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
        const color = pct >= 70 ? 'bg-emerald-600' : pct >= 40 ? 'bg-yellow-600' : 'bg-red-600';
        return `
            <div class="flex items-center gap-3 text-xs">
                <span class="shrink-0 text-slate-400 w-6 text-right">${s.idx+1}.</span>
                <span class="flex-1 text-slate-300 truncate">${s.q}</span>
                <div class="w-24 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0">
                    <div class="${color} h-full rounded-full" style="width:${pct}%"></div>
                </div>
                <span class="text-slate-400 shrink-0 w-10 text-right">${pct}%</span>
            </div>
        `;
    }).join('');
}
