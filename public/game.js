/**
 * HAFIZH GAMES - game.js
 * Versi: 1.0
 * Deskripsi: Logika frontend untuk game kuis "SIAPA MAU JADI DERMAWAN".
 * Mengelola state game, interaksi pengguna, dan komunikasi dengan backend AI.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elemen DOM
    const chatContainer = document.getElementById('chat-container');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startGameBtn = document.getElementById('start-game-btn');
    const headerSubtitle = document.getElementById('header-subtitle');

    // State Game
    let gameState = {
        level: 1,
        score: 0,
        currentQuestion: null,
        isGameOver: false,
        isPlaying: false,
    };

    // Inisialisasi
    startGameBtn.addEventListener('click', initializeGame);
    document.querySelector('header').addEventListener('click', () => {
        if (gameState.isPlaying) {
             // Mencegah reload saat game berlangsung, bisa diganti konfirmasi
             return;
        }
        window.location.reload();
    });

    // Fungsi untuk memulai atau mereset game
    function initializeGame() {
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        gameState = {
            level: 1,
            score: 0,
            currentQuestion: null,
            isGameOver: false,
            isPlaying: true,
        };
        updateHeader();
        displayMessage("Selamat datang di <strong>SIAPA MAU JADI DERMAWAN</strong>! Saya, Bang Hafizh, akan memandu permainan ini. Mari kita mulai!", 'ai-system');
        setTimeout(fetchNextQuestion, 1500);
    }
    
    // Fungsi untuk mengambil pertanyaan dari backend
    async function fetchNextQuestion() {
        if (gameState.isGameOver) return;
        statusDiv.textContent = "Bang Hafizh lagi siapin pertanyaan...";
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'GET_QUESTION',
                    payload: { level: gameState.level }
                }),
            });
            if (!response.ok) throw new Error('Gagal mengambil pertanyaan.');
            
            const questionData = await response.json();
            gameState.currentQuestion = questionData;
            statusDiv.textContent = "";
            displayQuestion(questionData);

        } catch (error) {
            console.error(error);
            statusDiv.textContent = "Oops, ada gangguan. Coba refresh halaman.";
        }
    }

    // Fungsi untuk menampilkan pertanyaan dan pilihan jawaban
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
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Fungsi untuk menangani jawaban pemain
    async function handleAnswer(selectedButton) {
        // Menonaktifkan semua tombol pilihan
        const buttons = document.querySelectorAll('.choice-button');
        buttons.forEach(btn => btn.disabled = true);
        
        selectedButton.classList.add('selected');

        const selectedIndex = parseInt(selectedButton.dataset.index);
        const correctIndex = gameState.currentQuestion.correct_answer_index;
        const isCorrect = selectedIndex === correctIndex;

        // Beri sedikit jeda untuk efek dramatis
        statusDiv.textContent = "Hmm, Bang Hafizh lagi ngecek jawabanmu...";
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Tampilkan hasil visual
        const correctButton = document.querySelector(`.choice-button[data-index='${correctIndex}']`);
        correctButton.classList.add('correct');
        if (!isCorrect) {
            selectedButton.classList.add('incorrect');
        } else {
            // Efek confetti jika jawaban benar!
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        // Ambil dan tampilkan komentar host
        const commentary = await getHostCommentary(isCorrect);
        statusDiv.textContent = "";
        displayMessage(`<strong>Bang Hafizh:</strong> ${commentary}`, 'ai-message');

        // Tampilkan fun fact
        displayMessage(`<strong>Fun Fact:</strong> ${gameState.currentQuestion.fun_fact}`, 'ai-system');


        if (isCorrect) {
            // Update skor dan level
            gameState.level++;
            gameState.score += 100;
            updateHeader();
            // Lanjut ke pertanyaan berikutnya
            setTimeout(fetchNextQuestion, 3000);
        } else {
            // Game Over
            gameState.isGameOver = true;
            gameState.isPlaying = false;
            displayGameOver();
        }
    }

    // Fungsi untuk mengambil komentar host dari backend
    async function getHostCommentary(isCorrect) {
        try {
            const q = gameState.currentQuestion;
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'GET_HOST_COMMENTARY',
                    payload: {
                        question: q.question,
                        userAnswer: q.options[q.correct_answer_index], // Placeholder, bisa diisi jawaban user
                        correctAnswer: q.options[q.correct_answer_index],
                        isCorrect: isCorrect
                    }
                }),
            });
            if (!response.ok) throw new Error('Gagal mengambil komentar.');
            const data = await response.json();
            return data.commentary;
        } catch (error) {
            console.error(error);
            return isCorrect ? "Jawabanmu benar!" : "Jawabanmu salah.";
        }
    }

    // Fungsi untuk menampilkan pesan di chat
    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        messageElement.innerHTML = message;
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Fungsi untuk menampilkan layar Game Over
    function displayGameOver() {
        const message = `
            <div class="question-box">
                <div class="question-text">GAME OVER</div>
                <div>Skor Akhir Kamu: <strong>${gameState.score}</strong></div>
                <div class="choice-container" style="grid-template-columns: 1fr;">
                    <button class="choice-button" id="play-again-btn">MAU MAIN LAGI?</button>
                </div>
            </div>`;
        displayMessage(message, 'ai-system');
        document.getElementById('play-again-btn').onclick = initializeGame;
    }

    // Fungsi untuk memperbarui header (level dan skor)
    function updateHeader() {
        headerSubtitle.innerHTML = `Level ${gameState.level} - Poin: ${gameState.score}`;
    }
});
