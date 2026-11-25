/* ─── KoMo SCRIPTS ───────────────────────────────────────── */

const video         = document.getElementById('video');
const canvas        = document.getElementById('canvas');
const gallery       = document.getElementById('gallery');
const photoPreview  = document.getElementById('photoPreview');
const journalEntries= document.getElementById('journalEntries');

let currentPhoto  = "";
let currentFilter = "none";

/* default moods that always appear */
const DEFAULT_MOODS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '🥹', label: 'Touched' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '😡', label: 'Angry' },
  { emoji: '💜', label: 'Loved' },
];

const MOOD_MESSAGES = {
  '😊': "You are feeling happy today 🌸 That's beautiful!",
  '🥹': "You need a warm hug 💜 You're not alone.",
  '😴': "Rest well ☁️ You deserve a break.",
  '😡': "Take a deep breath 🌿 Your feelings are valid.",
  '💜': "You are so loved today 💖 Don't forget that.",
};

/* ─── SCROLL FADE-IN ANIMATIONS ─────────────────────────── */

function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-up');
  if (typeof IntersectionObserver === 'undefined') {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollAnimations);

/* ─── CAMERA ─────────────────────────────────────────────── */

async function startCamera() {
  if (!video) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
  } catch (error) {
    showToast("Camera access denied 😢 Please allow camera in browser settings.");
  }
}

function setFilter(filter, btn) {
  currentFilter = filter;
  if (video) video.style.filter = filter;

  if (btn) {
    document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active-filter'));
    btn.classList.add('active-filter');
  }
}

