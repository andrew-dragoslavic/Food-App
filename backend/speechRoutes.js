const express = require("express");
const speech = require("@google-cloud/speech");
const { parseOrderText, resolveMenuItems } = require("./aiService.js");
const {
  findAndSelectRestaurant,
  testMenuScraping,
  placeOrder,
  getDoorDashPage,
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
    let transcription;
    const sessionId = req.body.sessionId;

    // Check if this is a text-based clarification or audio
    if (req.body.text) {
      // Text-based clarification
      transcription = req.body.text;
      console.log("📝 Processing text clarification:", transcription);
    } else {
      // Audio-based request
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "No audio file or text provided" });
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

      transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join("\n");
    }

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
        restaurant = session.restaurant;
        parsedOrder = await parseOrderText(
          transcription,
          restaurant,
          session.initialItems
        );
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
            initialItems: parsedOrder,
            parsedOrder: parsedOrder,
            menuItems: menuItems,
            restaurant: parsedOrder.restaurant,
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
          initialItems: parsedOrder,
          parsedOrder: parsedOrder,
          menuItems: menuItems,
          restaurant: parsedOrder.restaurant,
          currentPrediction: prediction,
          attempts: 1,
        });
      } else {
        // No clarification needed, proceed with order
        responseSessionId = null;
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

router.post("/place-order", async (req, res) => {
  try {
    const { confirmedItems, restaurant } = req.body;

    if (!confirmedItems || confirmedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No confirmed items provided",
      });
    }

    console.log(
      `🍕 Starting order placement for ${confirmedItems.length} items`
    );
    console.log("Confirmed items:", confirmedItems);

    // Get the current DoorDash page (already on restaurant page)
    // const doordashPage = getDoorDashPage();

    // Just scroll back to the top of the restaurant page
    console.log("📍 Scrolling back to top of restaurant page...");
    // await doordashPage.evaluate(() => window.scrollTo(0, 0));
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for scroll

    // Place the order using the current page
    const orderResult = await placeOrder(confirmedItems);

    console.log("📋 Order placement result:", orderResult);
    res.json(orderResult);
  } catch (error) {
    console.error("❌ Order placement error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message,
    });
  }
});

module.exports = router;
