/**
 * HAFIZH GAMES - game.js
 * Versi: 12.6
 * Deskripsi: PENYEMPURNAAN FITUR - Menambahkan opsi bantuan 50:50 dan perbaikan responsif.
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
    const hostWelcomeSpeech = document.getElementById('host-welcome-speech');
    const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');

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
        selectedAnswerIndex: null,
        questionHistory: [],
        fiftyFiftyUsed: 0, // PENAMBAHAN: Melacak penggunaan 50:50
    };

    function speak(text, onEndCallback = () => {}) {
        if (!('speechSynthesis' in window)) {
            onEndCallback();
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ''));
        utterance.lang = 'id-ID';
        utterance.rate = 1.2; // Sedikit lebih cepat
        utterance.pitch = 1.0;
        utterance.onend = onEndCallback;
        window.speechSynthesis.speak(utterance);
    }

    async function fetchOpeningSpeech() {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GET_OPENING_SPEECH' })
            });
            if (!response.ok) throw new Error('Gagal mendapat sambutan.');
            const data = await response.json();
            hostWelcomeSpeech.textContent = data.speech;
        } catch (error) {
            console.error(error);
            hostWelcomeSpeech.textContent = "Selamat Datang! Mari kita mulai permainannya!";
        }
    }

    function init() {
        populatePrizeList();
        fetchOpeningSpeech();
        
        startGameBtn.addEventListener('click', async () => {
            startGameBtn.disabled = true;
            startGameBtn.textContent = "Memuat...";
            try {
                await Tone.start();
                console.log("AudioContext berhasil dimulai oleh pengguna.");
            } catch (e) {
                console.error("Gagal memulai AudioContext:", e);
            }
            
            speak(hostWelcomeSpeech.textContent, () => {
                initializeGame();
            });
        });

        fiftyFiftyBtn.addEventListener('click', useFiftyFifty);
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
        startScreen.style.display = 'none';
        gameLayout.style.display = 'flex';
        gameState = { level: 0, currentQuestion: null, isGameOver: false, isPlaying: true, selectedAnswerIndex: null, questionHistory: [], fiftyFiftyUsed: 0 };
        updateHeader();
        updatePrizeLadderUI();
        updateHelpButtons();
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
        updateHelpButtons(); // Perbarui status tombol bantuan untuk pertanyaan baru

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'GET_QUESTION', 
                    payload: { 
                        level: gameState.level + 1,
                        history: gameState.questionHistory 
                    } 
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`Server merespons dengan status ${response.status}`);
            
            gameState.currentQuestion = await response.json();
            gameState.questionHistory.push(gameState.currentQuestion.question);

            statusDiv.textContent = "";
            displayQuestion(gameState.currentQuestion);
            
            const prizeText = prizeTiers[gameState.level].label;
            const questionText = gameState.currentQuestion.question;
            speak(`Pertanyaan untuk ${prizeText}. ${questionText}`);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error("Fetch Gagal:", error);
            const errorMessage = error.name === 'AbortError' ? "Bang Hafizh tidak merespons." : "Gagal menghubungi Bang Hafizh.";
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
    
    // FUNGSI BARU: Logika untuk bantuan 50:50
    function useFiftyFifty() {
        if (gameState.fiftyFiftyUsed >= 2 || !gameState.currentQuestion || document.querySelector('.choice-button:disabled')) return;

        gameState.fiftyFiftyUsed++;
        updateHelpButtons();

        const correctIndex = gameState.currentQuestion.correct_answer_index;
        const choices = Array.from(document.querySelectorAll('.choice-button'));
        
        let wrongChoices = choices.filter(c => parseInt(c.dataset.index) !== correctIndex);
        
        // Acak pilihan yang salah
        wrongChoices.sort(() => Math.random() - 0.5);

        // Sembunyikan 2 dari pilihan yang salah
        wrongChoices[0].classList.add('hide');
        wrongChoices[1].classList.add('hide');
    }

    // FUNGSI BARU: Memperbarui status tombol bantuan
    function updateHelpButtons() {
        fiftyFiftyBtn.textContent = `50:50 (${2 - gameState.fiftyFiftyUsed})`;
        if (gameState.fiftyFiftyUsed >= 2) {
            fiftyFiftyBtn.disabled = true;
        } else {
            fiftyFiftyBtn.disabled = false;
        }
    }

    async function getAndSpeakHostCommentary(isCorrect) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GET_HOST_COMMENTARY', payload: { isCorrect } })
            });
            if (!response.ok) return;
            const data = await response.json();
            statusDiv.textContent = data.commentary;
            speak(data.commentary);
        } catch (error) {
            console.error("Gagal mengambil komentar host:", error);
            statusDiv.textContent = isCorrect ? "BENAR! Jawaban Anda tepat sekali!" : "SALAH! Permainan berakhir.";
        }
    }

    async function handleAnswer(selectedButton) {
        document.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
        fiftyFiftyBtn.disabled = true; // Nonaktifkan bantuan setelah menjawab
        selectedButton.classList.add('selected');
        
        const selectedIndex = parseInt(selectedButton.dataset.index);
        gameState.selectedAnswerIndex = selectedIndex;
        const correctIndex = gameState.currentQuestion.correct_answer_index;
        const isCorrect = selectedIndex === correctIndex;

        statusDiv.textContent = "Memeriksa jawaban...";
        await delay(1500);
        
        const correctButton = document.querySelector(`.choice-button[data-index='${correctIndex}']`);
        selectedButton.classList.remove('selected');
        correctButton.classList.add('correct');

        getAndSpeakHostCommentary(isCorrect);

        if (isCorrect) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
            
            await delay(1000);

            if (gameState.level === prizeTiers.length - 1) {
                await delay(2000);
                displayGameOver(true);
            } else {
                displayContinueButton();
            }
        } else {
            selectedButton.classList.add('incorrect');
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
