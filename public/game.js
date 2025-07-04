/**
 * HAFIZH GAMES - game.js
 * Versi: 12.1
 * Deskripsi: PERBAIKAN KRITIS - Mengatasi masalah AudioContext dan error loading suara.
 * - Memastikan AudioContext dimulai HANYA setelah klik pengguna.
 * - Membuat game tetap berjalan meskipun file suara gagal dimuat (error 404).
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elemen DOM
    const chatContainer = document.getElementById('chat-container');
    const statusDiv = document.getElementById('status');
    const headerSubtitle = document.getElementById('header-subtitle');
    const prizeList = document.getElementById('prize-list');
    
    const startScreen = document.getElementById('start-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const gameLayout = document.getElementById('game-layout');

    // Helper function untuk jeda
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // Konfigurasi Hadiah
    const prizeTiers = [
        { value: 100000, label: "Rp 100.000" }, { value: 200000, label: "Rp 200.000" },
        { value: 300000, label: "Rp 300.000" }, { value: 500000, label: "Rp 500.000" },
        { value: 1000000, label: "Rp 1.000.000", safe: true }, { value: 2000000, label: "Rp 2.000.000" },
        { value: 4000000, label: "Rp 4.000.000" }, { value: 8000000, label: "Rp 8.000.000" },
        { value: 16000000, label: "Rp 16.000.000" }, { value: 32000000, label: "Rp 32.000.000", safe: true },
        { value: 64000000, label: "Rp 64.000.000" }, { value: 125000000, label: "Rp 125.000.000" },
        { value: 250000000, label: "Rp 250.000.000" }, { value: 500000000, label: "Rp 500.000.000" },
        { value: 1000000000, label: "Rp 1 Miliar", safe: true }
    ];

    let gameState = {
        level: 0,
        currentQuestion: null,
        isGameOver: false,
        isPlaying: false,
    };

    let sounds;
    let audioReady = false;

    // PERBAIKAN: Fungsi setupAudio dibuat lebih tangguh
    function setupAudio() {
        try {
            // URL file suara perlu diperbaiki jika masih 404
            sounds = {
                correct: new Tone.Player("https://firebasestorage.googleapis.com/v0/b/rasa-426813.appspot.com/o/correct.mp3?alt=media&token=404f2a11-5e20-411a-b054-325b51a84f50").toDestination(),
                wrong: new Tone.Player("https://firebasestorage.googleapis.com/v0/b/rasa-426813.appspot.com/o/wrong.mp3?alt=media&token=3852899a-3286-4448-a0b4-7b44383a54d4").toDestination(),
                wait: new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination()
            };
            // Cek apakah buffer suara berhasil dimuat
            Promise.all([sounds.correct.loaded, sounds.wrong.loaded]).then(() => {
                console.log("File suara berhasil dimuat.");
                audioReady = true;
            }).catch(() => {
                console.warn("Gagal memuat file suara (mungkin karena error 404). Game akan berjalan tanpa efek suara.");
                audioReady = false; // Pastikan audioReady false jika gagal
            });
        } catch (e) {
            console.error("Gagal menginisialisasi Tone.js:", e);
            audioReady = false;
        }
    }
    
    function speak(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ''));
        utterance.lang = 'id-ID';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    function init() {
        populatePrizeList();
        // PERBAIKAN: Event listener dipisahkan untuk kejelasan
        startGameBtn.addEventListener('click', async () => {
            // PERBAIKAN KRITIS: Tone.start() dipanggil TEPAT di dalam event click
            try {
                await Tone.start();
                console.log("AudioContext berhasil dimulai oleh pengguna.");
            } catch (e) {
                console.error("Gagal memulai AudioContext:", e);
            }
            // Lanjutkan dengan memulai game
            initializeGame();
        });
    }

    function populatePrizeList() {
        prizeList.innerHTML = '';
        prizeTiers.forEach((tier, index) => {
            const li = document.createElement('li');
            li.className = 'prize-tier';
            li.dataset.level = index;
            li.innerHTML = `<span>${index + 1}</span> <span>${tier.label}</span>`;
            if (tier.safe) li.classList.add('safe-haven');
            prizeList.appendChild(li);
        });
    }

    function initializeGame() {
        startGameBtn.disabled = true;
        startGameBtn.textContent = "Memuat...";
        
        setupAudio(); // Setup audio, tapi tidak memblokir game jika gagal
        
        startScreen.style.display = 'none';
        gameLayout.style.display = 'flex';
        gameState = { level: 0, currentQuestion: null, isGameOver: false, isPlaying: true };
        updateHeader();
        updatePrizeLadderUI();
        fetchNextQuestion();
    }
    
    function displayError(message) {
        chatContainer.innerHTML = '';
        statusDiv.textContent = "";
        const errorBox = `
            <div class="question-box">
                <div class="question-text" style="color: var(--incorrect-answer);">Oops, Terjadi Masalah!</div>
                <div style="text-align:center; font-size: 1.1rem; margin: 15px 0;">${message}</div>
                <div class="choice-container" style="grid-template-columns: 1fr;">
                    <button class="choice-button" onclick="window.location.reload()">COBA LAGI</button>
                </div>
            </div>`;
        chatContainer.innerHTML = errorBox;
        speak(`Oops, terjadi masalah. ${message}`);
    }

    async function fetchNextQuestion() {
        if (gameState.isGameOver) return;
        chatContainer.innerHTML = '';
        statusDiv.textContent = "Bang Hafizh lagi siapin pertanyaan...";
        // PERBAIKAN: Hanya mainkan suara jika audio siap
        if (audioReady && sounds && sounds.wait) {
            sounds.wait.triggerAttackRelease("C4", "8n");
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GET_QUESTION', payload: { level: gameState.level + 1 } }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`Server merespons dengan status ${response.status}`);
            
            gameState.currentQuestion = await response.json();
            statusDiv.textContent = "";
            displayQuestion(gameState.currentQuestion);
            
            const prizeText = prizeTiers[gameState.level].label;
            const questionText = gameState.currentQuestion.question;
            speak(`Pertanyaan untuk ${prizeText}. ${questionText}`);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("Fetch Gagal:", error);
            const errorMessage = error.name === 'AbortError' ? "Bang Hafizh tidak merespons. Mungkin dia sedang sibuk." : "Gagal menghubungi Bang Hafizh. Periksa koneksi internet Anda.";
            displayError(errorMessage + " Silakan coba lagi.");
        }
    }

    function displayQuestion(data) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'ai-message');
        const questionBox = document.createElement('div');
        questionBox.className = 'question-box';
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.innerHTML = data.question;
        const choiceContainer = document.createElement('div');
        choiceContainer.className = 'choice-container';
        data.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.innerHTML = option;
            button.dataset.index = index;
            button.onclick = () => handleAnswer(button);
            choiceContainer.appendChild(button);
        });
        questionBox.appendChild(questionText);
        questionBox.appendChild(choiceContainer);
        messageElement.appendChild(questionBox);
        chatContainer.appendChild(messageElement);
    }

    async function handleAnswer(selectedButton) {
        document.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
        selectedButton.classList.add('selected');
        statusDiv.textContent = "Memeriksa jawaban...";
        await delay(2000);

        const selectedIndex = parseInt(selectedButton.dataset.index);
        const correctIndex = gameState.currentQuestion.correct_answer_index;
        const isCorrect = selectedIndex === correctIndex;

        const correctButton = document.querySelector(`.choice-button[data-index='${correctIndex}']`);
        selectedButton.classList.remove('selected');
        correctButton.classList.add('correct');

        if (isCorrect) {
            // PERBAIKAN: Hanya mainkan suara jika audio siap
            if (audioReady && sounds && sounds.correct) sounds.correct.start();
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            statusDiv.textContent = "BENAR! Jawaban Anda tepat sekali!";
            speak("Benar!");

            if (gameState.level === prizeTiers.length - 1) {
                await delay(2000);
                displayGameOver(true);
            } else {
                displayContinueButton();
            }
        } else {
            selectedButton.classList.add('incorrect');
            // PERBAIKAN: Hanya mainkan suara jika audio siap
            if (audioReady && sounds && sounds.wrong) sounds.wrong.start();
            statusDiv.textContent = "SALAH! Permainan berakhir.";
            speak("Salah!");
            await delay(2000);
            displayGameOver(false);
        }
    }
    
    function displayContinueButton() {
        const questionBox = chatContainer.querySelector('.question-box');
        if (!questionBox) return;

        const continueButton = document.createElement('button');
        continueButton.textContent = 'LANJUTKAN';
        continueButton.className = 'choice-button';
        continueButton.style.marginTop = '20px';
        continueButton.style.gridColumn = '1 / -1';
        continueButton.style.backgroundColor = 'var(--correct-answer)';
        continueButton.style.color = 'white';

        continueButton.onclick = () => {
            gameState.level++;
            updateHeader();
            updatePrizeLadderUI();
            fetchNextQuestion();
        };

        questionBox.appendChild(continueButton);
    }

    function displayGameOver(isWinner) {
        gameState.isGameOver = true;
        gameState.isPlaying = false;
        chatContainer.innerHTML = '';
        let finalPrize = 0;
        for (let i = gameState.level - 1; i >= 0; i--) {
            if (prizeTiers[i].safe) {
                finalPrize = prizeTiers[i].value;
                break;
            }
        }
        if (isWinner) finalPrize = prizeTiers[prizeTiers.length - 1].value;

        const finalPrizeLabel = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(finalPrize);
        const title = isWinner ? "SELAMAT, ANDA MENJADI MILIARDER!" : "GAME OVER";
        const messageText = isWinner ? `Anda berhasil membawa pulang hadiah utama!` : `Anda membawa pulang hadiah sebesar`;

        const message = `
            <div class="question-box">
                <div class="question-text" style="font-size: 1.5rem;">${title}</div>
                <div style="text-align:center; font-size: 1.1rem; margin-bottom: 10px;">${messageText}</div>
                <div style="text-align:center; font-size: 2rem; font-weight: 900; color: var(--correct-answer); margin-bottom: 20px;">${finalPrizeLabel}</div>
                <div class="choice-container" style="grid-template-columns: 1fr;">
                    <button class="choice-button" id="play-again-btn">MAU MAIN LAGI?</button>
                </div>
            </div>`;
        
        chatContainer.innerHTML = message;
        document.getElementById('play-again-btn').onclick = () => {
            window.location.reload();
        };
        speak(`${title}. ${messageText} ${finalPrizeLabel}`);
    }

    function updateHeader() {
        headerSubtitle.textContent = `Pertanyaan ${gameState.level + 1} dari ${prizeTiers.length}`;
    }

    function updatePrizeLadderUI() {
        document.querySelectorAll('.prize-tier').forEach(tier => {
            tier.classList.remove('current');
            if (parseInt(tier.dataset.level) === gameState.level) {
                tier.classList.add('current');
                tier.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    init();
});
