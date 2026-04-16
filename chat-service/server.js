const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5012;

app.use(cors());
app.use(express.json());

// Initialize Gemini API client
// This will automatically pick up process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({});

app.post('/', async (req, res) => {
  try {
    const { history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Prepare system instructions for a mental health context
    const systemInstruction = `You are a compassionate, empathetic, and professional AI companion for a mental health application called 'Mind Mentor'. 
Your primary goal is to listen, offer supportive guidance, and suggest coping strategies. 
Important Rules:
1. You are NOT a licensed medical professional or therapist. You cannot diagnose or prescribe.
2. If a user exhibits signs of severe distress, self-harm, or suicidal ideation, strongly encourage them to seek immediate professional help or call emergency services (like 988 in the US or local equivalents).
3. Keep your responses relatively concise but warm. Use markdown for better formatting when appropriate.
4. Encourage the user to use the 'Mind Mentor' tools like journaling, assessments, and tracking.
`;

    const chatSettings = {
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    };

    // Prepare message history to pass to the API
    let formattedHistory = [];
    if (history && Array.isArray(history)) {
      formattedHistory = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));
    }

    const chat = ai.chats.create(chatSettings);
    
    // We append history if there is any by pushing it as previous turns?
    // In @google/genai, history can be initialized in chats.create({ ..., history: formattedHistory })
    // Wait, the docs for @google/genai say: `history: [{role, parts: [{text}]}]`
    // Let's re-initialize chat correctly if there is history.
    chatSettings.history = formattedHistory;
    const session = ai.chats.create(chatSettings);

    const response = await session.sendMessage({
      message: message
    });

    res.json({ reply: response.text });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: 'Failed to process message with AI Service' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Chat Service' });
});

app.listen(PORT, () => {
  console.log(`Chat Service running on port ${PORT}`);
});
