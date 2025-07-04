/**
 * HAFIZH GAMES - chat.js (Netlify Function)
 * Versi: 3.1
 * Deskripsi: Menyesuaikan durasi komentar host menjadi lebih singkat (maksimal 3 detik).
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

        if (action === 'GET_OPENING_SPEECH') {
            // PENYESUAIAN: Prompt dibuat lebih singkat
            const prompt = `Anda adalah "Bang Hafizh", host kuis yang SUPER SEMANGAT. Buat 1-2 kalimat sambutan pembuka yang membakar semangat pemain. Gunakan HURUF KAPITAL dan TANDA SERU!`;
            
            const requestPayload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const data = await callGemini(requestPayload);
            const speech = data.candidates[0].content.parts[0].text;
            return { statusCode: 200, body: JSON.stringify({ speech }) };
        }

        if (action === 'GET_QUESTION') {
            const { level, history } = payload;
            
            let difficulty_desc;
            if (level <= 3) difficulty_desc = "Sangat Mudah (Pengetahuan umum dasar).";
            else if (level <= 6) difficulty_desc = "Mudah (Tokoh populer, geografi Indonesia).";
            else if (level <= 9) difficulty_desc = "Menengah (Sejarah, sains dasar).";
            else if (level <= 12) difficulty_desc = "Sulit (Detail spesifik dari sejarah/sains).";
            else difficulty_desc = "Sangat Sulit dan Menjebak.";

            const systemPrompt = `Anda adalah generator soal untuk kuis "SIAPA MAU JADI DERMAWAN".
            Tugas: Buat 1 pertanyaan UNIK.
            Aturan:
            1. Topik: Pengetahuan umum (sains, sejarah, geografi, teknologi, seni, olahraga, budaya pop).
            2. Tingkat Kesulitan (Level ${level}): ${difficulty_desc}
            3. Histori Pertanyaan (JANGAN DIULANG): ${history.join(', ')}
            4. Format Output: JSON dengan question, options (4), correct_answer_index, dan fun_fact.`;
            
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
            const { isCorrect } = payload;
            
            // PENYESUAIAN: Prompt komentar dibuat lebih singkat
            let prompt;
            if (isCorrect) {
                prompt = `Anda adalah "Bang Hafizh", host kuis yang SUPER SEMANGAT. Pemain baru saja menjawab BENAR. Berikan komentar singkat (1-2 kalimat) yang penuh semangat.`;
            } else {
                prompt = `Anda adalah "Bang Hafizh", host kuis yang dramatis. Pemain baru saja menjawab SALAH. Berikan komentar singkat (1-2 kalimat) yang menunjukkan rasa sayang tapi juga membangkitkan semangat.`;
            }

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
