/**
 * HAFIZH GAMES - chat.js (Netlify Function)
 * Versi: 1.0
 * Deskripsi: Backend AI yang berfungsi sebagai Game Master untuk "SIAPA MAU JADI DERMAWAN".
 * Tugas: 1. Membuat pertanyaan kuis dalam format JSON.
 * 2. Memberikan komentar sebagai host berdasarkan jawaban pemain.
 */
const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

// Fungsi untuk memanggil Gemini API
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

        // Aksi 1: Membuat Pertanyaan Baru
        if (action === 'GET_QUESTION') {
            const { level } = payload;
            const difficulty = level < 5 ? "mudah" : (level < 10 ? "menengah" : "sulit");
            
            const systemPrompt = `Anda adalah pembuat soal untuk kuis "SIAPA MAU JADI DERMAWAN". Buat 1 pertanyaan pengetahuan umum (sains, sejarah, geografi, teknologi, seni, olahraga) yang cocok untuk anak SD dan Remaja di Indonesia. Tingkat kesulitan: ${difficulty}. Pastikan jawabannya faktual dan tidak ambigu. Berikan 4 pilihan jawaban.`;
            
            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            options: {
                                type: "ARRAY",
                                items: { type: "STRING" },
                                minItems: 4,
                                maxItems: 4
                            },
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

        // Aksi 2: Memberikan Komentar Host
        if (action === 'GET_HOST_COMMENTARY') {
            const { question, userAnswer, correctAnswer, isCorrect } = payload;
            
            const prompt = `
            Anda adalah "Bang Hafizh", host kuis "SIAPA MAU JADI DERMAWAN" yang seru, gembira, semangat, dan sedikit provokatif (dengan cara yang menyenangkan).
            
            Konteks:
            - Pertanyaan: "${question}"
            - Jawaban Pemain: "${userAnswer}"
            - Jawaban Benar: "${correctAnswer}"
            
            Tugas Anda: Berikan komentar singkat (1-2 kalimat) sesuai kondisi di bawah.
            
            Kondisi: Jawaban pemain ${isCorrect ? 'BENAR' : 'SALAH'}.
            
            Jika BENAR:
            - Beri selamat dengan sangat antusias! Gunakan kata-kata seperti "LUAR BIASA!", "KEREN!", "HEBAT!".
            - Ajak pemain untuk bersiap ke level selanjutnya.
            - Contoh: "WOW, TEPAT SEKALI! Kamu memang cerdas! Siap-siap buat pertanyaan yang lebih menantang ya!"
            
            Jika SALAH:
            - Beri semangat, jangan menjatuhkan. Gunakan kata-kata seperti "Yaaah, sayang sekali...", "Hampir saja!".
            - Ungkapkan bahwa jawaban yang benar adalah [jawaban benar].
            - Ajak untuk tidak menyerah.
            - Contoh: "Aduuh, sedikit lagi! Jawaban yang benar adalah ${correctAnswer}. Jangan patah semangat, ayo coba lagi di game berikutnya!"
            
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
