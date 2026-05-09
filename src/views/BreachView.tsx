import React, { useState, useEffect } from 'react';
import { Icon } from '../components/ui/Icon';
import { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  modifyCurrency: (amount: number) => void;
  onAlert: (t: string, m: string) => void;
}

export const BreachView: React.FC<Props> = ({ config, modifyCurrency, onAlert }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetCode, setTargetCode] = useState<string>('');
  const [guesses, setGuesses] = useState<{ guess: string; exact: number; near: number }[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<number>(4);

  const isEn = config.language === 'en';
  const MAX_GUESSES = 8;
  const REWARD = 1500;

  useEffect(() => {
    const cd = localStorage.getItem('cineBreachCooldown');
    if (cd) {
      const remaining = parseInt(cd) - Date.now();
      if (remaining > 0) {
        setCooldown(remaining);
      } else {
        localStorage.removeItem('cineBreachCooldown');
      }
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1000) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const startBreach = () => {
    if (cooldown > 0) return;
    
    // Generate Target
    let tgt = '';
    const chars = '0123456789ABCDEF';
    for (let i = 0; i < difficulty; i++) {
        tgt += chars[Math.floor(Math.random() * chars.length)];
    }
    setTargetCode(tgt);
    setGuesses([]);
    setCurrentGuess('');
    setIsPlaying(true);
  };

  const handleInput = (char: string) => {
    if (currentGuess.length < difficulty) {
       setCurrentGuess(prev => prev + char);
    }
  };

  const backspace = () => {
    setCurrentGuess(prev => prev.slice(0, -1));
  };

  const submitGuess = () => {
    if (currentGuess.length < difficulty) return;

    let exact = 0;
    let near = 0;
    const tgtArr = targetCode.split('');
    const gsArr = currentGuess.split('');

    // Check exacts
    for (let i = 0; i < difficulty; i++) {
        if (gsArr[i] === tgtArr[i]) {
            exact++;
            tgtArr[i] = '#'; // consume
            gsArr[i] = '*'; // consume
        }
    }

    // Check nears
    for (let i = 0; i < difficulty; i++) {
        if (gsArr[i] !== '*') {
            const idx = tgtArr.indexOf(gsArr[i]);
            if (idx !== -1) {
                near++;
                tgtArr[idx] = '#';
            }
        }
    }

    const newGuesses = [...guesses, { guess: currentGuess, exact, near }];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (exact === difficulty) {
        // WIN
        setIsPlaying(false);
        modifyCurrency(REWARD);
        onAlert("SYSTEM BREACHED", isEn ? `Access granted. +${REWARD} DC recovered.` : `Bẻ khóa thành công. Xâm nhập Hệ Thống nhận +${REWARD} DC.`);
        const cdTime = Date.now() + 4 * 60 * 60 * 1000; // 4 hours
        localStorage.setItem('cineBreachCooldown', cdTime.toString());
        setCooldown(cdTime - Date.now());
    } else if (newGuesses.length >= MAX_GUESSES) {
        // LOSE
        setIsPlaying(false);
        onAlert("ACCESS DENIED", isEn ? `Security protocols activated. Code was: ${targetCode}` : `Xâm nhập thất bại. Mã gốc là: ${targetCode}`);
        const cdTime = Date.now() + 1 * 60 * 60 * 1000; // 1 hour penalty
        localStorage.setItem('cineBreachCooldown', cdTime.toString());
        setCooldown(cdTime - Date.now());
    }
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex justify-center pb-12 animate-fade-in relative h-full font-mono">
      <div className="w-full max-w-4xl flex flex-col gap-6 mt-8 px-4 relative z-10 h-full">
         <div className="flex flex-col mb-4 text-center">
             <Icon name="fa-terminal text-5xl text-cinematic-cyan/80 mb-4" />
             <h3 className="text-white text-3xl font-black uppercase tracking-[0.3em] drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]">CYBER BREACH</h3>
             <p className="text-[10px] sm:text-xs text-cinematic-cyan/70 mt-2 uppercase tracking-widest">{isEn ? 'Bypass security to claim Data Credits' : 'Giải mã hệ thống an ninh để thu thập lượng lớn DC'}</p>
         </div>

         {!isPlaying ? (
             <div className="bg-black/80 border border-cinematic-cyan/30 p-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-[inset_0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(0,243,255,0.1)]">
                 <Icon name="fa-lock text-6xl text-zinc-600 mb-6" />
                 {cooldown > 0 ? (
                     <>
                        <div className="text-red-400 font-bold mb-2 tracking-widest">SYSTEM LOCKOUT ACTIVE</div>
                        <div className="text-4xl text-white font-black tracking-widest">{formatTime(cooldown)}</div>
                        <div className="text-xs text-zinc-500 mt-4 uppercase">Awaiting security clearance override...</div>
                     </>
                 ) : (
                     <>
                        <div className="text-zinc-400 text-sm mb-8 max-w-lg leading-relaxed uppercase">
                            {isEn ? 
                            "Crack the hexadecimal code (0-9, A-F) to breach the corporate vault. EXACT matches show green lines, NEAR matches show yellow lines." : 
                            "Giải mã chuỗi Hex (0-9, A-F) để đột nhập máy chủ. Trùng ĐÚNG VỊ TRÍ hiện thanh Xanh, Trùng KÝ TỰ nhưng SAI VỊ TRÍ hiện thanh Vàng."}
                        </div>
                        <button 
                            onClick={startBreach}
                            className="bg-cinematic-cyan/20 text-cinematic-cyan border border-cinematic-cyan px-10 py-4 font-bold text-lg tracking-[0.3em] hover:bg-cinematic-cyan hover:text-black transition-all rounded hover:shadow-[0_0_30px_rgba(0,243,255,0.6)]"
                        >
                            INITIATE BREACH
                        </button>
                     </>
                 )}
             </div>
         ) : (
             <div className="flex flex-col lg:flex-row gap-6">
                 {/* Guess Log */}
                 <div className="flex-1 bg-black/60 border border-white/10 p-6 rounded-2xl">
                     <div className="text-xs text-cinematic-cyan uppercase tracking-widest mb-4 border-b border-cinematic-cyan/30 pb-2">Breach Log ({guesses.length}/{MAX_GUESSES})</div>
                     <div className="flex flex-col gap-2">
                        {guesses.map((g, idx) => (
                           <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded">
                               <div className="text-xl tracking-[0.5em] text-white font-bold">{g.guess}</div>
                               <div className="flex gap-2">
                                  {[...Array(g.exact)].map((_, i) => <div key={`e-${i}`} className="w-2 h-6 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>)}
                                  {[...Array(g.near)].map((_, i) => <div key={`n-${i}`} className="w-2 h-6 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></div>)}
                               </div>
                           </div>
                        ))}
                     </div>
                 </div>
                 
                 {/* Input Board */}
                 <div className="w-full lg:w-[350px] bg-black/90 border border-cinematic-cyan/20 p-6 rounded-2xl flex flex-col items-center shadow-[0_0_30px_rgba(0,243,255,0.1)]">
                     <div className="mb-6 w-full text-center">
                         <div className="text-[10px] text-zinc-500 mb-2 tracking-widest">INPUT BUFFER</div>
                         <div className="h-16 border border-cinematic-cyan/50 rounded flex items-center justify-center text-3xl tracking-[0.5em] text-cinematic-cyan bg-cinematic-cyan/5">
                             {currentGuess.padEnd(difficulty, '_')}
                         </div>
                     </div>
                     
                     <div className="grid grid-cols-4 gap-2 w-full mb-6">
                         {'0123456789ABCDEF'.split('').map(char => (
                            <button
                               key={char}
                               onClick={() => handleInput(char)}
                               disabled={currentGuess.length >= difficulty}
                               className="bg-black border border-white/10 hover:border-cinematic-cyan hover:bg-cinematic-cyan/10 text-zinc-300 py-3 rounded text-lg transition-colors font-bold disabled:opacity-50"
                            >
                               {char}
                            </button>
                         ))}
                     </div>
                     
                     <div className="flex gap-2 w-full">
                         <button 
                            onClick={backspace}
                            disabled={currentGuess.length === 0}
                            className="flex-1 border border-red-500/50 bg-red-500/10 text-red-400 py-3 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
                         >
                             BACK
                         </button>
                         <button 
                            onClick={submitGuess}
                            disabled={currentGuess.length < difficulty}
                            className="flex-[2] border border-cinematic-cyan/50 bg-cinematic-cyan/10 text-cinematic-cyan py-3 rounded hover:bg-cinematic-cyan hover:text-black font-bold tracking-widest transition-colors shadow-[0_0_15px_rgba(0,243,255,0.2)] disabled:opacity-50"
                         >
                             EXECUTE
                         </button>
                     </div>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
