'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage, TypingIndicator } from './ChatMessage';
import { VoiceController } from './VoiceController';
import { PrivacyNotice } from './PrivacyNotice';
import type { UseVoiceSessionReturn } from '@/voice/useVoiceSession';

interface ChatWindowProps {
  session: UseVoiceSessionReturn;
}

const INITIAL_WELCOME_ENTRY = {
  role: 'assistant' as const,
  text: "Hello! I'm Aura, your AI receptionist. How can I help you today? You can book an appointment, request a prescription, ask about test results, or get information about our practice.",
  timestamp: Date.now() - 60000,
};

export function ChatWindow({ session }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayMessages =
    session.transcript.length > 0
      ? [INITIAL_WELCOME_ENTRY, ...session.transcript]
      : [INITIAL_WELCOME_ENTRY];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, session.state]);

  const currentDateFormatted = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col items-center w-full max-w-[800px] mx-auto">
      {/* Main Glass Conversation Panel */}
      <div className="glass-panel w-full h-[calc(100vh-130px)] max-h-[790px] min-h-[580px] flex flex-col overflow-hidden relative shadow-[0_20px_60px_rgba(50,80,160,0.12)] border-white/80">

        {/* Chat Header */}
        <ChatHeader
          onNewConversation={session.reset}
          isLive={session.state === 'listening' || session.state === 'speaking' || session.state === 'thinking'}
          isAuraSpeaking={session.isAuraSpeaking}
        />

        {/* Conversation Stream (Scrollable with custom slim scrollbar) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 chat-scrollbar">
          {/* Date Indicator Pill */}
          <div className="flex justify-center my-1">
            <span suppressHydrationWarning className="px-3.5 py-1 rounded-full text-[11px] font-medium text-slate-500 bg-white/50 border border-white/70 shadow-2xs backdrop-blur-xs">
              Today, {mounted ? currentDateFormatted : ''}
            </span>
          </div>

          {/* Render All Messages */}
          {displayMessages.map((msg, index) => (
            <ChatMessage key={`${index}-${msg.timestamp}`} message={msg} />
          ))}

          {/* Typing Indicator */}
          {session.state === 'thinking' && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice & Input Controller (Guaranteed Non-overlapping) */}
        <VoiceController
          state={session.state}
          isMuted={session.isMuted}
          isUserSpeaking={session.isUserSpeaking}
          isAuraSpeaking={session.isAuraSpeaking}
          audioLevel={session.audioLevel}
          onMicClick={session.start}
          onToggleMute={session.toggleMute}
          onEndCall={session.stop}
          onSendMessage={session.sendText}
        />
      </div>

      {/* Privacy Notice */}
      <div className="mt-2">
        <PrivacyNotice />
      </div>
    </div>
  );
}
