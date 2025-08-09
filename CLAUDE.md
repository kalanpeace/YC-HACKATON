# Tal - Voice-Controlled AI Website Builder

## What is Tal?

Tal is a voice-first AI website builder that lets you create websites through natural conversation. Say what you want, Tal responds with voice, and generates detailed prompts for building your site.

**Tagline:** "Say it. See it." 

## How It Works

1. **Click the "Talk" button** on the landing page
2. **Speak your website idea** (e.g., "I want a coffee shop landing page")  
3. **Tal responds with voice** asking clarifying questions
4. **Natural conversation** to refine your requirements
5. **Tal fills the prompt** automatically when ready
6. **Click "Start Creating"** to build your website

## Technology Stack

- **Frontend:** Next.js 15 with React 19, Tailwind CSS
- **Voice Input:** Browser Web Speech API  
- **AI Conversation:** OpenAI GPT-5 mini via Responses API
- **Voice Output:** ElevenLabs text-to-speech (Rachel voice)
- **Website Generation:** Claude 4 Sonnet via existing Adorable pipeline
- **Infrastructure:** Freestyle.sh for app hosting, Neon PostgreSQL, Redis

## Key Features

- 🎤 **Voice-First Interface** - No typing required
- 🗣️ **Natural Conversation** - Tal asks follow-up questions like a real designer
- ⚡ **Fast Responses** - GPT-5 mini with minimal reasoning effort
- 🎵 **Bubbly Personality** - Tal is friendly and excited to help
- 🌐 **Website-Focused** - Only builds websites, web apps, and landing pages
- 📱 **Mobile-Friendly** - Works on all devices with microphone access

## API Endpoints

### `/api/voice-chat`
- Handles conversation with GPT-5 mini
- Input: user transcript + conversation history
- Output: structured JSON with prompt, preview instructions, next question

### `/api/speak`  
- Converts text to speech using ElevenLabs
- Input: text to speak
- Output: audio stream (MP3)

## Environment Variables Required

```env
# Core APIs
OPENAI_API_KEY=sk-proj-...        # GPT-5 mini conversations
ELEVEN_LABS_API_KEY=sk_...        # Text-to-speech
ANTHROPIC_API_KEY=sk-ant-...      # Website generation
FREESTYLE_API_KEY=...             # App hosting

# Database
DATABASE_URL=postgresql://...     # Neon PostgreSQL
REDIS_URL=redis://localhost:6379  # Local Redis

# Auth (Stack Auth)
NEXT_PUBLIC_STACK_PROJECT_ID=...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start Redis (required)
docker run --name adorable-redis -p 6379:6379 -d redis

# Initialize database
npx drizzle-kit push
```

## Usage Notes

- **Chrome/Edge recommended** for best speech recognition
- **Allow microphone access** when prompted
- **Speak clearly** for better transcription
- **Wait for Tal's response** before speaking again
- **Voice conversations are ephemeral** - no persistent memory between sessions

## Demo Flow

1. User: "Hi" 
2. Tal: "Hi! I'm Tal! What kind of website do you want to build?"
3. User: "A portfolio for my photography business"
4. Tal: "Great! What's your photography style and who are your ideal clients?"
5. User: "Wedding photography, couples getting married"
6. Tal: "Perfect! Ready to build a romantic wedding photography portfolio?"
7. User: "Yes!"
8. Tal generates detailed prompt and fills the input box
9. User clicks "Start Creating" and the website is built

## Current Status

✅ Voice input working (Web Speech API)
✅ GPT-5 mini conversation flow  
✅ Structured JSON responses
✅ Prompt generation and auto-fill
✅ ElevenLabs TTS integration
✅ Bubbly Tal personality
✅ Website-focused prompting
✅ Mobile-responsive UI

## Known Issues

- TTS may have slight delay on first request
- Browser speech recognition requires internet connection
- Some browsers may have different speech recognition capabilities
- ElevenLabs API occasionally has rate limits

## Future Enhancements

- Voice activity detection for hands-free mode
- Multiple voice options for Tal
- Conversation memory across sessions  
- Real-time partial transcription
- Barge-in capability (interrupt Tal mid-speech)
- Visual conversation history