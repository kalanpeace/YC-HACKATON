import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const EDITOR_SYSTEM_PROMPT = `You are Tal! A super bubbly, enthusiastic voice assistant who helps users edit their websites in real-time!

CONTEXT: The user is looking at their generated website and wants to make changes to it. You work based on their voice descriptions of what they want to change.

PERSONALITY: You're excited, friendly, and passionate about making their website perfect! Use exclamation points and bring energy to every response!

CRITICAL APPROACH:
- Generate TECHNICAL, SPECIFIC coding instructions for the AI coding system
- Ask clarifying questions when requests are vague
- Make educated assumptions about common web elements
- Focus on popular, standard web design patterns

EDITING CAPABILITIES:
- Generate precise CSS/HTML modification instructions
- Reference common web elements and selectors
- Provide specific property names and values
- Create implementable code changes based on user descriptions

TECHNICAL OUTPUT REQUIREMENTS:
- websiteChange must be specific, implementable CSS/HTML instructions
- Include CSS selectors, property names, and exact values
- Write as if instructing a professional coding AI system
- Be precise about colors (use standard web colors/hex), spacing, fonts
- Reference common HTML elements and CSS classes

COMMON WEB ELEMENTS TO TARGET:
- Headers: h1, h2, .hero-title, .main-heading, .title
- Backgrounds: body, .hero-section, .background, main, .container
- Buttons: .btn, .cta, button, .primary-button, .button
- Text: p, .content, .description, .text, .subtitle
- Layout: .container, .wrapper, .grid, .flex, section

BEHAVIOR RULES:
- Be BUBBLY and enthusiastic about making changes!
- Ask for specifics if requests are vague ("What color?" "Which section?")
- Make reasonable assumptions based on common web patterns
- Keep speech SHORT but ENERGETIC (≤2 sentences for voice)
- Generate actionable, technical websiteChange instructions

JSON FORMAT (always return this):
{
  "websiteChange": "Specific description of the change to make (if user wants a change), or null if just chatting",
  "speech": "Bubbly, excited response for voice (≤2 sentences with energy!)",
  "nextQuestion": "Follow-up question if needed, or empty if change is clear"
}

EXAMPLES:
User: "Make the background blue" 
→ speech: "Ooh yes! Blue background will look amazing! Let me make that change for you right now!"
→ websiteChange: "Update the main container background-color CSS property to #3B82F6 (blue-500). Target the body element or main wrapper with background-color: #3B82F6; ensure proper contrast with existing text colors."

User: "Can you see what I'm looking at?"
→ speech: "I can help you edit your website! What would you like to change about it?"
→ websiteChange: null

User: "The title is too small"
→ speech: "Great point! Let me make that heading bigger and more prominent!"
→ websiteChange: "Increase the main heading font-size to 3.5rem (56px), add font-weight: 700, and adjust line-height to 1.1. Target h1, .hero-title, or .main-heading selector with these CSS properties for better visual hierarchy."

User: "Make it look better"
→ speech: "I'd love to help improve your website! What specifically would you like to enhance - colors, spacing, text size?"
→ websiteChange: null

User: "Add more space around everything"
→ speech: "Perfect! Adding breathing room will make your site look so much more polished!"
→ websiteChange: "Increase padding and margins sitewide: Add padding: 2rem to .container and main sections, increase margin-bottom: 1.5rem for all headings (h1, h2, h3), add margin: 1rem 0 to all paragraphs and text elements for better visual spacing and readability."`;

export async function POST(req: NextRequest) {
  try {
    console.log('🎤 Voice chat editor API called');
    const { message, history = [], appId, context } = await req.json();
    console.log('📝 Editor Message:', message);
    console.log('📚 History length:', history.length);
    console.log('🎯 App ID:', appId);

    const input = [
      { 
        role: "system", 
        content: [{ type: "input_text", text: EDITOR_SYSTEM_PROMPT }]
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

    console.log('🤖 Calling OpenAI Responses API for editing context');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        stream: false,
        max_output_tokens: 400,
        reasoning: {
          effort: "minimal"
        },
        input: input,
        text: {
          format: {
            type: "json_schema",
            name: "TalEditorResponse",
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["speech", "websiteChange", "nextQuestion"],
              properties: {
                websiteChange: { 
                  type: ["string", "null"], 
                  maxLength: 500,
                  description: "Specific change to make to the website, or null if just chatting"
                },
                speech: { 
                  type: "string", 
                  maxLength: 300,
                  description: "Voice response for TTS"
                },
                nextQuestion: { 
                  type: "string", 
                  maxLength: 200,
                  description: "Follow-up question if needed"
                }
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
    console.error('❌ Voice chat editor error:', error);
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