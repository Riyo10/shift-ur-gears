import React, { useRef, useEffect } from 'react';
import { useBikePhysics } from '../hooks/useBikePhysics';

const BikeGame = () => {
  const { 
    rpm, speed, gear, isEngineOn, warningMsg,
    clutchDisplay, throttleDisplay, brakeDisplay,
    setClutch, setThrottle, setBrake, shiftGear, toggleEngine,
    config 
  } = useBikePhysics();

  const clutchRef = useRef(null);
  const throttleRef = useRef(null);

  // --- MULTI-TOUCH HANDLER ---
  // We use e.targetTouches[0] instead of e.touches[0]
  // This ensures we only look at the finger touching THIS element
  const handleTouch = (e, ref, callback) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    
    // Find the touch associated with this element
    const touch = e.targetTouches[0]; 
    if (!touch) return; // Should not happen in touchmove, but safety first

    let val = 1 - ((touch.clientY - rect.top) / rect.height);
    val = Math.max(0, Math.min(1, val));
    callback(val);
  };

  useEffect(() => {
    const addTouch = (el, updateFn) => {
        if(!el) return;
        
        const start = (e) => { 
            e.preventDefault(); // Stop scrolling
            handleTouch(e, {current: el}, updateFn); 
        };
        const move = (e) => { 
            e.preventDefault(); 
            handleTouch(e, {current: el}, updateFn); 
        };
        const end = (e) => { 
            e.preventDefault(); 
            updateFn(0); // Snap back to 0
        };

        // Passive: false is crucial for preventing scrolling
        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchmove', move, { passive: false });
        el.addEventListener('touchend', end);
        el.addEventListener('touchcancel', end);

        return () => {
            el.removeEventListener('touchstart', start);
            el.removeEventListener('touchmove', move);
            el.removeEventListener('touchend', end);
            el.removeEventListener('touchcancel', end);
        };
    };

    const cClean = addTouch(clutchRef.current, setClutch);
    const tClean = addTouch(throttleRef.current, setThrottle);

    return () => { cClean(); tClean(); };
  }, [setClutch, setThrottle]);

  return (
    <div className="fixed inset-0 w-full h-dvh bg-zinc-950 overflow-hidden select-none touch-none flex flex-col font-mono text-white">
      
      {/* WARNING OVERLAY */}
      {warningMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 px-6 py-4 rounded-xl z-50 shadow-2xl animate-bounce text-center">
            <span className="font-bold text-xl">{warningMsg}</span>
        </div>
      )}

      {/* --- DASHBOARD --- */}
      <div className="h-[15%] w-full flex items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shadow-md z-10 relative">
          
          <div className="flex flex-col items-center gap-1 w-20">
              <span className={`text-5xl font-black ${gear === 'N' ? 'text-green-500' : 'text-white'}`}>{gear}</span>
              <button 
                  onClick={toggleEngine}
                  className={`text-[10px] px-2 py-1 rounded border ${isEngineOn ? 'bg-green-900 border-green-500 text-green-100' : 'bg-red-900 border-red-500 text-red-100'}`}
              >
                  {isEngineOn ? 'ON' : 'START'}
              </button>
          </div>

          <div className="flex flex-col items-center">
              <span className="text-6xl font-bold tracking-tighter leading-none">{speed}</span>
              <span className="text-xs text-zinc-500">KM/H</span>
          </div>

          <div className="flex flex-col items-end w-20">
              <span className="text-2xl font-mono text-zinc-300">{rpm}</span>
              <div className="w-full h-2 bg-zinc-800 rounded mt-1 overflow-hidden">
                  <div className={`h-full ${rpm > config.redline ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${(rpm/config.maxRPM)*100}%`}}></div>
              </div>
              <span className="text-[10px] text-zinc-500">RPM</span>
          </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex-1 w-full grid grid-cols-2">
        
        {/* LEFT ZONE */}
        <div className="relative border-r border-zinc-800 p-2 flex flex-col h-full">
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-4">
                <button onPointerDown={() => shiftGear('up')} className="w-20 h-16 bg-zinc-800 rounded-lg border-b-4 border-zinc-950 active:border-b-0 active:translate-y-1 active:bg-blue-900 transition-all font-bold text-xl shadow-lg">▲</button>
                <button onPointerDown={() => shiftGear('down')} className="w-20 h-16 bg-zinc-800 rounded-lg border-b-4 border-zinc-950 active:border-b-0 active:translate-y-1 active:bg-blue-900 transition-all font-bold text-xl shadow-lg">▼</button>
            </div>

            <div className="h-full w-full flex items-end justify-center pb-2">
                <div ref={clutchRef} className="w-24 h-[90%] bg-zinc-900 rounded-xl border-2 border-zinc-700 relative overflow-hidden shadow-inner touch-none">
                    <div className="absolute inset-0 flex flex-col justify-between py-4 px-4 opacity-20 pointer-events-none">
                        {[...Array(10)].map((_,i) => <div key={i} className="w-full h-px bg-zinc-400" />)}
                    </div>
                    <div className="absolute bottom-0 w-full bg-yellow-500 opacity-90 transition-transform duration-75" style={{ height: '100%', transform: `translateY(${(1 - clutchDisplay) * 100}%)` }} />
                    <span className="absolute top-2 w-full text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest pointer-events-none">CLUTCH</span>
                </div>
            </div>
        </div>

        {/* RIGHT ZONE */}
        <div className="relative p-2 flex flex-col h-full">
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full transition-all ${brakeDisplay ? 'bg-red-500 shadow-[0_0_15px_red]' : 'bg-red-950'}`} />
                 <button 
                  onPointerDown={() => setBrake(true)}
                  onPointerUp={() => setBrake(false)}
                  onPointerLeave={() => setBrake(false)}
                  className="w-24 h-24 rounded-full bg-red-900 border-4 border-red-950 active:bg-red-600 active:scale-95 transition-all font-bold text-sm shadow-xl flex items-center justify-center"
                 >
                   BRAKE
                 </button>
            </div>

            <div className="h-full w-full flex items-end justify-center pb-2">
                <div ref={throttleRef} className="w-24 h-[90%] bg-zinc-900 rounded-xl border-2 border-zinc-700 relative overflow-hidden shadow-inner touch-none">
                    <div className="absolute inset-0 flex flex-col justify-between py-4 px-4 opacity-20 pointer-events-none">
                        {[...Array(10)].map((_,i) => <div key={i} className="w-full h-px bg-zinc-400" />)}
                    </div>
                    <div className="absolute bottom-0 w-full bg-green-500 opacity-90 transition-transform duration-75" style={{ height: '100%', transform: `translateY(${(1 - throttleDisplay) * 100}%)` }} />
                    <span className="absolute top-2 w-full text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest pointer-events-none">THROTTLE</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default BikeGame;