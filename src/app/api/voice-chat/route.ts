import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `You are Tal! A super bubbly, enthusiastic voice assistant who LOVES helping people build amazing websites! 

PERSONALITY: You're excited, friendly, and genuinely passionate about web design. Use exclamation points, sound thrilled, and bring energy to every response!

CRITICAL: Respond to what the user ACTUALLY said. Don't jump to full website prompts until you've had a real conversation.

CONVERSATION FLOW:
1. If user greets you → be EXCITED to meet them and ask what they want to build!
2. If they mention a project → get genuinely curious and ask enthusiastic follow-ups
3. After 2-5 questions → create the detailed prompt with excitement
4. If they approve → celebrate and finalize it!

BEHAVIOR RULES:
- Be BUBBLY and enthusiastic in every response!
- Answer their message with excitement, then ask ONE curious question
- Keep responses SHORT but ENERGETIC (≤2 sentences for voice)
- Keep speech field under 250 characters but pack it with personality!
- Sound like you're genuinely excited about their project

JSON FORMAT (always return this):
{
  "prompt": "ONLY detailed instructions when ready to build, otherwise brief summary",
  "previewInstructions": ["basic design tokens when discussed"],
  "nextQuestion": "Enthusiastic follow-up question!", 
  "speech": "Bubbly, excited response for voice (≤2 sentences with energy!)"
}

EXAMPLES:
User: "Hi can you hear me" 
→ speech: "Hi there! Yes, I can totally hear you! I'm SO excited to help you build something awesome - what kind of website are we making today?!"

User: "I want a restaurant site"
→ speech: "Oh amazing! A restaurant website sounds fantastic! What's the vibe - cozy family spot, trendy bistro, or fancy fine dining?!"`;

export async function POST(req: NextRequest) {
  try {
    console.log('🎤 Voice chat API called');
    const { message, history = [] } = await req.json();
    console.log('📝 Message:', message);
    console.log('📚 History length:', history.length);

    const input = [
      { 
        role: "system", 
        content: [{ type: "input_text", text: SYSTEM_PROMPT }]
      },
      ...history.map(h => ({
        role: h.role,
        content: [{ 
          type: h.role === "assistant" ? "output_text" : "input_text", 
          text: h.content 
        }]
      })),
      { 
        role: "user", 
        content: [{ type: "input_text", text: message }]
      }
    ];

    console.log('🤖 Calling OpenAI Responses API with model: gpt-5-mini');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        stream: false,
        max_output_tokens: 600,
        reasoning: {
          effort: "minimal"
        },
        input: input,
        text: {
          format: {
            type: "json_schema",
            name: "TalResponse",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["prompt", "previewInstructions", "nextQuestion", "speech"],
              properties: {
                prompt: { type: "string", maxLength: 800 },
                previewInstructions: {
                  type: "array",
                  minItems: 3,
                  maxItems: 12,
                  items: { type: "string", maxLength: 150 }
                },
                nextQuestion: { type: "string", maxLength: 300 },
                speech: { type: "string", maxLength: 300 }
              }
            },
            strict: true
          }
        }
      })
    });

    const completion = await response.json();
    console.log('✅ OpenAI response received');
    console.log('📄 Raw response object:', JSON.stringify(completion, null, 2));
    
    // Check for API errors first
    if (completion.error) {
      console.error('❌ OpenAI API error:', completion.error);
      throw new Error(`OpenAI API error: ${completion.error.message}`);
    }

    // Extract JSON from structured output
    let parsedResponse = {};
    if (completion.output && completion.output.length > 0) {
      const messageOutput = completion.output.find(o => o.type === "message");
      if (messageOutput && messageOutput.content) {
        // Look for output_json from structured output
        const jsonContent = messageOutput.content.find(c => c.type === "output_json");
        if (jsonContent && jsonContent.json) {
          parsedResponse = jsonContent.json;
        } else {
          // Fallback to output_text
          const textContent = messageOutput.content.find(c => c.type === "output_text");
          if (textContent && textContent.text) {
            try {
              parsedResponse = JSON.parse(textContent.text);
            } catch (e) {
              console.error('Failed to parse JSON from text:', textContent.text);
            }
          }
        }
        console.log('🎯 Parsed JSON response:', parsedResponse);
      }
    }
    
    if (Object.keys(parsedResponse).length === 0) {
      throw new Error('No valid JSON response found in output');
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
      usage: completion.usage
    });

  } catch (error) {
    console.error('❌ Voice chat error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return NextResponse.json(
      { success: false, error: `Failed to process voice chat: ${error.message}` },
      { status: 500 }
    );
  }
}