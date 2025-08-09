"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, RotateCcw } from "lucide-react";

interface VoiceButtonProps {
  onVoiceResult: (result: {
    prompt: string;
    previewInstructions: string[];
    nextQuestion: string;
  }) => void;
  onReset?: () => void;
}

export function VoiceButton({ onVoiceResult, onReset }: VoiceButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversation, setConversation] = useState<Array<{role: string, content: string}>>([]);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playTTSResponse = async (text: string, audioElement?: HTMLAudioElement) => {
    try {
      console.log('🔊 Playing TTS response:', text);
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
        
        // Use existing audio element or create new one
        const audio = audioElement || new Audio();
        audio.src = audioUrl;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
        try {
          await audio.play();
        } catch (playError) {
          console.warn('Audio blocked by browser policy:', playError);
          // Could show a "Click to play" button here instead
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
      const response = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: transcript,
          history: conversation
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

        // Call the callback with the result
        onVoiceResult(result.data);
        
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
      
      // Handle different error types
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
      
      // Show user-friendly error (you can replace with a toast notification)
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

  const resetConversation = () => {
    setConversation([]);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (onReset) {
      onReset();
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="sm"
        onClick={isListening ? stopListening : startListening}
        disabled={isProcessing}
        className="h-7 text-xs"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span className="ml-1">
          {isProcessing 
            ? "Thinking..." 
            : isListening 
              ? "Listening..." 
              : "Talk"}
        </span>
      </Button>
      
      {conversation.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetConversation}
          disabled={isProcessing || isListening}
          className="h-7 text-xs"
          title="Reset conversation"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
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