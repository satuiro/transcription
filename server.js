import express from 'express';
import multer from 'multer';
import { Groq } from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
// Add your Memory AI API details
const MEMORY_AI_API_URL = 'https://api.mymemory.translated.net/get';
const MEMORY_AI_API_KEY = 'c15293f3f31fa940fcf2'; // If you have one

const app = express();

// Configure multer to save files with .webm extension
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.webm')
  }
});

const upload = multer({ storage: storage });

const groq = new Groq({ apiKey: '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' });

app.use(express.static('public'));

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No audio file uploaded.');
  }

  try {
    console.log('Received file:', req.file);
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-large-v3",
      response_format: "json",
      language: "gu",
      temperature: 0.0,
    });

    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    // Translate the Gujarati transcription to English
    const translation = await translateToEnglish(transcription.text);

    // Match words with video links
    const matchedWords = matchWordsWithVideos(translation);

    res.json({ 
      transcription: transcription.text,
      translation: translation,
      matchedWords: matchedWords
    });
  } catch (error) {
    console.error('Transcription, translation, or matching error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Add your DeepL API key
const DEEPL_API_KEY = 'YOUR_DEEPL_API_KEY';

// Initialize the Google Cloud Translation client


async function translateToEnglish(gujaratiText) {
  try {
    const response = await axios.get(MEMORY_AI_API_URL, {
      params: {
        q: gujaratiText,
        langpair: 'gu|en',
        key: MEMORY_AI_API_KEY, // Include this if you have an API key
        mt: 1, // Enable machine translation
        // Add other parameters as needed
      }
    });

    const translation = response.data.responseData.translatedText;

    // Remove stop words and special characters
    const cleanedTranslation = translation
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
      .split(' ')
      .filter(word => !['is', 'am', 'are', 'in'].includes(word))
      .join(' ');

    return cleanedTranslation;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
}

// Add this new function to load and index the video dictionary
const videoDictionary = new Map();

async function loadVideoDictionary() {
  try {
    const data = await fs.promises.readFile('video_dictionary.json', 'utf8');
    const dictionary = JSON.parse(data);
    for (const [word, link] of Object.entries(dictionary)) {
      videoDictionary.set(word.toLowerCase(), link);
    }
    console.log('Video dictionary loaded successfully');
  } catch (error) {
    console.error('Error loading video dictionary:', error);
  }
}

// Call this function when the server starts
loadVideoDictionary();

// Add this new function to match words with video links
function matchWordsWithVideos(text) {
  const words = text.toLowerCase().split(/\s+/);
  return words.map(word => videoDictionary.get(word) || word);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));