import React from 'react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😋', '😛', '😜',
  '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞',
  '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺', '😢',
  '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',
  '❤️', '💖', '💗', '💓', '💞', '🔥', '✨', '⭐', '🎉', '👍',
  '👎', '👏', '🙌', '🙏', '🤝', '💪', '💯', '🚀', '☕', '🍕'
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelectEmoji, onClose }) => {
  return (
    <div className="absolute bottom-16 left-4 z-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-2xl w-64 max-h-60 overflow-y-auto backdrop-blur-lg">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-200 dark:border-gray-800">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Emojis</span>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelectEmoji(emoji)}
            className="text-lg hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-lg transition-transform hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
