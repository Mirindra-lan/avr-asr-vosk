/**
 * index.js
 * This file is the main entry point for the application using Vosk ASR.
 */
require("dotenv").config();

const express = require("express");
const vosk = require("vosk");
const fs = require("fs");

const app = express();

const modelPath = process.env.MODEL_PATH || "model";
if (!fs.existsSync(modelPath)) {
  console.log(
    "Please download the model from https://alphacephei.com/vosk/models and unpack as " +
      modelPath +
      " in the current folder."
  );
  process.exit();
}


/**
 * Handles an audio stream from the client and uses Vosk ASR
 * to recognize the speech and stream the transcript back to the client.
 *
 * @param {Object} req - The Express request object
 * @param {Object} res - The Express response object
 */
const handleAudioStream = async (req, res) => {
  try {
    const model = new vosk.Model(modelPath);
    const sampleRate = 16000; // Vosk expects 16kHz
    const rec = new vosk.Recognizer({ model: model, sampleRate: sampleRate });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    req.on("data", async (chunk) => {      
      try {
        
        // Use synchronous acceptWaveform (the correct API)
        if (rec.acceptWaveform(chunk)) {
          const result = rec.result();
          console.log("Partial result:", result);
          if (result.text) {
            // Send partial results to client
            res.write(result.text);
          }
        }
      } catch (error) {
        console.error("Error processing audio chunk:", error);
      }
    });

    req.on("end", () => {
      console.log("Audio stream ended");
      try {
        rec.free();
        model.free();
        res.end();
      } catch (error) {
        console.error("Error getting final result:", error);
        res.end();
      }
    });
    req.on("error", (err) => {
      console.error("Error receiving audio stream:", err);
      req.destroy();
      res.status(500).json({ message: "Error receiving audio stream" });
    });
  } catch (err) {
    console.error("Error handling audio stream:", err);
    res.status(500).json({ message: err.message });
  }
};

app.post("/speech-to-text-stream", handleAudioStream);

const port = process.env.PORT || 6010;
app.listen(port, () => {
  console.log(`Vosk ASR endpoint listening on port ${port}`);
});