function takePhoto() {
  if (!canvas || !video) return;

  const context = canvas.getContext('2d');
  canvas.width  = video.videoWidth  || 400;
  canvas.height = video.videoHeight || 300;

  context.filter = currentFilter;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL('image/png');
  currentPhoto = imageData;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;display:inline-block;';

  const img = document.createElement('img');
  img.src = imageData;
  img.title = 'Click to download';
  img.style.cursor = 'pointer';
  img.onclick = () => downloadPhoto(imageData);

  wrapper.appendChild(img);

  if (gallery) {
    gallery.appendChild(wrapper);
    wrapper.style.animation = 'slideIn 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  }

  showToast("Photo taken! 📸 Click it to download.");
}

function downloadPhoto(dataURL) {
  const link = document.createElement('a');
  link.href     = dataURL;
  link.download = `komo-memory-${Date.now()}.png`;
  link.click();
}

function saveToJournal() {
  if (currentPhoto === "") {
    showToast("Take a photo first 📸");
    return;
  }

  if (!photoPreview) {
    sessionStorage.setItem('komoPhoto', currentPhoto);
    showToast("Photo saved! Go to Journal to attach it 📔");
    return;
  }

  photoPreview.innerHTML = `
    <img
      src="${currentPhoto}"
      style="
        width: 220px;
        border-radius: 20px;
        margin-top: 20px;
        border: 10px solid white;
        box-shadow: 0 10px 20px rgba(0,0,0,0.08);
        animation: slideIn 0.4s ease;
      "
    >
    <p style="font-size:13px;color:#7a6f9a;margin-top:8px;font-style:italic;">📸 Photo will be included in your memory</p>
  `;

  showToast("Photo added to your journal! 🌸");
}

/* ─── MOODS (default + custom) ───────────────────────────── */

function getAllMoods() {
  const custom = (window.KomoStore ? KomoStore.getCustomMoods() : []) || [];
  return { defaults: DEFAULT_MOODS, custom };
}

function renderMoods() {
  const moodRow = document.getElementById('moodRow');
  if (!moodRow) return;

  const { defaults, custom } = getAllMoods();
  moodRow.innerHTML = '';

  const makeBtn = (mood, isCustom) => {
    const wrap = document.createElement('div');
    wrap.className = 'mood-btn-wrap';
    wrap.innerHTML = `
      <button type="button" onclick="selectMood(this)" data-label="${escapeHtml(mood.label)}"${isCustom ? ' data-custom="1"' : ''}>${mood.emoji}</button>
      <span>${escapeHtml(mood.label)}</span>
      ${isCustom ? `<button class="mood-remove" type="button" title="Remove" onclick="removeCustomMood(event,'${escapeHtml(mood.emoji)}')">✕</button>` : ''}
    `;
    return wrap;
  };

  defaults.forEach(m => moodRow.appendChild(makeBtn(m, false)));
  custom.forEach(m => moodRow.appendChild(makeBtn(m, true)));

  // the "add your own" button
  const addWrap = document.createElement('div');
  addWrap.className = 'mood-btn-wrap';
  addWrap.innerHTML = `
    <button type="button" class="mood-add" onclick="openMoodPicker()" title="Add your own mood">➕</button>
    <span>Custom</span>
  `;
  moodRow.appendChild(addWrap);
}

function selectMood(button) {
  document.querySelectorAll('.moods button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mood-btn-wrap').forEach(b => b.classList.remove('active'));

  button.classList.add('active');
  const wrap = button.closest('.mood-btn-wrap');
  if (wrap) wrap.classList.add('active');

  const mood = button.innerText;
  const moodTextEl = document.getElementById('moodText');
  if (!moodTextEl) return;

  let message = MOOD_MESSAGES[mood];
  if (!message) {
    const label = button.getAttribute('data-label') || 'something special';
    message = `Feeling ${label.toLowerCase()} today ✨ Your feelings are valid 💜`;
  }

  moodTextEl.innerHTML = message;
  moodTextEl.style.transform = 'scale(1.05)';
  moodTextEl.style.transition = '0.2s';
  setTimeout(() => { moodTextEl.style.transform = 'scale(1)'; }, 200);
}

/* ─── CUSTOM MOOD PICKER ─────────────────────────────────── */

const EMOJI_PALETTE = ['🥰','🤗','😌','😎','🥳','🤩','😭','😔','😰','🫠','🥺','😤','🤔','😇','🌈','⭐','🔥','🌙','🍀','🦋','🐱','🌻','🫶','💫'];

function openMoodPicker() {
  let modal = document.getElementById('moodPickerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'moodPickerModal';
    modal.className = 'komo-auth-overlay';
    modal.innerHTML = `
      <div class="komo-auth-box mood-picker-box">
        <button class="komo-auth-close" type="button" onclick="closeMoodPicker()">✕</button>
        <div class="komo-auth-logo">🎨</div>
        <h3 class="komo-auth-title">Make Your Own Mood</h3>
        <p class="komo-auth-sub">Pick an emoji that feels like you today 🌸</p>

        <div class="emoji-palette" id="emojiPalette"></div>

        <div class="mood-picker-fields">
          <label>Your emoji
            <input type="text" id="customEmojiInput" maxlength="4" placeholder="😊 type or pick above">
          </label>
          <label>Mood name
            <input type="text" id="customLabelInput" maxlength="18" placeholder="e.g. Cozy, Excited, Calm">
          </label>
        </div>
        <p class="komo-auth-error" id="moodPickerError"></p>
        <button class="komo-auth-submit" type="button" onclick="saveCustomMood()">Add This Mood 💜</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeMoodPicker(); });

    const pal = modal.querySelector('#emojiPalette');
    EMOJI_PALETTE.forEach(em => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emoji-pick';
      b.textContent = em;
      b.onclick = () => {
        document.getElementById('customEmojiInput').value = em;
        pal.querySelectorAll('.emoji-pick').forEach(x => x.classList.remove('chosen'));
        b.classList.add('chosen');
      };
      pal.appendChild(b);
    });
  }
  document.getElementById('moodPickerError').textContent = '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMoodPicker() {
  const modal = document.getElementById('moodPickerModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function saveCustomMood() {
  const emoji = (document.getElementById('customEmojiInput').value || '').trim();
  const label = (document.getElementById('customLabelInput').value || '').trim();
  const errEl = document.getElementById('moodPickerError');

  if (!emoji) { errEl.textContent = 'Pick or type an emoji first 🎨'; return; }
  if (!label) { errEl.textContent = 'Give your mood a little name 🌷'; return; }

  const custom = KomoStore.getCustomMoods();
  if (custom.some(m => m.emoji === emoji) || DEFAULT_MOODS.some(m => m.emoji === emoji)) {
    errEl.textContent = 'That emoji is already one of your moods 💭';
    return;
  }
  custom.push({ emoji, label });
  KomoStore.saveCustomMoods(custom);
  renderMoods();
  closeMoodPicker();
  document.getElementById('customEmojiInput').value = '';
  document.getElementById('customLabelInput').value = '';
  showToast(`Added ${emoji} ${label} to your moods! 🌸`);
}

function removeCustomMood(event, emoji) {
  event.stopPropagation();
  const custom = KomoStore.getCustomMoods().filter(m => m.emoji !== emoji);
  KomoStore.saveCustomMoods(custom);
  renderMoods();
  showToast('Mood removed 🌿');
}

/* ─── JOURNAL (with saving per account) ──────────────────── */

function formatDate(dateISO) {
  return dateISO
    ? new Date(dateISO + 'T00:00').toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
    : 'No date selected';
}

function createEntryElement(entry) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('journal-card');
  wrapper.dataset.id = entry.id;

  wrapper.innerHTML = `
    <div class="entry-inner">
      ${entry.moodEmoji ? `<span class="mood-tag">${entry.moodEmoji} ${escapeHtml(entry.moodMsg || '')}</span>` : ''}
      <h3 class="entry-date">📅 ${escapeHtml(entry.dateFormatted)}</h3>
      <p class="entry-text">${escapeHtml(entry.text)}</p>
      ${entry.photo ? `<img class="entry-photo" src="${entry.photo}">` : ''}
      <div class="entry-actions">
        <button class="entry-btn entry-del" onclick="deleteEntry(this)">🗑 Delete Memory</button>
        <button class="entry-btn entry-share" onclick="shareByEmail(this)">📧 Send to Friend</button>
      </div>
    </div>
  `;
  return wrapper;
}

function renderAllEntries() {
  if (!journalEntries) return;
  const entries = KomoStore.getEntries();
  journalEntries.innerHTML = '';
  if (!entries.length) {
    journalEntries.innerHTML = `<p class="journal-empty">No memories yet — write your first one above 🌸</p>`;
    return;
  }
  // newest first
  entries.slice().reverse().forEach(entry => {
    journalEntries.appendChild(createEntryElement(entry));
  });
}

function saveJournal() {
  const text = document.getElementById('journalText')?.value;
  const date = document.getElementById('journalDate')?.value;

  if (!text || text.trim() === "") {
    showToast("Write something first 🌸");
    return;
  }

  const activeBtn  = document.querySelector('.moods button.active');
  const moodEmoji  = activeBtn ? activeBtn.innerText : '';
  const moodMsg    = document.getElementById('moodText')?.innerText || '';

  const photoImg = document.querySelector('#photoPreview img');
  const photoSrc = photoImg ? photoImg.src : '';

  const entry = {
    id: 'e' + Date.now() + Math.random().toString(36).slice(2, 6),
    dateISO: date || '',
    dateFormatted: formatDate(date),
    text: text.trim(),
    moodEmoji,
    moodMsg,
    photo: photoSrc,
    createdAt: new Date().toISOString()
  };

  const entries = KomoStore.getEntries();
  entries.push(entry);
  KomoStore.saveEntries(entries);
  renderAllEntries();

  // Clear form
  if (document.getElementById('journalText')) document.getElementById('journalText').value = "";
  if (document.getElementById('journalDate'))  document.getElementById('journalDate').value  = new Date().toISOString().split('T')[0];
  if (document.getElementById('moodText'))     document.getElementById('moodText').innerHTML  = "";
  if (photoPreview) photoPreview.innerHTML = "";
  document.querySelectorAll('.moods button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mood-btn-wrap').forEach(b => b.classList.remove('active'));

  const where = (window.KomoAuth && KomoAuth.isLoggedIn()) ? 'your account' : 'this browser';
  showToast(`Memory saved to ${where}! 💜✨`);
}

function shareByEmail(button) {
  const card = button.closest('.journal-card');
  if (!card) return;

  const dateEl = card.querySelector('.entry-date');
  const textEl = card.querySelector('.entry-text');
  const moodEl = card.querySelector('.mood-tag');
  const imgEl  = card.querySelector('.entry-photo');

  const date   = dateEl ? dateEl.innerText.replace('📅 ', '') : '';
  const text   = textEl ? textEl.innerText : '';
  const mood   = moodEl ? moodEl.innerText : '';
  const imgSrc = imgEl ? imgEl.src : '';

  const subject = encodeURIComponent(`💜 A memory from KoMo — ${date}`);

  let body = `Haii! 🌸 I wanted to share a memory with you from KoMo 💜

📅 ${date}
${mood ? `Mood: ${mood}\n` : ''}
${text}`;

  if (imgSrc && imgSrc.startsWith('data:')) {
    body += `\n\n📸 [Photo attached - view in original KoMo app]`;
  }

  body += `\n\n— Sent with love from KoMo ✨`;

  const encodedBody = encodeURIComponent(body);

  const friendEmail = prompt("Enter your friend's email address 💌");
  if (!friendEmail || friendEmail.trim() === '') {
    showToast("Email cancelled 😊");
    return;
  }

  window.location.href = `mailto:${friendEmail.trim()}?subject=${subject}&body=${encodedBody}`;
  showToast("Opening friends email ... 📧✨");
}

function deleteEntry(button) {
  const card = button.closest('.journal-card');
  if (!card) return;
  const id = card.dataset.id;

  card.style.opacity    = "0";
  card.style.transform  = "scale(0.9) translateY(-10px)";
  card.style.transition = "0.3s ease";

  setTimeout(() => {
    const entries = KomoStore.getEntries().filter(e => e.id !== id);
    KomoStore.saveEntries(entries);
    renderAllEntries();
  }, 300);

  showToast("Memory deleted 🌿");
}

/* ─── JOURNAL BANNER (guest vs logged in) ────────────────── */

function renderJournalBanner() {
  const banner = document.getElementById('journalBanner');
  if (!banner) return;

  if (window.KomoAuth && KomoAuth.isLoggedIn()) {
    const user = KomoAuth.currentUser();
    banner.className = 'journal-banner logged-in';
    banner.innerHTML = `<span>💜 Hi ${escapeHtml(user.name.split(' ')[0])}! Your memories are safely saved to your account.</span>`;
  } else {
    banner.className = 'journal-banner guest';
    banner.innerHTML = `
      <span>🌸 You're journaling as a guest. Make an account to keep your memories safe forever!</span>
      <button type="button" onclick="openAuthModal('signup')">Save My Memories 💜</button>
    `;
  }
}

/* ─── TOAST NOTIFICATION ─────────────────────────────────── */

function showToast(msg) {
  const existing = document.querySelector('.komo-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'komo-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: rgba(143,114,218,0.96);
    color: white;
    padding: 14px 28px;
    border-radius: 50px;
    font-family: 'Fredoka', sans-serif;
    font-size: 16px;
    font-weight: 500;
    z-index: 9999;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 28px rgba(143,114,218,0.4);
    transition: opacity 0.4s ease, transform 0.4s ease;
    opacity: 0;
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}
window.showToast = showToast;

/* ─── HELPERS ─────────────────────────────────────────────── */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── PAGE LOAD ──────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // photo coming over from Memory Lane
  const savedPhoto = sessionStorage.getItem('komoPhoto');
  if (savedPhoto && photoPreview) {
    photoPreview.innerHTML = `
      <img src="${savedPhoto}" style="width:220px;border-radius:20px;margin-top:20px;border:10px solid white;box-shadow:0 10px 20px rgba(0,0,0,0.08);">
      <p style="font-size:13px;color:#7a6f9a;margin-top:8px;font-style:italic;">📸 Photo from Memory Lane added!</p>
    `;
    sessionStorage.removeItem('komoPhoto');
  }

  // default today's date
  const dateInput = document.getElementById('journalDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // journal page setup
  renderMoods();
  renderAllEntries();
  renderJournalBanner();
});

// when the user logs in/out, reload their journal + moods + banner
document.addEventListener('komo:authchange', () => {
  renderMoods();
  renderAllEntries();
  renderJournalBanner();
});

/* ─── DROPDOWN CLICK TO OPEN/CLOSE ──────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dropdown').forEach(drop => {
    const btn = drop.querySelector('.dropbtn');
    if (!btn) return;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      drop.classList.toggle('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
  });
});
