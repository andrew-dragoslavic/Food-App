const express = require("express");
const speech = require("@google-cloud/speech");
const { parseOrderText, resolveMenuItems } = require("./aiService.js");
const {
  findAndSelectRestaurant,
  testMenuScraping,
} = require("./services/doordashService.js");

const router = express.Router();
const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_SPEECH_CREDENTIALS,
});

router.post("/transcribe", async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    // Get audio data from multer
    const audioBytes = req.file.buffer.toString("base64");

    // Configure recognition request
    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "en-US",
      },
    };

    // Process with Google Speech API
    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      return res.json({ text: "No speech detected" });
    }

    const transcription = response.results
      .map((result) => result.alternatives[0].transcript)
      .join("\n");

    const parsedOrder = await parseOrderText(transcription);
    // const resultFound = await findAndSelectRestaurant(parsedOrder.restaurant);
    // console.log(resultFound);

    const menuItems = await testMenuScraping();
    const prediction = await resolveMenuItems(parsedOrder, menuItems);
    // console.log(prediction);

    // Send back the text
    res.json({ text: transcription, order: parsedOrder });
  } catch (error) {
    console.error("Speech processing error:", error);
    res
      .status(500)
      .json({ error: "Speech processing failed: " + error.message });
  }
});

module.exports = router;
