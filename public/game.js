/**
 * HAFIZH GAMES - game.js
 * Versi: 5.0
 * Deskripsi: PERBAIKAN KRITIS - Memisahkan alur logika game dari event suara (Text-to-Speech)
 * untuk mencegah game macet saat suara gagal diputar.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elemen DOM
    const chatContainer = document.getElementById('chat-container');
    const statusDiv = document.getElementById('status');
    const headerSubtitle = document.getElementById('header-subtitle');
    const prizeList = document.getElementById('prize-list');
    
    // Elemen untuk layar pembuka
    const startScreen = document.getElementById('start-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const gameLayout = document.getElementById('game-layout');

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

    // State game
    let gameState = {
        level: 0,
        currentQuestion: null,
        isGameOver: true,
        isPlaying: false,
    };

    // Variabel untuk audio
    let sounds;
    let audioReady = false;

    function setupAudio() {
        if (audioReady) return;
        try {
            sounds = {
                start: new Tone.Player("https://firebasestorage.googleapis.com/v0/b/rasa-426813.appspot.com/o/start.mp3?alt=media&token=35a2d5c4-5e84-473d-862d-864023c7c4b6").toDestination(),
                correct: new Tone.Player("https://firebasestorage.googleapis.com/v0/b/rasa-426813.appspot.com/o/correct.mp3?alt=media&token=404f2a11-5e20-411a-b054-325b51a84f50").toDestination(),
                wrong: new Tone.Player("https://firebasestorage.googleapis.com/v0/b/rasa-426813.appspot.com/o/wrong.mp3?alt=media&token=3852899a-3286-4448-a0b4-7b44383a54d4").toDestination(),
                wait: new Tone.Synth({ oscillator: { type: "sine" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination()
            };
            audioReady = true;
            console.log("Semua file audio berhasil dimuat.");
        } catch (e) {
            console.error("Gagal memuat file audio:", e);
        }
    }
    
    // Fungsi Text-to-Speech (tanpa callback yang memblokir)
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
        startGameBtn.addEventListener('click', initializeGame);
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

    async function initializeGame() {
        startGameBtn.disabled = true;
        startGameBtn.textContent = "Memuat...";

        try {
            await Tone.start();
            console.log("Konteks audio berhasil dimulai!");
            setupAudio();
        } catch (e) {
            console.error("Gagal memulai konteks audio:", e);
        }

        startScreen.style.display = 'none';
        gameLayout.style.display = 'flex';
        startGame();
    }

    function startGame() {
        if (gameState.isPlaying && !gameState.isGameOver) return;
        
        gameState = { level: 0, currentQuestion: null, isGameOver: false, isPlaying: true };
        
        const welcomeText = "DARI STUDIO HAFIZH GAMES! INILAH DIA... <strong>SIAPA MAU JADI DERMAWAN!</strong> Saya, Bang Hafizh, siap memandu Anda merebut 1 Miliar! APA ANDA SUDAH SIAP?! AYO KITA MULAI!!";
        displayMessageAsHost(welcomeText);
        
        if (audioReady) {
            sounds.start.start();
        }
        speak("Dari studio Hafizh Games! Inilah dia... SIAPA MAU JADI DERMAWAN! Saya, Bang Hafizh, siap memandu Anda merebut 1 Miliar! Apa anda sudah siap?! Ayo kita mulai!!");
        
        // PERBAIKAN: Panggil fetchNextQuestion setelah jeda waktu, tidak menunggu suara selesai.
        // Ini memastikan game berjalan bahkan jika suara gagal.
        setTimeout(fetchNextQuestion, 6000); // 6 detik untuk memberi waktu sambutan.
        
        updateHeader();
        updatePrizeLadderUI();
    }
    
    async function fetchNextQuestion() {
        if (gameState.isGameOver) return;
        
        chatContainer.innerHTML = '';
        statusDiv.textContent = "Bang Hafizh lagi siapin pertanyaan...";
        if (audioReady) sounds.wait.triggerAttackRelease("C4", "8n");

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GET_QUESTION', payload: { level: gameState.level + 1 } }),
            });
            if (!response.ok) throw new Error(`Gagal mengambil pertanyaan: ${response.statusText}`);
            
            gameState.currentQuestion = await response.json();
            statusDiv.textContent = "";
            displayQuestion(gameState.currentQuestion);
            
            const prizeText = prizeTiers[gameState.level].label;
            const questionText = gameState.currentQuestion.question;
            speak(`Pertanyaan untuk ${prizeText}. ${questionText}`);

        } catch (error) {
            console.error(error);
            statusDiv.textContent = "Oops, ada gangguan. Coba refresh halaman.";
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
        
        statusDiv.textContent = "Hmm, Bang Hafizh lagi ngecek jawabanmu...";
        if (audioReady) sounds.wait.triggerAttackRelease("E4", "8n");
        await new Promise(resolve => setTimeout(resolve, 2000));

        const selectedIndex = parseInt(selectedButton.dataset.index);
        const correctIndex = gameState.currentQuestion.correct_answer_index;
        const isCorrect = selectedIndex === correctIndex;

        const correctButton = document.querySelector(`.choice-button[data-index='${correctIndex}']`);
        correctButton.classList.add('correct');
        
        const commentary = await getHostCommentary(isCorrect);
        statusDiv.textContent = "";
        displayMessageAsHost(commentary);
        
        // PERBAIKAN: Suara komentar diputar, tapi tidak memblokir alur game.
        speak(commentary);
        
        // Alur game dilanjutkan setelah jeda singkat.
        setTimeout(() => {
            if (isCorrect) {
                if (audioReady) sounds.correct.start();
                confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
                
                if (gameState.level === prizeTiers.length - 1) {
                    displayGameOver(true);
                } else {
                    gameState.level++;
                    updateHeader();
                    updatePrizeLadderUI();
                    setTimeout(fetchNextQuestion, 1500);
                }
            } else {
                if (audioReady) sounds.wrong.start();
                selectedButton.classList.add('incorrect');
                displayGameOver(false);
            }
        }, 2000); // Jeda 2 detik setelah komentar muncul di layar.
    }

    async function getHostCommentary(isCorrect) {
        try {
            const q = gameState.currentQuestion;
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'GET_HOST_COMMENTARY',
                    payload: {
                        question: q.question, userAnswer: q.options[q.correct_answer_index], 
                        correctAnswer: q.options[q.correct_answer_index], isCorrect: isCorrect
                    }
                }),
            });
            if (!response.ok) throw new Error('Gagal mengambil komentar.');
            const data = await response.json();
            return data.commentary;
        } catch (error) {
            console.error(error);
            return isCorrect ? "DAHSYAT! BENAR SEKALI! LANJUTKAN KE LEVEL BERIKUTNYA, JUARA!" : "WADUH, BELUM TEPAT! TAPI SEMANGAT JANGAN KENDOR, AYO BISA!";
        }
    }
    
    function displayMessageAsHost(message) {
        chatContainer.innerHTML = `<div class="ai-system-message">${message}</div>`;
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
