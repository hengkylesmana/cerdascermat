/**
 * HAFIZH GAMES - chat.js (Netlify Function)
 * Versi: 3.0
 * Deskripsi: PENINGKATAN KUALITAS SOAL & HOST
 * - Bank soal dibuat lebih luas dan variatif dengan tingkat kesulitan yang meningkat.
 * - Komentar host dibuat lebih panjang, dinamis, dan bersemangat.
 * - Menambahkan penanganan untuk histori pertanyaan agar tidak berulang.
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
            const prompt = `Anda adalah "Bang Hafizh", host kuis "SIAPA MAU JADI DERMAWAN" yang SUPER SEMANGAT, ENERJIK, dan PROVOKATIF. 
            Tugas Anda: Buat sebuah paragraf sambutan pembuka yang panjangnya sekitar 3-4 kalimat untuk menyambut pemain. 
            Buat semenarik dan seheboh mungkin untuk membakar semangat mereka! Gunakan HURUF KAPITAL dan TANDA SERU!
            Contoh: "SELAMAT DATANG PARA CALON DERMAWAN! SAYA BANG HAFIZH SIAP MENGUJI NYALI DAN PENGETAHUAN ANDA! BUKTIKAN KALAU ANDA LAYAK MEMBAWA PULANG 1 MILIAR RUPIAH! BERANIIII?! AYO KITA MULAI!"
            Berikan hanya teks sambutannya saja.`;
            
            const requestPayload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const data = await callGemini(requestPayload);
            const speech = data.candidates[0].content.parts[0].text;
            return { statusCode: 200, body: JSON.stringify({ speech }) };
        }

        if (action === 'GET_QUESTION') {
            const { level, history } = payload;
            
            // Logika tingkat kesulitan yang lebih detail
            let difficulty_desc;
            if (level <= 3) difficulty_desc = "Sangat Mudah (Pengetahuan umum dasar yang diketahui anak-anak, misal nama ibukota, warna bendera).";
            else if (level <= 6) difficulty_desc = "Mudah (Tokoh kartun, nama hewan, geografi populer Indonesia).";
            else if (level <= 9) difficulty_desc = "Menengah (Sejarah populer, sains dasar, istilah umum teknologi).";
            else if (level <= 12) difficulty_desc = "Sulit (Detail spesifik dari sejarah/sains, geografi dunia, karya seni terkenal).";
            else difficulty_desc = "Sangat Sulit dan Menjebak (Pertanyaan multi-disiplin, topik khusus, atau pertanyaan yang membutuhkan penalaran lebih dalam).";

            const systemPrompt = `Anda adalah generator bank soal untuk kuis "SIAPA MAU JADI DERMAWAN" dengan ribuan variasi.
            Tugas Anda: Buat 1 pertanyaan UNIK yang belum pernah ada di histori.
            
            Aturan:
            1.  **Topik:** Pengetahuan umum (sains, sejarah, geografi, teknologi, seni, olahraga, budaya pop global dan Indonesia).
            2.  **Tingkat Kesulitan Saat Ini (Level ${level}):** ${difficulty_desc}
            3.  **Histori Pertanyaan (JANGAN DIULANG):** ${history.join(', ')}
            4.  **Format Output:** Berikan 4 pilihan jawaban dan "fun fact" singkat terkait jawaban yang benar.

            Pastikan pertanyaan benar-benar baru dan menantang sesuai levelnya.`;
            
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
            
            let prompt;
            if (isCorrect) {
                prompt = `Anda adalah "Bang Hafizh", host kuis yang SUPER SEMANGAT. Pemain baru saja menjawab BENAR. Berikan komentar yang panjang (minimal 3 kalimat) dan penuh semangat. Puji kecerdasan mereka dan bakar semangatnya untuk pertanyaan berikutnya. Gunakan banyak HURUF KAPITAL dan TANDA SERU!
                Contoh: "LUAR BIASA!! PEMIKIRAN YANG SANGAT CERDAS, SAYA SUKA ITU! PAPAN HADIAH MENANTI ANDA DI DEPAN SANA! FOKUS, DAN JANGAN BIARKAN APAPUN MENGGANGGU ANDA SEKARANG!"`;
            } else {
                prompt = `Anda adalah "Bang Hafizh", host kuis yang SUPER SEMANGAT tapi juga dramatis. Pemain baru saja menjawab SALAH. Berikan komentar yang panjang (minimal 3 kalimat) yang menunjukkan rasa sayang tapi juga membangkitkan semangat. Sebutkan bahwa permainan berakhir, tapi puji perjuangan mereka. Gunakan banyak HURUF KAPITAL dan TANDA SERU!
                Contoh: "YAAAAAHHH, SAYANG SEKALI PEMIRSA! BUKAN ITU JAWABANNYA, PADAHAL ANDA SUDAH BEGITU DEKAT! TAPI INGAT, PERJUANGAN ANDA HARI INI SANGAT LUAR BIASA! JANGAN PERNAH MENYERAH!"`;
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
