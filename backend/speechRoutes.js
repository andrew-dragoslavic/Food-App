const express = require('express');
const speech = require('@google-cloud/speech')

const router = express.Router();
const client = new speech.SpeechClient({
    keyFilename: process.env.GOOGLE_SPEECH_CREDENTIALS
});

router.post('/transcribe', async (req, res) => {
    try {
        const audioBytes = req.body.audio;

        const request = {
            audio: {
                content: audioBytes
            },
            config: {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            },
        };

        const [response] = await client.recognize(request);
        const transcription = response.results.map(result => result.alternatives[0].transcipt).join('\n');

        res.json({ text: transcription });

    } catch (error) {
        console.error('Speech processing error:', error);
        res.status(500).json({ error: "Speech processing failed" });
    }
})

module.exports = router;