/**
 * HAFIZH GAMES - chat.js (Netlify Function)
 * Versi: 3.3
 * Deskripsi: Penambahan action untuk soal Cerdas Cermat (open-ended).
 */
const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

// ... (fungsi callGemini tidak berubah)
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

        // ... (action GET_OPENING_SPEECH, GET_QUESTION, GET_HOST_COMMENTARY tidak berubah)
        if (action === 'GET_OPENING_SPEECH') {
            const prompt = `Anda adalah "Bang Hafizh", host kuis yang SUPER SEMANGAT. Buat 1-2 kalimat sambutan pembuka yang membakar semangat pemain. Gunakan HURUF KAPITAL dan TANDA SERU!`;
            const requestPayload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const data = await callGemini(requestPayload);
            const speech = data.candidates[0].content.parts[0].text;
            return { statusCode: 200, body: JSON.stringify({ speech }) };
        }

        if (action === 'GET_QUESTION') { // Untuk Siapa Mau Jadi Dermawan
            const { level, history } = payload;
            let difficulty_desc = "mudah";
            if (level > 5) difficulty_desc = "menengah";
            if (level > 10) difficulty_desc = "sulit";
            const systemPrompt = `Buat 1 soal kuis pilihan ganda dari topik pengetahuan umum. Tingkat kesulitan: ${difficulty_desc}. Jangan ulangi pertanyaan ini: ${history.join(', ')}. Format output JSON: { "question": "...", "options": ["...", "...", "...", "..."], "correct_answer_index": ..., "fun_fact": "..." }`;
            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            };
            const data = await callGemini(requestPayload);
            const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
            return { statusCode: 200, body: JSON.stringify(questionData) };
        }
        
        // PENAMBAHAN: Action baru untuk Cerdas Cermat
        if (action === 'GET_CERDAS_CERMAT_QUESTION') {
            const { history } = payload;
            const topics = ['Ilmu Pengetahuan', 'Geografi', 'Teknologi', 'Kesehatan', 'Agama Islam', 'Bahasa Asing', 'Flora & Fauna', 'Sejarah', 'Soal Cerita Logika', 'Misteri Detektif'];
            const randomTopic = topics[Math.floor(Math.random() * topics.length)];

            const systemPrompt = `Anda adalah pembuat soal untuk kuis Cerdas Cermat.
            Tugas: Buat 1 pertanyaan terbuka (bukan pilihan ganda) yang unik dan menantang dari topik **${randomTopic}**.
            Histori Pertanyaan (JANGAN DIULANG): ${history.join(', ')}
            Format Output JSON: { "question": "...", "answer": "..." }
            Contoh output: { "question": "Siapakah arsitek Masjid Istiqlal di Jakarta?", "answer": "Frederich Silaban" }`;

            const requestPayload = {
                contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            };
            const data = await callGemini(requestPayload);
            const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
            return { statusCode: 200, body: JSON.stringify(questionData) };
        }

        if (action === 'GET_HOST_COMMENTARY') {
            const { isCorrect } = payload;
            let prompt = isCorrect ? `Pemain menjawab BENAR. Beri komentar singkat (1-2 kalimat) yang penuh semangat.` : `Pemain menjawab SALAH. Beri komentar singkat (1-2 kalimat) yang dramatis tapi membangkitkan semangat.`;
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
