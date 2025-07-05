/**
 * HAFIZH GAMES - game.js
 * Versi: 13.1
 * Deskripsi: Implementasi Multi-Mode Game (Dermawan & Cerdas Cermat).
 * - Menambahkan penanganan error yang lebih baik untuk masalah 500 Internal Server Error.
 */
document.addEventListener('DOMContentLoaded', () => {
    // === ELEMEN DOM GLOBAL ===
    const startScreen = document.getElementById('start-screen');
    const startDermawanBtn = document.getElementById('start-dermawan-btn');
    const startCerdasCermatBtn = document.getElementById('start-cerdas-cermat-btn');
    
    // Layouts
    const dermawanLayout = document.getElementById('dermawan-layout');
    const cerdasCermatLayout = document.getElementById('cerdas-cermat-layout');

    // === STATE GLOBAL ===
    let activeGame = null;

    // Helper function untuk jeda
    const delay = ms => new Promise(res => setTimeout(res, ms));

    // Fungsi TTS Global
    function speak(text, onEndCallback = () => {}) {
        if (!('speechSynthesis' in window)) {
            onEndCallback();
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, ''));
        utterance.lang = 'id-ID';
        utterance.rate = 1.2;
        utterance.pitch = 1.0;
        utterance.onend = onEndCallback;
        window.speechSynthesis.speak(utterance);
    }

    // =================================================================================
    // GAME MODE: SIAPA MAU JADI DERMAWAN (LOGIKA LAMA DIPINDAHKAN KE SINI)
    // =================================================================================
    const DermawanGame = {
        elements: {
            chatContainer: dermawanLayout.querySelector('#chat-container'),
            statusDiv: dermawanLayout.querySelector('#status'),
            headerSubtitle: dermawanLayout.querySelector('#header-subtitle'),
            prizeList: dermawanLayout.querySelector('#prize-list'),
            fiftyFiftyBtn: dermawanLayout.querySelector('#fifty-fifty-btn'),
            timerDisplay: dermawanLayout.querySelector('#timer-display'),
        },

        state: {
            level: 0,
            currentQuestion: null,
            isGameOver: false,
            isPlaying: false,
            selectedAnswerIndex: null,
            questionHistory: [],
            fiftyFiftyUsed: 0,
            questionTimer: null,
        },
        
        prizeTiers: [
            { value: 100000, label: "Rp 100.000" }, { value: 200000, label: "Rp 200.000" },
            { value: 300000, label: "Rp 300.000" }, { value: 500000, label: "Rp 500.000" },
            { value: 1000000, label: "Rp 1.000.000", safe: true }, { value: 2000000, label: "Rp 2.000.000" },
            { value: 4000000, label: "Rp 4.000.000" }, { value: 8000000, label: "Rp 8.000.000" },
            { value: 16000000, label: "Rp 16.000.000" }, { value: 32000000, label: "Rp 32.000.000", safe: true },
            { value: 64000000, label: "Rp 64.000.000" }, { value: 125000000, label: "Rp 125.000.000" },
            { value: 250000000, label: "Rp 250.000.000" }, { value: 500000000, label: "Rp 500.000.000" },
            { value: 1000000000, label: "Rp 1 Miliar", safe: true }
        ],

        init() {
            startScreen.style.display = 'none';
            dermawanLayout.style.display = 'flex';
            this.state = { level: 0, currentQuestion: null, isGameOver: false, isPlaying: true, selectedAnswerIndex: null, questionHistory: [], fiftyFiftyUsed: 0, questionTimer: null };
            this.elements.fiftyFiftyBtn.onclick = () => this.useFiftyFifty();
            this.populatePrizeList();
            this.updateHeader();
            this.updatePrizeLadderUI();
            this.updateHelpButtons();
            this.fetchNextQuestion();
        },
        
        populatePrizeList() {
            this.elements.prizeList.innerHTML = '';
            this.prizeTiers.forEach((tier, index) => {
                const li = document.createElement('li');
                li.className = 'prize-tier';
                li.dataset.level = index;
                li.innerHTML = `<span>${index + 1}</span> <span>${tier.label}</span>`;
                if (tier.safe) li.classList.add('safe-haven');
                this.elements.prizeList.appendChild(li);
            });
        },

        startTimer() {
            this.stopTimer();
            let timeLeft = 15;
            this.elements.timerDisplay.textContent = timeLeft;
            this.elements.timerDisplay.classList.remove('warning');
            this.state.questionTimer = setInterval(() => {
                timeLeft--;
                this.elements.timerDisplay.textContent = timeLeft;
                if (timeLeft <= 5 && timeLeft > 0) this.elements.timerDisplay.classList.add('warning');
                if (timeLeft <= 0) this.handleTimeUp();
            }, 1000);
        },

        stopTimer() { clearInterval(this.state.questionTimer); },

        async handleTimeUp() {
            this.stopTimer();
            dermawanLayout.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
            this.elements.fiftyFiftyBtn.disabled = true;
            this.elements.statusDiv.textContent = "WAKTU HABIS! Permainan berakhir.";
            speak("Waktu habis!");
            const correctButton = dermawanLayout.querySelector(`.choice-button[data-index='${this.state.currentQuestion.correct_answer_index}']`);
            if(correctButton) correctButton.classList.add('correct');
            await delay(2000);
            this.displayGameOver(false);
        },

        async fetchNextQuestion() {
            if (this.state.isGameOver) return;
            this.elements.chatContainer.innerHTML = '';
            this.elements.statusDiv.textContent = "Bang Hafizh lagi siapin pertanyaan...";
            this.updateHelpButtons();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'GET_QUESTION', payload: { level: this.state.level + 1, history: this.state.questionHistory } }),
                });
                // PERBAIKAN: Cek jika response tidak OK (misal: error 500)
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server Error: ${response.status} - ${errorText}`);
                }
                this.state.currentQuestion = await response.json();
                this.state.questionHistory.push(this.state.currentQuestion.question);
                this.elements.statusDiv.textContent = "";
                this.displayQuestion(this.state.currentQuestion);
                const prizeText = this.prizeTiers[this.state.level].label;
                speak(`Pertanyaan untuk ${prizeText}. ${this.state.currentQuestion.question}`, () => this.startTimer());
            } catch (error) {
                console.error("Fetch Error:", error);
                this.displayError(`Gagal mengambil pertanyaan. ${error.message}`);
            }
        },

        displayQuestion(data) {
            const questionBox = document.createElement('div');
            questionBox.className = 'question-box';
            questionBox.innerHTML = `
                <div class="question-text">${data.question}</div>
                <div class="choice-container">
                    ${data.options.map((option, index) => `<button class="choice-button" data-index="${index}">${option}</button>`).join('')}
                </div>
            `;
            this.elements.chatContainer.appendChild(questionBox);
            questionBox.querySelectorAll('.choice-button').forEach(btn => btn.onclick = () => this.handleAnswer(btn));
        },

        useFiftyFifty() {
            if (this.state.fiftyFiftyUsed >= 2 || !this.state.currentQuestion) return;
            this.state.fiftyFiftyUsed++;
            this.updateHelpButtons();
            const correctIndex = this.state.currentQuestion.correct_answer_index;
            let wrongChoices = dermawanLayout.querySelectorAll('.choice-button:not(.hide)');
            wrongChoices = Array.from(wrongChoices).filter(c => parseInt(c.dataset.index) !== correctIndex);
            wrongChoices.sort(() => Math.random() - 0.5);
            if(wrongChoices[0]) wrongChoices[0].classList.add('hide');
            if(wrongChoices[1]) wrongChoices[1].classList.add('hide');
        },

        updateHelpButtons() {
            this.elements.fiftyFiftyBtn.textContent = `50:50 (${2 - this.state.fiftyFiftyUsed})`;
            this.elements.fiftyFiftyBtn.disabled = this.state.fiftyFiftyUsed >= 2;
        },

        async handleAnswer(selectedButton) {
            this.stopTimer();
            dermawanLayout.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
            this.elements.fiftyFiftyBtn.disabled = true;
            selectedButton.classList.add('selected');
            const isCorrect = parseInt(selectedButton.dataset.index) === this.state.currentQuestion.correct_answer_index;
            
            await delay(1500);
            dermawanLayout.querySelector(`.choice-button[data-index='${this.state.currentQuestion.correct_answer_index}']`).classList.add('correct');
            if (!isCorrect) selectedButton.classList.add('incorrect');
            
            if (isCorrect) {
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                await delay(1000);
                if (this.state.level === this.prizeTiers.length - 1) {
                    this.displayGameOver(true);
                } else {
                    this.displayContinueButton();
                }
            } else {
                await delay(2000);
                this.displayGameOver(false);
            }
        },

        displayContinueButton() {
            const questionBox = this.elements.chatContainer.querySelector('.question-box');
            const continueButton = document.createElement('button');
            continueButton.textContent = 'LANJUTKAN';
            continueButton.className = 'choice-button';
            continueButton.style.cssText = 'margin-top: 20px; grid-column: 1 / -1; background-color: var(--correct-answer); color: white;';
            continueButton.onclick = () => {
                this.state.level++;
                this.updateHeader();
                this.updatePrizeLadderUI();
                this.fetchNextQuestion();
            };
            questionBox.appendChild(continueButton);
        },

        displayGameOver(isWinner) {
            this.state.isGameOver = true;
            let finalPrize = 0;
            if (isWinner) {
                finalPrize = this.prizeTiers[this.prizeTiers.length - 1].value;
            } else {
                for (let i = this.state.level - 1; i >= 0; i--) {
                    if (this.prizeTiers[i].safe) {
                        finalPrize = this.prizeTiers[i].value;
                        break;
                    }
                }
            }
            const finalPrizeLabel = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(finalPrize);
            const title = isWinner ? "SELAMAT, ANDA MENJADI MILIARDER!" : "GAME OVER";
            const messageText = isWinner ? `Anda berhasil membawa pulang hadiah utama!` : `Anda membawa pulang hadiah sebesar`;
            this.elements.chatContainer.innerHTML = `<div class="question-box" style="text-align:center;">
                <div class="question-text">${title}</div>
                <p>${messageText}</p>
                <p style="font-size: 2rem; font-weight: 900; color: var(--correct-answer);">${finalPrizeLabel}</p>
                <button class="choice-button" onclick="window.location.reload()">MAU MAIN LAGI?</button>
            </div>`;
            speak(`${title}. ${messageText} ${finalPrizeLabel}`);
        },

        updateHeader() { this.elements.headerSubtitle.textContent = `Pertanyaan ${this.state.level + 1} dari ${this.prizeTiers.length}`; },
        updatePrizeLadderUI() {
            dermawanLayout.querySelectorAll('.prize-tier').forEach((tier, index) => {
                tier.classList.remove('current');
                // Perhitungan index dibalik karena list hadiah ditampilkan terbalik (reverse)
                if (index === (this.prizeTiers.length - 1 - this.state.level)) tier.classList.add('current');
            });
        },
        displayError(msg) { this.elements.chatContainer.innerHTML = `<div class="question-box" style="text-align:center; color: var(--incorrect-answer);">${msg}</div>`; }
    };

    // =================================================================================
    // GAME MODE: CERDAS CERMAT
    // =================================================================================
    const CerdasCermatGame = {
        state: {
            scores: { A: 0, B: 0, C: 0, D: 0 },
            questionHistory: [],
            currentQuestion: null,
            activeTeam: null,
        },

        elements: {
            questionDisplay: document.getElementById('cc-question-display'),
            buzzers: {
                A: document.getElementById('buzzer-a'),
                B: document.getElementById('buzzer-b'),
                C: document.getElementById('buzzer-c'),
                D: document.getElementById('buzzer-d'),
            },
            scoreDisplays: {
                A: document.getElementById('score-a'),
                B: document.getElementById('score-b'),
                C: document.getElementById('score-c'),
                D: document.getElementById('score-d'),
            },
            judgementModal: document.getElementById('cc-judgement-modal'),
            judgementTeamName: document.getElementById('judgement-team-name'),
            correctBtn: document.getElementById('judgement-correct-btn'),
            wrongBtn: document.getElementById('judgement-wrong-btn'),
        },

        init() {
            startScreen.style.display = 'none';
            cerdasCermatLayout.style.display = 'block';
            this.reset();
            this.addEventListeners();
            this.fetchNextQuestion();
        },

        reset() {
            this.state.scores = { A: 0, B: 0, C: 0, D: 0 };
            this.state.questionHistory = [];
            this.updateAllScores();
        },

        addEventListeners() {
            Object.values(this.elements.buzzers).forEach(buzzer => {
                buzzer.onclick = (e) => this.handleBuzzerPress(e.currentTarget);
            });
            this.elements.correctBtn.onclick = () => this.handleJudgement(true);
            this.elements.wrongBtn.onclick = () => this.handleJudgement(false);
        },

        updateAllScores() {
            for (const team in this.state.scores) {
                this.elements.scoreDisplays[team].textContent = this.state.scores[team];
            }
        },

        async fetchNextQuestion() {
            this.elements.questionDisplay.innerHTML = `<p>Bang Hafizh sedang menyiapkan pertanyaan...</p>`;
            this.resetBuzzers();

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'GET_CERDAS_CERMAT_QUESTION',
                        payload: { history: this.state.questionHistory }
                    })
                });
                // PERBAIKAN: Cek jika response tidak OK
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server Error: ${response.status} - ${errorText}`);
                }
                
                this.state.currentQuestion = await response.json();
                this.state.questionHistory.push(this.state.currentQuestion.question);
                
                speak(this.state.currentQuestion.question, () => {
                    this.elements.questionDisplay.innerHTML = `<p>${this.state.currentQuestion.question}</p>`;
                    this.enableBuzzers();
                });

            } catch (error) {
                console.error("Fetch Error:", error);
                this.elements.questionDisplay.innerHTML = `<p style="color: var(--warning-color);">Oops, terjadi masalah. Coba lagi. <br><small>${error.message}</small></p>`;
            }
        },

        enableBuzzers(enable = true) {
            Object.values(this.elements.buzzers).forEach(buzzer => buzzer.disabled = !enable);
        },
        
        resetBuzzers() {
            this.enableBuzzers(false);
            Object.values(this.elements.buzzers).forEach(buzzer => buzzer.classList.remove('active'));
        },

        handleBuzzerPress(buzzerElement) {
            this.enableBuzzers(false);
            buzzerElement.classList.add('active');
            
            this.state.activeTeam = buzzerElement.id.split('-')[1].toUpperCase();
            this.elements.judgementTeamName.textContent = `Regu ${this.state.activeTeam} Menjawab...`;
            this.elements.judgementModal.style.display = 'flex';
        },

        handleJudgement(isCorrect) {
            this.elements.judgementModal.style.display = 'none';
            if (isCorrect) {
                this.state.scores[this.state.activeTeam] += 10;
                this.updateAllScores();
                speak("BENAR! Poin untuk regu " + this.state.activeTeam);
            } else {
                speak("SALAH! Sayang sekali.");
            }
            setTimeout(() => this.fetchNextQuestion(), 2000);
        }
    };

    // =================================================================================
    // INISIALISASI UTAMA
    // =================================================================================
    function globalInit() {
        const initGame = async (gameMode) => {
            startDermawanBtn.disabled = true;
            startCerdasCermatBtn.disabled = true;
            try {
                await Tone.start();
            } catch(e) { console.error("Gagal memulai audio context", e); }
            
            activeGame = gameMode;
            activeGame.init();
        };

        startDermawanBtn.onclick = () => initGame(DermawanGame);
        startCerdasCermatBtn.onclick = () => initGame(CerdasCermatGame);
    }

    globalInit();
});
