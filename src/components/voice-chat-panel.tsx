"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, RotateCcw, MessageCircle } from "lucide-react";

interface VoiceChatPanelProps {
  appId: string;
  initialHistory?: Array<{role: string, content: string}>;
  onWebsiteChange?: (changeDescription: string) => void;
}

export function VoiceChatPanel({ appId, initialHistory = [], onWebsiteChange }: VoiceChatPanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>(initialHistory);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTTSResponse = async (text: string, audioElement?: HTMLAudioElement) => {
    try {
      console.log('🔊 Playing Tal response:', text);
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = audioElement || new Audio();
        audio.src = audioUrl;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
        try {
          await audio.play();
        } catch (playError) {
          console.warn('Audio blocked by browser policy:', playError);
        }
      } else {
        console.error('TTS failed:', await response.text());
      }
    } catch (error) {
      console.error('Error playing TTS:', error);
    }
  };

  const processMessage = async (transcript: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch('/api/voice-chat-editor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          history: conversation,
          appId: appId,
          context: "editing"
        }),
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        // Add to conversation history
        const newConversation = [
          ...conversation,
          { role: 'user', content: transcript },
          { role: 'assistant', content: result.data.speech || result.data.nextQuestion || 'Response received' }
        ];
        setConversation(newConversation);

        // If Tal wants to make changes, submit to chat
        if (result.data.websiteChange) {
          // Emit event for chat component to pick up
          const event = new CustomEvent('voice-chat-submit', {
            detail: { message: result.data.websiteChange }
          });
          window.dispatchEvent(event);
          
          // Also notify parent component if provided
          if (onWebsiteChange) {
            onWebsiteChange(result.data.websiteChange);
          }
        }
        
        // Generate and play TTS response using speech field
        if (result.data.speech) {
          await playTTSResponse(result.data.speech, audioRef.current || undefined);
        }
      } else {
        console.error('Voice chat failed:', result.error);
        alert('Failed to process your message. Please try again.');
      }
    } catch (error) {
      console.error('Error processing voice:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = () => {
    // Create audio element early to satisfy browser policy
    audioRef.current = new Audio();
    
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      // Fallback to text input for testing
      const testMessage = prompt('Speech not supported. Enter your message:');
      if (testMessage) {
        processMessage(testMessage);
      }
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      await processMessage(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessing(false);
      
      let errorMessage = 'Voice recognition failed. ';
      switch(event.error) {
        case 'network':
          errorMessage += 'Network error - please check your internet connection and try again.';
          break;
        case 'not-allowed':
          errorMessage += 'Microphone access denied. Please allow microphone access.';
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Please try speaking again.';
          break;
        default:
          errorMessage += `Error: ${event.error}. Please try again.`;
      }
      
      alert(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };


  // Just floating voice button - starts listening immediately
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className={`h-14 w-14 rounded-full shadow-lg transition-all ${
          isListening 
            ? "bg-red-500 hover:bg-red-600 animate-pulse" 
            : isProcessing
            ? "bg-blue-500 hover:bg-blue-600"
            : "bg-primary hover:bg-primary/90"
        }`}
        size="lg"
        title={isProcessing ? "Tal is thinking..." : isListening ? "Listening... (click to stop)" : "Talk to Tal"}
      >
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}