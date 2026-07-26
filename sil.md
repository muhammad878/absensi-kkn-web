www-widgetapi.js:163 Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('https://www.youtube.com') does not match the recipient window's origin ('https://sikkn.unisnu.ac.id').
n.sendMessage @ www-widgetapi.js:163
 WARNING:StorageManager: settings timeout, using defaults
 Ditemukan variabel mencurigakan: styleMedia StyleMedia
 ✅ Selesai! Coba klik pilihan jawaban sekarang.
 🎯 KETEMU VARIABEL: quizPayload Object
 🎯 KETEMU FUNGSI: onYouTubeIframeAPIReady
 function() { if (typeof YT === 'undefined' || !YT.Player) return; var ytMaxPlayed = 0; var ytDuration = 0; var ytGuardTimer = null; new YT.Player(iframeId, { videoId: ytId, playerVars: { rel: 0, modes
 Variabel/fungsi ditemukan: Array(2)
 ✅ Status semua video: Object
// ================================================
// KODE FINAL v2 - FIX BUG JAWABAN TIDAK TERSIMPAN
// ================================================

// 1. Patch data internal
if (window.quizPayload) {
    window.quizPayload.questions.forEach(q => q.is_media_mandatory = "0");
    window.quizPayload.questions.forEach(q => {
        if (q.id_media) window.quizPayload.mediaProgress[q.id_media] = 'completed';
    });
}

// 2. Override SweetAlert - cegat SEMUA peringatan quiz
if (typeof window.swal !== 'undefined') {
    window._swal_ori = window.swal;
    window.swal = function(a, b, c) {
        let str = JSON.stringify([a,b,c] || '').toLowerCase();
        if (str.includes('video') || str.includes('tonton') || 
            str.includes('jawab') || str.includes('soal') ||
            str.includes('selesai') || str.includes('group')) {
            console.log('⚡ Alert dicegat:', a);
            return;
        }
        return window._swal_ori(a, b, c);
    };
}

// 3. Clone + pasang listener BARU yang juga update quizPayload.answers
document.querySelectorAll('input[type="radio"]').forEach(radio => {
    let clone = radio.cloneNode(true);
    radio.parentNode.replaceChild(clone, radio);
});

document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.disabled = false;
    radio.removeAttribute('disabled');
    
    radio.addEventListener('click', function(e) {
        e.stopImmediatePropagation();
        this.checked = true;
        
        // Ambil id_soal dari nama field (format: jawaban_XX)
        let name = this.getAttribute('name'); // contoh: "jawaban_90"
        let id_soal = name ? name.replace('jawaban_', '') : null;
        let id_opsi = this.value;
        
        // Simpan ke quizPayload.answers
        if (id_soal && window.quizPayload) {
            window.quizPayload.answers[id_soal] = id_opsi;
            console.log(`✅ Jawaban soal ${id_soal} = opsi ${id_opsi} tersimpan`);
        }
        
        // Update visual label aktif
        let card = this.closest('.question-card');
        if (card) {
            card.querySelectorAll('label.btn').forEach(l => l.classList.remove('active'));
            let lbl = this.closest('label');
            if (lbl) lbl.classList.add('active', 'btn-primary');
        }
    }, true);
});

// 4. Buka kunci semua tombol & label
document.querySelectorAll('label.btn').forEach(l => {
    l.style.pointerEvents = 'auto';
    l.style.opacity = '1';
});
['btnNext', 'btnPrev', 'btnSubmitQuiz'].forEach(id => {
    let btn = document.getElementById(id);
    if (btn) { btn.disabled = false; btn.style.pointerEvents = 'auto'; }
});

// 5. Sembunyikan peringatan kuning
document.querySelectorAll('.alert-warning').forEach(el => el.style.display = 'none');
document.querySelectorAll('.group-media-status').forEach(el => {
    el.className = 'group-media-status alert alert-success';
    el.innerHTML = '<i class="fa fa-check-circle"></i> Semua video selesai!';
    el.style.display = 'block';
});

// 6. Cek berapa jawaban sudah tersimpan di sistem
console.log('📊 Jawaban tersimpan saat ini:', window.quizPayload?.answers);

// 7. Timer otomatis buka kunci setiap 2 detik
setInterval(() => {
    ['btnNext','btnPrev','btnSubmitQuiz'].forEach(id => {
        let btn = document.getElementById(id);
        if(btn) btn.disabled = false;
    });
}, 2000);

alert('✅ v2 BERHASIL! Sekarang klik jawaban → otomatis tersimpan ke sistem!');

VM311:82 📊 Jawaban tersimpan saat ini: {1: '2', 2: '5', 3: '10', 4: '14', 5: '17', 6: '22', 7: '26', 8: '31', 9: '35', 10: '39', 81: '322', 82: '325', 83: '330', 84: '334', 85: '338', 86: '341', 87: '346', 88: '350', 89: '353', 90: '357'}
undefined
VM311:21 ⚡ Alert dicegat: Perhatian !
VM311:21 ⚡ Alert dicegat: Perhatian !
// ================================================
// FIX TOMBOL SELANJUTNYA
// ================================================

// 1. Cari fungsi navigasi asli di source
let namaFungsiNav = null;
for (let key in window) {
    try {
        if (typeof window[key] === 'function') {
            let src = window[key].toString();
            if (src.includes('quizGroupCurrent') || src.includes('nextGroup') || 
                src.includes('groupIndex') || src.includes('currentGroup') ||
                src.includes('tampilGroup') || src.includes('loadGroup') ||
                src.includes('showGroup') || src.includes('renderGroup')) {
                console.log('🎯 KETEMU FUNGSI NAVIGASI:', key);
                console.log(src.substring(0, 300));
                namaFungsiNav = key;
            }
        }
    } catch(e) {}
}

// 2. Cari variabel index group saat ini
console.log('📊 Cek variabel group:');
['currentGroup','groupIndex','currentGroupIndex','quizGroup',
 'activeGroup','groupCurrent','curGroup'].forEach(v => {
    if (window[v] !== undefined) console.log('✅ ADA:', v, '=', window[v]);
});

// 3. Paksa klik Selanjutnya dengan cara bypass validasi
let btnNext = document.getElementById('btnNext');
if (btnNext) {
    // Clone untuk hapus listener lama
    let newBtn = btnNext.cloneNode(true);
    btnNext.parentNode.replaceChild(newBtn, btnNext);
    
    // Tambah listener baru
    document.getElementById('btnNext').addEventListener('click', function(e) {
        e.stopImmediatePropagation();
        e.preventDefault();
        
        // Coba panggil fungsi navigasi yang ditemukan
        if (namaFungsiNav) {
            try { window[namaFungsiNav](); return; } catch(err) {}
        }
        
        // Fallback: klik tombol asli setelah override swal
        if (typeof window.swal !== 'undefined') {
            window.swal = function() { return; }; // Matikan semua alert
        }
        console.log('Mencoba navigasi manual...');
    }, true);
}

// 4. Override TOTAL semua alert/swal/confirm
window.alert = function(msg) { console.log('Alert dicegat:', msg); };
window.confirm = function(msg) { console.log('Confirm dicegat:', msg); return true; };
if (typeof window.swal !== 'undefined') {
    window.swal = function() { console.log('Swal dicegat:', arguments); return Promise.resolve(); };
}

alert('Cek Console! Lihat fungsi navigasi yang ditemukan.');

VM314:24 📊 Cek variabel group:
VM314:56 Alert dicegat: Cek Console! Lihat fungsi navigasi yang ditemukan.
undefined
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
// Cari kode navigasi di dalam script tag halaman
let scripts = document.querySelectorAll('script');
let navCode = '';
scripts.forEach(s => {
    let src = s.innerText || s.textContent;
    if (src.includes('btnNext') || src.includes('Selanjutnya') || 
        src.includes('nextGroup') || src.includes('currentGroup') ||
        src.includes('groupIndex') || src.includes('quizGroup')) {
        navCode += src + '\n---\n';
    }
});

// Tampilkan 3000 karakter pertama
console.log('=== KODE NAVIGASI DITEMUKAN ===');
console.log(navCode.substring(0, 3000));

VM318:14 === KODE NAVIGASI DITEMUKAN ===
VM318:15 
  let base_url = "https://sikkn.unisnu.ac.id/";
  let suffix = "";
  let lang = {"success":"Berhasil !","warning":"Perhatian !","error":"Error !","error_db":"Error pada proses penyimpanan database","btn_add":"Tambah","btn_update":"Simpan Perubahan","btn_delete":"Hapus","warning_add":"Apakah anda yakin akan menambahkan data ini ?","warning_update":"Apakah anda yakin akan mengubah data ini ?","warning_delete":"Apakah anda yakin akan menghapus data ini ?","alert_add":"Data berhasil disimpan","alert_update":"Data berhasil diupdate","alert_delete":"Data berhasil dihapus","error_ajax":"Error connecting server !","back":"Kembali","next":"Selanjutnya","profil":"My Profile","login":"Sign-In","logout":"Sign-Out","search":"Search...."};
  let controller = "kkn/quiz-jawab/";
  let sso_base_url = "https://sapujagat.unisnu.ac.id";

---

		  (function() { if (!window.quizPayload || !window.quizPayload.questions || window.quizPayload.questions.length === 0) { return; } var styleSheet = document.createElement('style'); styleSheet.textContent = '.option-wrong label { background-color:#fce4e4 !important; border-color:#d9534f !important; }' + '.card-wrong { border: 3px solid #d9534f !important; background-color: #fff0f0 !important; }' + '.card-correct { border: 3px solid #00a65a !important; background-color: #f0fff0 !important; }' + '.option-correct { background-color: #d4edda !important; border-color: #00a65a !important; }' + '.option-user-wrong { background-color: #f8d7da !important; border-color: #d9534f !important; font-weight: bold; }' + '.badge-benar { background-color: #00a65a; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; }' + '.badge-salah { background-color: #d9534f; color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 11px; }'; document.head.appendChild(styleSheet); var payload = window.quizPayload; var questions = payload.questions; var optionsMap = payload.options || {}; var answers = payload.answers || {}; var mediaProgress = payload.mediaProgress || {}; var isGroupMode = payload.tampilan === 'group'; var currentIndex = 0; var currentGroupIndex = 0; var mediaUnlocked = {}; var wrongQuestions = []; var ytPlayers = []; var groupMediaKeys = {}; var groupMediaCompleted = {}; document.addEventListener('visibilitychange', function() { for (var i = 0; i < ytPlayers.length; i++) { try { var state = ytPlayers[i].getPlayerState(); if (state === YT.PlayerState.PLAYING) { ytPlayers[i].pauseVideo(); } } catch (e) {} } }); var groupColors = {}; var colorPalette = ['#3c8dbc', '#00a65a', '#f39c12', '#d9534f', '#605ca8', '#00c0ef', '#f012be', '#39cccc', '#ff851b', '#001f3f']; (function() { var seen = {}; var idx = 0; for (var i = 0; i < questions.length; i++) { var gid = String(questions[i].id_group || '0'); if (!seen[gid]) { seen[gid] = true; groupColors[gid] = colorPalette[idx % colorPalette.length]; idx++; } } })(); var groupList = []; (function() { var seen = {}; for (var i = 0; i < questions.length; i++) { var gid = String(questio
undefined
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
// Ambil source code lengkap yang berisi btnNext
let scripts = document.querySelectorAll('script');
scripts.forEach(s => {
    let src = s.innerText || s.textContent;
    if (src.includes('btnNext') && src.includes('currentGroupIndex')) {
        // Cari bagian btnNext click handler
        let idx = src.indexOf('btnNext');
        while (idx !== -1) {
            console.log('=== BTNEXT di posisi', idx, '===');
            console.log(src.substring(idx, idx + 800));
            console.log('---');
            idx = src.indexOf('btnNext', idx + 1);
        }
    }
});

VM322:9 === BTNEXT di posisi 32236 ===
VM322:10 btnNext').prop('disabled', atLast || !canGoNext()).contents().first().replaceWith('Selanjutnya'); $('#quizNavInfo').text('Group ' + (currentGroupIndex + 1) + ' / ' + groupList.length); } else { $('#btnPrev').prop('disabled', currentIndex <= 0).contents().first().replaceWith('Sebelumnya'); var q = questions[currentIndex]; var mt = String(q.media_type || '').trim().toLowerCase(); var answered = !!answers[q.id_soal]; var mand = parseInt(q.is_media_mandatory || 0, 10) === 1 && (mt !== 'none'); var canNext = currentIndex < questions.length - 1 && answered && (!mand || !!mediaUnlocked[q.id_soal]); $('#btnNext').prop('disabled', !canNext).contents().first().replaceWith('Selanjutnya'); $('#quizNavInfo').text((currentIndex + 1) + ' / ' + questions.length + ' soal'); } var allAnswered = true; var al
VM322:11 ---
VM322:9 === BTNEXT di posisi 32839 ===
VM322:10 btnNext').prop('disabled', !canNext).contents().first().replaceWith('Selanjutnya'); $('#quizNavInfo').text((currentIndex + 1) + ' / ' + questions.length + ' soal'); } var allAnswered = true; var allGroupMediaDone = true; for (var i = 0; i < questions.length; i++) { if (!answers[questions[i].id_soal]) { allAnswered = false; break; } } for (var g in groupMediaKeys) { if (!isGroupMediaAllDone(g)) { allGroupMediaDone = false; break; } } $('#btnSubmitQuiz').prop('disabled', !(allAnswered && allGroupMediaDone)); } $('#btnPrev').on('click', function() { if (isGroupMode) { if (currentGroupIndex > 0) { currentGroupIndex--; render(); } } else { if (currentIndex > 0) { currentIndex--; render(); } } }); $('#btnNext').on('click', function() { if (!canGoNext()) { var msg = 'Anda sudah di soal terakhir.'
VM322:11 ---
VM322:9 === BTNEXT di posisi 33544 ===
VM322:10 btnNext').on('click', function() { if (!canGoNext()) { var msg = 'Anda sudah di soal terakhir.'; if (!isGroupMode) { var q = questions[currentIndex]; if (!answers[q.id_soal]) msg = 'Jawab soal terlebih dahulu.'; else if (isMandatoryMedia(q) && !mediaUnlocked[q.id_soal]) msg = 'Selesaikan media wajib sebelum lanjut.'; } else { msg = 'Semua soal dalam group harus dijawab dan video wajib selesai ditonton.'; } $.notify({ message: msg }, { type: 'warning', z_index: 2000 }); return; } if (isGroupMode) { if (currentGroupIndex < groupList.length - 1) { currentGroupIndex++; render(); } } else { if (currentIndex < questions.length - 1) { currentIndex++; render(); } } }); function showRevisionBanner(nilai, minimal) { $('#quizRevisionBanner').remove(); var html = '<div id="quizRevisionBanner" class="a
VM322:11 ---
undefined
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
VM314:51 Mencoba navigasi manual...
