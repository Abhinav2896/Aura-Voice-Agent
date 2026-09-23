'use client';

import { useState } from 'react';
import { Keyboard, Lock } from 'lucide-react';
import { useVoiceSession } from '@/voice/useVoiceSession';
import { MicButton } from './MicButton';
import { TextInput } from './TextInput';

export function VoiceInteraction() {
  const { state, transcript, start, stop, sendText } = useVoiceSession();
  const [useText, setUseText] = useState(false);

  const handleMicClick = () => {
    if (state === 'idle') {
      start();
    } else {
      stop();
    }
  };

  const stateLabel: Record<string, string> = {
    idle: 'Tap the microphone to start',
    connecting: 'Connecting...',
    listening: 'Listening...',
    thinking: 'Processing your request...',
    speaking: 'Aura is speaking...',
    error: 'An error occurred',
    disconnected: 'Disconnected',
  };
  const currentLabel = stateLabel[state] ?? 'Ready';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Transcript display */}
      {transcript.length > 0 && (
        <div className="w-full max-w-md space-y-2 px-4">
          {transcript.map((entry, i) => (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg ${
                entry.role === 'user'
                  ? 'bg-blue-50 text-blue-900 ml-8'
                  : 'bg-gray-50 text-gray-900 mr-8'
              }`}
            >
              <span className="text-xs font-medium text-gray-500 block mb-0.5">
                {entry.role === 'user' ? 'You' : 'Aura'}
              </span>
              {entry.text}
            </div>
          ))}
        </div>
      )}

      {/* State label */}
      <p className="text-sm text-gray-500">{currentLabel}</p>

      {/* Mic button or Text input */}
      {useText ? (
        <TextInput onSubmit={sendText} />
      ) : (
        <MicButton state={state} onClick={handleMicClick} />
      )}

      {/* Toggle */}
      <button
        onClick={() => setUseText(!useText)}
        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
      >
        <Keyboard className="w-4 h-4" />
        {useText ? 'Use Voice Instead' : 'Use Text Instead'}
      </button>

      {/* Privacy notice */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Lock className="w-3 h-3" />
        <span>Your conversation is private and secure.</span>
      </div>
    </div>
  );
}
