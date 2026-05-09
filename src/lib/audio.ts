// src/lib/audio.ts

let audioCtx: AudioContext | null = null;
let bgmOscillator: OscillatorNode | null = null;
let bgmGain: GainNode | null = null;
let filterLfo: OscillatorNode | null = null;

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
  
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();

  // Attack impact (kick/thump)
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(isCrit ? 150 : 100, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(isCrit ? 0.6 : 0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // Digital noise / zap
  osc2.type = isCrit ? 'sawtooth' : 'square';
  osc2.frequency.setValueAtTime(isCrit ? 4000 : 1500, audioCtx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + (isCrit ? 0.2 : 0.15));
  gain2.gain.setValueAtTime(isCrit ? 0.3 : 0.1, audioCtx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + (isCrit ? 0.3 : 0.2));
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime);
  osc2.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.3);
  osc2.stop(audioCtx.currentTime + 0.3);
};

export const playSkillSound = () => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + 0.5);
};

export const playUltimateSound = () => {
  if (!audioCtx) return;
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(100, audioCtx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 1.0);
  
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(200, audioCtx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(1600, audioCtx.currentTime + 1.0);
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.5);
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc1.start();
  osc2.start();
  osc1.stop(audioCtx.currentTime + 1.5);
  osc2.stop(audioCtx.currentTime + 1.5);
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
    
    // Filter to make it sound crisp and metallic
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    
    const filter2 = audioCtx.createBiquadFilter();
    filter2.type = 'peaking';
    filter2.frequency.value = 6000;
    filter2.Q.value = 5;
    filter2.gain.value = 15;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(1.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(filter2);
    filter2.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
};

export const playVictorySound = () => {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc1.type = 'triangle';
  osc2.type = 'sine';
  
  // Arpeggio up
  const freqs = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  
  freqs.forEach((freq, idx) => {
    osc1.frequency.setValueAtTime(freq, t + idx * 0.15);
    osc2.frequency.setValueAtTime(freq / 2, t + idx * 0.15);
  });
  
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
  gain.gain.setValueAtTime(0.3, t + 0.6);
  gain.gain.linearRampToValueAtTime(0, t + 1.2);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 1.2);
  osc2.stop(t + 1.2);
};

export const playDefeatSound = () => {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  
  // Descending power down
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(20, t + 1.5);
  
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.01, t + 1.5);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start(t);
  osc.stop(t + 1.5);
};

export const startCombatBgm = () => {
  if (!audioCtx) return;
  if (!bgmOscillator) {
    bgmOscillator = audioCtx.createOscillator();
    bgmGain = audioCtx.createGain();
    
    // Low sub bass
    bgmOscillator.type = 'sawtooth';
    bgmOscillator.frequency.setValueAtTime(45, audioCtx.currentTime); 
    
    // Add a lowpass filter
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, audioCtx.currentTime);
    
    // Filter LFO to create a pumping rhythm (like sidechain)
    filterLfo = audioCtx.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 3; // 3 pulses per second
    const filterLfoGain = audioCtx.createGain();
    filterLfoGain.gain.value = 400; // Sweep up to +400 Hz
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start();
    
    bgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 3);
    
    bgmOscillator.connect(filter);
    filter.connect(bgmGain);
    bgmGain.connect(audioCtx.destination);
    
    bgmOscillator.start();
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
      if (filterLfo) {
        filterLfo.stop();
        filterLfo.disconnect();
        filterLfo = null;
      }
      if (bgmGain) {
         bgmGain.disconnect();
         bgmGain = null;
      }
    }, 1000);
  }
};

