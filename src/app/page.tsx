"use client";

import { useRouter } from "next/navigation";
import { FrameworkSelector } from "@/components/framework-selector";
import { useState } from "react";
import { ExampleButton } from "@/components/ExampleButton";
import { UserButton } from "@stackframe/stack";
import { UserApps } from "@/components/user-apps";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HomeVoiceButton } from "@/components/home-voice-button";

const queryClient = new QueryClient();

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [framework, setFramework] = useState("nextjs");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<Array<{role: string, content: string}>>([]);
  const [triggerMessage, setTriggerMessage] = useState<string | undefined>(undefined);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);

    // Encode voice history to pass to the editor
    const voiceHistoryParam = voiceHistory.length > 0 
      ? `&voiceHistory=${encodeURIComponent(JSON.stringify(voiceHistory))}`
      : '';

    router.push(
      `/app/new?message=${encodeURIComponent(prompt)}&template=${framework}${voiceHistoryParam}`
    );
  };

  const handleVoiceResult = (result: {
    prompt: string;
    previewInstructions: string[];
    nextQuestion: string;
  }) => {
    // Fill the prompt text box with the generated prompt
    setPrompt(result.prompt);
    
    // Log the other data for debugging
    console.log('Voice result:', result);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen p-4 relative">
        <div className="flex w-full justify-end items-center">
          <div className="flex items-center gap-2">
            <UserButton />
          </div>
        </div>

        <div>
          <div className="w-full max-w-lg px-4 sm:px-0 mx-auto flex flex-col items-center mt-16 sm:mt-24 md:mt-32 col-start-1 col-end-1 row-start-1 row-end-1 z-10">
            <p className="text-neutral-600 text-center mb-2 text-3xl sm:text-4xl md:text-5xl font-bold">
              Tal
            </p>
            <p className="text-neutral-500 text-center mb-6 text-lg sm:text-xl">
              Say it. See it.
            </p>

            {/* Tal Voice Interface */}
            <div className="w-full relative my-8">
              <HomeVoiceButton 
                onVoiceResult={handleVoiceResult}
                onConversationChange={setVoiceHistory}
                onConfirmCreate={handleSubmit}
                triggerMessage={triggerMessage}
                onMessageProcessed={() => setTriggerMessage(undefined)}
              />
            </div>

            {/* Framework Selector */}
            <div className="mt-8 mb-4">
              <FrameworkSelector
                value={framework}
                onChange={setFramework}
              />
            </div>
            <Examples setPrompt={setPrompt} />
          </div>
        </div>
        <div className="border-t py-8 mx-0 sm:-mx-4">
          <UserApps />
        </div>
      </main>
    </QueryClientProvider>
  );
}

function Examples({ setPrompt }: { setPrompt: (text: string) => void }) {
  return (
    <div className="mt-8">
      <p className="text-center text-sm text-gray-500 mb-4">Need help? Start a conversation with these:</p>
      <div className="flex flex-wrap justify-center gap-2 px-2">
        <ExampleButton
          text="I want a coffee shop website"
          promptText="I want a coffee shop website with online ordering and menu display"
          onClick={(text) => {
            console.log("Example clicked:", text);
            setTriggerMessage(text);
          }}
        />
        <ExampleButton
          text="Help me build a portfolio"
          promptText="Help me build a personal portfolio to showcase my work and skills"
          onClick={(text) => {
            console.log("Example clicked:", text);
            setTriggerMessage(text);
          }}
        />
        <ExampleButton
          text="I need a business website"
          promptText="I need a professional business website with services and contact info"
          onClick={(text) => {
            console.log("Example clicked:", text);
            setTriggerMessage(text);
          }}
        />
      </div>
    </div>
  );
}
