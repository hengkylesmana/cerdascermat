/**
 * HAFIZH GAMES - chat.js (Netlify Function)
 * Versi: 2.3
 * Deskripsi: Penambahan fitur sambutan pembuka dari host.
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

        // AKSI BARU: Mendapatkan sambutan pembuka
        if (action === 'GET_OPENING_SPEECH') {
            const prompt = `Anda adalah "Bang Hafizh", host kuis "SIAPA MAU JADI DERMAWAN" yang SUPER SEMANGAT, ENERJIK, dan PROVOKATIF. 
            Tugas Anda: Buat sebuah paragraf sambutan pembuka yang singkat (2-3 kalimat) untuk menyambut pemain. 
            Buat semenarik dan seheboh mungkin untuk membakar semangat mereka! Gunakan HURUF KAPITAL dan TANDA SERU!
            Contoh: "SELAMAT DATANG PARA CALON DERMAWAN! SAYA BANG HAFIZH SIAP MENGUJI NYALI DAN PENGETAHUAN ANDA! BUKTIKAN KALAU ANDA LAYAK MEMBAWA PULANG 1 MILIAR RUPIAH! BERANIIII?! AYO KITA MULAI!"
            Berikan hanya teks sambutannya saja.`;
            
            const requestPayload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const data = await callGemini(requestPayload);
            const speech = data.candidates[0].content.parts[0].text;
            return { statusCode: 200, body: JSON.stringify({ speech }) };
        }

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
            const prompt = `Anda adalah "Bang Hafizh", host kuis "SIAPA MAU JADI DERMAWAN" yang SUPER SEMANGAT dan ENERJIK. Berikan komentar singkat (1-2 kalimat) berdasarkan konteks berikut. Gunakan HURUF KAPITAL dan TANDA SERU!
            Konteks: Pertanyaan "${question}", Jawaban Pemain "${userAnswer}", Jawaban Benar "${correctAnswer}".
            Kondisi: Jawaban pemain ${isCorrect ? 'BENAR' : 'SALAH'}.
            Jika BENAR, beri selamat dengan teriakan (Contoh: "DAHSYAT! TEPAT SEKALI! LANJUTKAN!").
            Jika SALAH, beri semangat dan sebutkan jawaban yang benar (Contoh: "YAAH, SAYANG SEKALI! Jawaban yang benar adalah ${correctAnswer}. JANGAN MENYERAH!").
            Berikan hanya komentarnya saja.`;
            const requestPayload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
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
