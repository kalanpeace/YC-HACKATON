"use client";

import { useState, useRef, useEffect } from "react";
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const button = document.getElementById('tal-voice-button');
      if (button) {
        const rect = button.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) * 0.05;
        const deltaY = (e.clientY - centerY) * 0.05;

        setMousePosition({ x: deltaX, y: deltaY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Screenshot capture temporarily disabled for speed
  // Will be re-enabled with server-side capture later

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
      console.log('🎤 Processing voice message:', transcript);
      
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
          // screenshot: null - removed for speed
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


  // Tal the cute sun avatar - voice button
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        id="tal-voice-button"
        className="relative cursor-pointer select-none"
        onClick={isListening ? stopListening : startListening}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={isProcessing ? "Tal is thinking..." : isListening ? "Listening... (click to stop)" : "Hi! I'm Tal - click to talk!"}
      >
        {/* Tal the sun-inspired character */}
        <div className={`w-16 h-16 relative transition-all duration-500 ${
          isHovered ? 'scale-110' : 'scale-100'
        } ${
          isListening ? 'animate-pulse' : ''
        }`}>

          {/* Cute sun rays */}
          <div className="absolute inset-0">
            <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0.5 h-3 rounded-full animate-pulse ${
              isListening ? 'bg-red-400/60' : isProcessing ? 'bg-blue-400/60' : 'bg-yellow-400/40'
            }`}></div>
            <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-0.5 h-3 rounded-full animate-pulse delay-100 ${
              isListening ? 'bg-red-400/60' : isProcessing ? 'bg-blue-400/60' : 'bg-yellow-400/40'
            }`}></div>
            <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-3 h-0.5 rounded-full animate-pulse delay-200 ${
              isListening ? 'bg-red-400/60' : isProcessing ? 'bg-blue-400/60' : 'bg-yellow-400/40'
            }`}></div>
            <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1 w-3 h-0.5 rounded-full animate-pulse delay-300 ${
              isListening ? 'bg-red-400/60' : isProcessing ? 'bg-blue-400/60' : 'bg-yellow-400/40'
            }`}></div>
          </div>

          {/* Warm glow */}
          <div className={`absolute inset-0 rounded-full blur-sm animate-pulse transition-colors duration-500 ${
            isListening ? 'bg-red-300/30' : isProcessing ? 'bg-blue-300/30' : 'bg-yellow-300/30'
          }`}></div>

          {/* Main sunny body */}
          <div className={`absolute inset-1 rounded-full backdrop-blur-sm border-2 shadow-lg transition-all duration-500 ${
            isListening 
              ? 'bg-gradient-to-br from-red-100/95 to-red-200/85 border-red-200/70' 
              : isProcessing
              ? 'bg-gradient-to-br from-blue-100/95 to-blue-200/85 border-blue-200/70'
              : 'bg-gradient-to-br from-yellow-100/95 to-orange-100/85 border-yellow-200/70'
          }`}>

            {/* Cheerful face area */}
            <div className="absolute inset-1 bg-gradient-to-br from-white/90 to-yellow-50/70 rounded-full">

              {/* Happy eyes */}
              <div className="absolute top-1/3 left-1/4 transform -translate-x-1/2">
                <div className="w-2 h-2 bg-white rounded-full shadow-inner border border-yellow-200/50">
                  <div 
                    className={`w-1 h-1 rounded-full mt-0.5 ml-0.5 transition-all duration-300 ${
                      isListening ? 'bg-red-600' : isProcessing ? 'bg-blue-600' : 'bg-gray-800'
                    } ${isHovered ? 'animate-bounce' : ''}`}
                    style={{
                      transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
                    }}
                  ></div>
                  <div className="absolute top-0 left-0.5 w-0.5 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>

              <div className="absolute top-1/3 right-1/4 transform translate-x-1/2">
                <div className="w-2 h-2 bg-white rounded-full shadow-inner border border-yellow-200/50">
                  <div 
                    className={`w-1 h-1 rounded-full mt-0.5 ml-0.5 transition-all duration-300 ${
                      isListening ? 'bg-red-600' : isProcessing ? 'bg-blue-600' : 'bg-gray-800'
                    } ${isHovered ? 'animate-bounce delay-100' : ''}`}
                    style={{
                      transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
                    }}
                  ></div>
                  <div className="absolute top-0 left-0.5 w-0.5 h-0.5 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Sweet smile */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-1">
                <div className={`w-2 h-1 border border-t-0 rounded-b-lg transition-all duration-300 ${
                  isListening ? 'border-red-500/70' : isProcessing ? 'border-blue-500/70' : 'border-orange-500/70'
                } ${isHovered ? 'animate-pulse w-3' : ''}`}></div>
              </div>

              {/* Warm cheeks */}
              <div className={`absolute top-1/2 left-1 w-1 h-1 rounded-full transition-all duration-300 ${
                isListening ? 'bg-red-300/50' : isProcessing ? 'bg-blue-300/50' : 'bg-yellow-300/50'
              } ${isHovered ? 'bg-opacity-70 animate-pulse' : ''}`}></div>
              <div className={`absolute top-1/2 right-1 w-1 h-1 rounded-full transition-all duration-300 ${
                isListening ? 'bg-red-300/50' : isProcessing ? 'bg-blue-300/50' : 'bg-yellow-300/50'
              } ${isHovered ? 'bg-opacity-70 animate-pulse' : ''}`}></div>

            </div>
          </div>

          {/* Processing spinner overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          )}

          {/* Floating particles */}
          <div className={`absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full animate-twinkle shadow-sm ${
            isListening ? 'bg-red-400' : isProcessing ? 'bg-blue-400' : 'bg-yellow-400'
          }`}></div>
          <div className={`absolute -bottom-0.5 -left-0.5 w-0.5 h-0.5 rounded-full animate-twinkle delay-500 shadow-sm ${
            isListening ? 'bg-red-400' : isProcessing ? 'bg-blue-400' : 'bg-orange-400'
          }`}></div>
        </div>

      </div>
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