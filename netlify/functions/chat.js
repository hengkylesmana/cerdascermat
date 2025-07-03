/*
  HAFIZH GAMES - style.css
  Versi: 1.0
  Deskripsi: Lembar gaya yang didesain ulang untuk HAFIZH GAMES.
  Palet Warna: Merah, Oranye, Kuning, Hitam untuk nuansa yang berani dan elegan.
*/

/* Import font baru yang lebih modern dan mudah dibaca */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&display=swap');

:root {
    /* Palet Warna Baru: Api Semangat (Merah, Oranye, Kuning, Hitam) */
    --primary-color: #FF4136; /* Merah Terang */
    --secondary-color: #FF851B; /* Oranye */
    --accent-color: #FFDC00; /* Kuning Cerah */
    --dark-bg: #111111; /* Hitam Pekat */
    --container-bg: rgba(30, 30, 30, 0.9);
    --text-light: #F5F5F5;
    --text-dark: #333333;
    --correct-answer: #2ECC40; /* Hijau untuk jawaban benar */
    --incorrect-answer: #FF4136; /* Merah untuk jawaban salah */
    --shadow: 0 10px 50px rgba(255, 65, 54, 0.2);
}

html {
    height: 100%;
}

body {
    font-family: 'Nunito', sans-serif;
    background-color: var(--dark-bg);
    margin: 0;
    min-height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text-light);
    position: relative;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    padding: 10px;
    box-sizing: border-box;
    overflow: hidden;
}

/* Latar belakang dengan gradien api yang elegan */
#interactive-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    background: radial-gradient(circle at top left, var(--primary-color), transparent 40%),
                radial-gradient(circle at bottom right, var(--secondary-color), transparent 30%),
                var(--dark-bg);
    background-size: 100% 100%;
    animation: pulseBG 15s ease infinite alternate;
}

@keyframes pulseBG {
    from { opacity: 0.6; }
    to { opacity: 1; }
}

.container {
    width: 100%;
    max-width: 700px;
    height: 95vh;
    background: var(--container-bg);
    border-radius: 24px;
    box-shadow: var(--shadow);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 1;
    position: relative;
}

header {
    padding: 12px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
    display: flex;
    justify-content: center; /* Tengahkan header */
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s;
    background-color: rgba(0,0,0,0.2);
}

.header-content { display: flex; flex-direction: column; align-items: center; gap: 4px; }

.title-group { text-align: center; }
.title-group h1 {
    margin: 0;
    font-size: 1.8rem;
    color: var(--text-light);
    font-weight: 900;
    letter-spacing: 1px;
    text-shadow: 0 0 10px var(--accent-color);
}
.title-group p { margin: 0; font-size: 0.8rem; color: var(--accent-color); font-weight: 600; }

.chat-container { flex-grow: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }

.chat-message {
    padding: 14px 20px;
    border-radius: 20px;
    max-width: 90%;
    line-height: 1.6;
    word-wrap: break-word;
    font-size: 0.95rem;
    animation: fadeIn 0.5s ease;
    border: 1px solid transparent;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.user-message {
    background-color: var(--secondary-color);
    align-self: flex-end;
    color: var(--dark-bg);
    font-weight: 700;
    border-bottom-right-radius: 5px;
}

.ai-message, .ai-system-message {
    background-color: #222;
    align-self: flex-start;
    border-bottom-left-radius: 5px;
    border-color: rgba(255,255,255,0.1);
}

.ai-system-message {
    font-style: italic;
    color: var(--accent-color);
    width: 100%;
    text-align: center;
    max-width: 100%;
    background-color: transparent;
    padding: 0;
    animation: none;
    font-weight: 600;
}

/* Styling untuk pertanyaan kuis */
.question-box {
    background: linear-gradient(145deg, #333, #222);
    border: 1px solid var(--secondary-color);
    padding: 20px;
    border-radius: 16px;
    margin-top: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.question-text {
    font-weight: 700;
    font-size: 1.1rem;
    margin-bottom: 15px;
    text-align: center;
}

.choice-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 12px;
}

.choice-button {
    width: 100%;
    background-color: rgba(255,255,255, 0.05);
    border: 1px solid var(--secondary-color);
    color: var(--text-light);
    padding: 15px;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    font-weight: 600;
    font-size: 0.9rem;
}

.choice-button:hover:not(:disabled) {
    background-color: var(--secondary-color);
    color: var(--dark-bg);
    transform: translateY(-3px);
    box-shadow: 0 5px 15px rgba(255, 133, 27, 0.3);
}
.choice-button.selected {
    background-color: var(--accent-color);
    color: var(--dark-bg);
    border-color: var(--accent-color);
}
.choice-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}
.choice-button.correct {
    background-color: var(--correct-answer);
    color: white;
    border-color: var(--correct-answer);
    animation: pulseCorrect 0.5s;
}
.choice-button.incorrect {
    background-color: var(--incorrect-answer);
    color: white;
    border-color: var(--incorrect-answer);
}

@keyframes pulseCorrect {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}


.input-container { display: none; /* Disembunyikan karena interaksi via tombol */ }
footer { display: none; /* Footer tidak relevan untuk game */ }

/* Modal Awal (Start Overlay) */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex;
    justify-content: center; align-items: center; z-index: 1000; opacity: 1;
    transition: opacity 0.5s ease, visibility 0.5s; visibility: visible; background-color: rgba(0,0,0,0.7);
}
.modal-overlay.hidden { opacity: 0; visibility: hidden; pointer-events: none; }

.start-content {
    text-align: center;
    padding: 40px;
    background: var(--container-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 90%;
    width: 500px;
    box-sizing: border-box;
    animation: popUp 0.6s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

@keyframes popUp { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

.start-title-container {
    margin-bottom: 24px;
}

.start-title-container p {
    margin: 0;
    line-height: 1.3;
}
.start-title-container p:nth-child(1) {
    font-size: 2.8rem;
    font-weight: 900;
    color: var(--text-light);
    text-shadow: 0 0 15px var(--primary-color);
}
.start-title-container p:nth-child(2) {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--accent-color);
    letter-spacing: 1px;
}

.info-box {
    font-size: 1rem;
    color: var(--text-light);
    margin-bottom: 32px;
    line-height: 1.7;
}

.start-content .modal-button {
    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
    color: white;
    border: none;
    padding: 18px 30px;
    border-radius: 50px;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 700;
    transition: all 0.3s ease;
    box-shadow: 0 5px 20px rgba(255, 65, 54, 0.4);
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    letter-spacing: 0.5px;
}

.start-content .modal-button:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow: 0 10px 30px rgba(255, 65, 54, 0.5);
}

@media (max-width: 768px) {
    body { padding: 0; align-items: flex-start; }
    .container {
        height: 100vh;
        height: 100dvh;
        width: 100%;
        max-width: 100%;
        border-radius: 0;
        box-shadow: none;
        border: none;
    }
    .title-group h1 { font-size: 1.5rem; }
    .start-content { width: 90%; padding: 24px; }
    .start-title-container p:nth-child(1) { font-size: 2rem; }
    .start-title-container p:nth-child(2) { font-size: 1rem; }
    .choice-container { grid-template-columns: 1fr; }
}
