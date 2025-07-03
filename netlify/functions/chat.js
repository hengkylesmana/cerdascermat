/**
 * HAFIZH GAMES - chat.js (Netlify Function)
 * Versi: 2.1
 * Deskripsi: Backend AI dengan karakter host yang lebih bersemangat.
 */
const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

async function callGemini(payload) {
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(geminiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Gemini API Error:', response.status, errorBody);
        throw new Error('Gagal mendapat respons dari Google AI.');
    }
    return response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: 'API Key belum diatur.' };
    }

    try {
        const { action, payload } = JSON.parse(event.body);

        if (action === 'GET_QUESTION') {
            const { level } = payload;
            const difficulty = level < 5 ? "sangat mudah" : (level < 10 ? "menengah" : "sulit dan menjebak");
            
            const systemPrompt = `Anda adalah pembuat soal super kreatif untuk kuis "SIAPA MAU JADI DERMAWAN". Buat 1 pertanyaan pengetahuan umum (sains, sejarah, geografi, teknologi, seni, olahraga, budaya pop) yang cocok untuk anak SD dan Remaja di Indonesia. Tingkat kesulitan: ${difficulty}. Pastikan jawabannya faktual, tidak ambigu, dan menarik. Berikan 4 pilihan jawaban. Sertakan juga satu "fun fact" singkat terkait jawaban yang benar.`;
            
            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            options: { type: "ARRAY", items: { type: "STRING" }, minItems: 4, maxItems: 4 },
                            correct_answer_index: { type: "NUMBER" },
                            fun_fact: { type: "STRING" }
                        },
                        required: ["question", "options", "correct_answer_index", "fun_fact"]
                    }
                }
            };
            
            const data = await callGemini(requestPayload);
            const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
            return { statusCode: 200, body: JSON.stringify(questionData) };
        }

        if (action === 'GET_HOST_COMMENTARY') {
            const { question, userAnswer, correctAnswer, isCorrect } = payload;
            
            // PROMPT BARU DENGAN KARAKTER LEBIH SEMANGAT
            const prompt = `
            Anda adalah "Bang Hafizh", host kuis "SIAPA MAU JADI DERMAWAN" yang SUPER SEMANGAT, ENERJIK, dan SUKA BERTERIAK untuk menyemangati peserta.
            
            Konteks:
            - Pertanyaan: "${question}"
            - Jawaban Pemain: "${userAnswer}"
            - Jawaban Benar: "${correctAnswer}"
            
            Tugas Anda: Berikan komentar singkat (1-2 kalimat) sesuai kondisi di bawah. Gunakan HURUF KAPITAL dan TANDA SERU untuk menunjukkan semangat membara!
            
            Kondisi: Jawaban pemain ${isCorrect ? 'BENAR' : 'SALAH'}.
            
            Jika BENAR:
            - Beri selamat dengan teriakan! Gunakan kata-kata seperti "DAHSYAT!", "LUAR BIASA!", "BETUL SEKALI!", "ANDA HEBAT!".
            - Ajak pemain untuk bersiap ke level selanjutnya dengan penuh semangat.
            - Contoh: "BOOM! JAWABAN ANDA TEPAT SEKALI! LIHAT PAPAN SKOR, ANDA SEMAKIN DEKAT DENGAN 1 MILIAR! LANJUTKAN!"
            
            Jika SALAH:
            - Beri semangat, jangan menjatuhkan, tapi tetap dengan nada yang dramatis. Gunakan kata-kata seperti "YAAAHHH, SAYANG SEKALI...", "ADUUUH, HAMPIIR SAJA!".
            - Ungkapkan jawaban yang benar.
            - Ajak untuk tidak menyerah dengan teriakan.
            - Contoh: "OH, TIDAK! Sedikit lagi! Jawaban yang benar adalah ${correctAnswer}. TAPI PERJUANGAN BELUM BERAKHIR! JANGAN MENYERAH!"
            
            Berikan hanya komentarnya saja, tanpa embel-embel lain.
            `;

            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };

            const data = await callGemini(requestPayload);
            const commentary = data.candidates[0].content.parts[0].text;
            return { statusCode: 200, body: JSON.stringify({ commentary }) };
        }

        return { statusCode: 400, body: 'Aksi tidak valid.' };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return { statusCode: 500, body: 'Terjadi kesalahan internal.' };
    }
};
