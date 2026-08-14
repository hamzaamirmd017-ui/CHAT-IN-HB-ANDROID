export interface StoryAudioTrack {
  id: string;
  title: string;
  artist: string;
  category: string;
  duration: string;
  url: string;
  coverEmoji: string;
}

export const PRESET_STORY_TRACKS: StoryAudioTrack[] = [
  {
    id: 'track-1',
    title: 'Acoustic Sunset Vibe',
    artist: 'Chill Acoustic',
    category: 'Acoustic',
    duration: '0:30',
    coverEmoji: '🎸',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'track-2',
    title: 'Lofi Midnight Beats',
    artist: 'Lofi Dreams',
    category: 'Chill',
    duration: '0:30',
    coverEmoji: '☕',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 'track-3',
    title: 'Upbeat Energy Groove',
    artist: 'Pop Soundlabs',
    category: 'Pop',
    duration: '0:25',
    coverEmoji: '🔥',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: 'track-4',
    title: 'Neon Cyberwave',
    artist: 'Synth Retro',
    category: 'Electronic',
    duration: '0:30',
    coverEmoji: '🌌',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
  {
    id: 'track-5',
    title: 'Soft Serenade Piano',
    artist: 'Melody Woods',
    category: 'Piano',
    duration: '0:30',
    coverEmoji: '🎹',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  },
  {
    id: 'track-6',
    title: 'Summer Island Breeze',
    artist: 'Tropical Beats',
    category: 'Summer',
    duration: '0:30',
    coverEmoji: '🌴',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3'
  },
  {
    id: 'track-7',
    title: 'Calm Breeze Guitar',
    artist: 'Acoustic Acoustic',
    category: 'Acoustic',
    duration: '0:30',
    coverEmoji: '🎼',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'
  },
  {
    id: 'track-8',
    title: 'Electro Funk Rhythm',
    artist: 'Synth Masters',
    category: 'Electronic',
    duration: '0:30',
    coverEmoji: '🎛️',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'
  }
];
