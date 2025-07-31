const express = require("express");
const speech = require("@google-cloud/speech");
const { parseOrderText, resolveMenuItems } = require("./aiService.js");
const {
  findAndSelectRestaurant,
  testMenuScraping,
} = require("./services/doordashService.js");
const { clarificationService } = require("./services/clarificationService.js");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
const client = new speech.SpeechClient({
  keyFilename: process.env.GOOGLE_SPEECH_CREDENTIALS,
});

const activeSessions = new Map();

function createSession(sessionData) {
  const uuid = uuidv4();
  activeSessions.set(uuid, sessionData);
  return uuid;
}

function getSession(sessionId) {
  const sessionData = activeSessions.get(sessionId);
  return sessionData;
}

function updateSession(sessionId, newData) {
  const existing = getSession(sessionId);
  if (existing) {
    activeSessions.set(sessionId, { ...existing, ...newData });
  }
  return sessionId;
}

function deleteSession(sessionId) {
  activeSessions.delete(sessionId);
  return sessionId;
}

router.post("/transcribe", async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const sessionId = req.body.sessionId;

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

    let parsedOrder,
      menuItems,
      prediction,
      clarificationResult,
      responseSessionId;

    if (sessionId) {
      // Existing session - this is a clarification request
      const session = getSession(sessionId);
      if (session) {
        // Combine the original order with the new clarification

        // Re-process with combined context
        parsedOrder = await parseOrderText(transcription);
        menuItems = session.menuItems; // Reuse stored menu items
        prediction = await resolveMenuItems(
          parsedOrder,
          menuItems,
          session.currentPrediction
        );

        // Check if we still need clarification
        clarificationResult = clarificationService(prediction);

        console.log("Original transcription:", transcription);
        console.log("Session ID:", sessionId);
        console.log("Clarification result:", clarificationResult);

        if (clarificationResult.needed) {
          // Still need clarification - update session
          updateSession(sessionId, {
            originalTranscription: transcription,
            parsedOrder: parsedOrder,
            currentPrediction: prediction,
            attempts: (session.attempts || 1) + 1,
            lastActivity: new Date(),
          });
          responseSessionId = sessionId;
        } else {
          // No more clarification needed - delete session and proceed with order
          deleteSession(sessionId);
          responseSessionId = null;
          // TODO: Place the order here
        }
      } else {
        // Session not found, treat as new request
        parsedOrder = await parseOrderText(transcription);
        menuItems = await testMenuScraping();
        prediction = await resolveMenuItems(parsedOrder, menuItems);
        clarificationResult = clarificationService(prediction);

        if (clarificationResult.needed) {
          responseSessionId = createSession({
            createdAt: new Date(),
            originalTranscription: transcription,
            parsedOrder: parsedOrder,
            menuItems: menuItems,
            currentPrediction: prediction,
            attempts: 1,
          });
        } else {
          responseSessionId = null;
        }
      }
    } else {
      // New request - no session ID provided
      parsedOrder = await parseOrderText(transcription);
      menuItems = await testMenuScraping();
      prediction = await resolveMenuItems(parsedOrder, menuItems);

      // Check if clarification is needed
      clarificationResult = clarificationService(prediction);

      if (clarificationResult.needed) {
        // Create new session
        responseSessionId = createSession({
          createdAt: new Date(),
          originalTranscription: transcription,
          parsedOrder: parsedOrder,
          menuItems: menuItems,
          currentPrediction: prediction,
          attempts: 1,
        });
      } else {
        // No clarification needed, proceed with order
        responseSessionId = null;
        // TODO: Place the order here
      }
    }

    // Send response
    res.json({
      text: transcription,
      order: parsedOrder,
      prediction: prediction,
      clarification: clarificationResult,
      sessionId: responseSessionId,
      needsClarification: clarificationResult.needed,
    });
  } catch (error) {
    console.error("Speech processing error:", error);
    res
      .status(500)
      .json({ error: "Speech processing failed: " + error.message });
  }
});

module.exports = router;
