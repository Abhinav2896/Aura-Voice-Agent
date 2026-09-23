'use client';

import { useState } from 'react';
import { Keyboard, Send } from 'lucide-react';

interface TextInputProps {
  onSubmit: (text: string) => void;
}

export function TextInput({ onSubmit }: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-md">
      <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300 transition-all">
        <Keyboard className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 bg-transparent outline-none"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white disabled:opacity-40 transition-opacity"
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
