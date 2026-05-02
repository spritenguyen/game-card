// src/lib/audio.ts

let audioCtx: AudioContext | null = null;
let bgmOscillator: OscillatorNode | null = null;
let bgmGain: GainNode | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playHitSound = (isCrit: boolean = false) => {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = isCrit ? 'sawtooth' : 'square';
  
  osc.frequency.setValueAtTime(isCrit ? 400 : 150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  
  gain.gain.setValueAtTime(isCrit ? 0.3 : 0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (isCrit ? 0.3 : 0.1));
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

export const playSkillSound = () => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

export const playGlassBreakSound = () => {
    if (!audioCtx) return;
    
    // Noise buffer for shatter
    const bufferSize = audioCtx.sampleRate * 0.5;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter to make it sound crisp
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
}

export const startCombatBgm = () => {
  if (!audioCtx) return;
  if (!bgmOscillator) {
    bgmOscillator = audioCtx.createOscillator();
    bgmGain = audioCtx.createGain();
    
    bgmOscillator.type = 'sawtooth';
    bgmOscillator.frequency.value = 60; // low drone
    
    bgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 2);
    
    bgmOscillator.connect(bgmGain);
    bgmGain.connect(audioCtx.destination);
    
    bgmOscillator.start();
    
    // LFO for drone
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 2; // slow pulse
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(bgmOscillator.frequency);
    lfo.start();
  }
};

export const stopCombatBgm = () => {
  if (bgmOscillator && bgmGain && audioCtx) {
    bgmGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
    setTimeout(() => {
      if (bgmOscillator) {
        bgmOscillator.stop();
        bgmOscillator.disconnect();
        bgmOscillator = null;
      }
      if (bgmGain) {
         bgmGain.disconnect();
         bgmGain = null;
      }
    }, 1000);
  }
};
