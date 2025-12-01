import { useState, useEffect, useRef, useCallback } from 'react';

// --- CONFIGURATION: 150cc Street Bike ---
const PHYSICS_CONFIG = {
  maxRPM: 10000,   
  idleRPM: 1200,
  redline: 9000,
  ratios: { 1: 28.0, 2: 19.0, 3: 14.0, 4: 11.0, 5: 9.0 },
  bikeMass: 140, 
  wheelRadius: 0.3, 
  dragCoefficient: 0.7, 
  brakeMaxPower: 800, 
};

// --- AUDIO: Single Cylinder Thumper ---
class ThumperAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.oscLow = null; 
    this.oscHigh = null;
    this.filter = null;
  }

  init() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = 0;

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 5; 
    this.filter.connect(this.masterGain);

    this.oscLow = this.ctx.createOscillator();
    this.oscLow.type = 'square'; 
    this.oscLow.connect(this.filter);
    
    this.oscHigh = this.ctx.createOscillator();
    this.oscHigh.type = 'sawtooth';
    this.oscHigh.connect(this.filter);

    this.oscLow.start();
    this.oscHigh.start();
  }

  setVolume(vol) {
    if(this.masterGain) this.masterGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  update(rpm, throttle) {
    if (!this.ctx) return;
    if (rpm < 100) { this.setVolume(0); return; } else { this.setVolume(0.5); }

    const frequency = rpm / 60 / 2; 
    this.oscLow.frequency.setTargetAtTime(frequency * 5, this.ctx.currentTime, 0.05); 
    this.oscHigh.frequency.setTargetAtTime(frequency * 2, this.ctx.currentTime, 0.05);

    const filterFreq = 80 + (rpm * 0.2) + (throttle * 1000); 
    this.filter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.1);
  }

  playShiftSound() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }
}

export const useBikePhysics = () => {
  const [rpm, setRpm] = useState(0);
  const [speed, setSpeed] = useState(0); 
  const [gear, setGear] = useState('N');
  const [isEngineOn, setIsEngineOn] = useState(false);
  
  // Visual state
  const [clutchDisplay, setClutchDisplay] = useState(0); 
  const [throttleDisplay, setThrottleDisplay] = useState(0);
  const [brakeDisplay, setBrakeDisplay] = useState(false);
  const [warningMsg, setWarningMsg] = useState(''); // New: To show "Pull Clutch" warning

  const state = useRef({
    rpm: 0,
    speedMPS: 0, 
    gear: 'N',
    clutchPos: 0, 
    throttlePos: 0, 
    brakePos: 0,
    brakePressure: 0, 
    lastTime: 0,
  });

  const audioRef = useRef(new ThumperAudio());

  // --- STRICT GEAR LOGIC ---
  const shiftGear = useCallback((direction) => {
    // 1. Check Clutch: Must be pulled > 80% (0.8)
    if (state.current.clutchPos < 0.8) {
        setWarningMsg('PULL CLUTCH TO SHIFT!');
        setTimeout(() => setWarningMsg(''), 1000);
        return; // IGNORING SHIFT
    }

    const current = state.current.gear;
    let next = current;

    if (direction === 'up') {
        if (current === 'N') next = 1;
        else if (current === 1) next = 2; 
        else if (current < 5) next = current + 1;
    } else {
        if (current === 1) next = 'N'; 
        else if (current === 'N') next = 'N'; 
        else next = current - 1;
    }

    if (next !== current) {
      state.current.gear = next;
      setGear(next);
      audioRef.current.playShiftSound();
    }
  }, []);

  const toggleEngine = () => {
      audioRef.current.resume();
      setIsEngineOn(prev => !prev);
      if(!isEngineOn) state.current.rpm = PHYSICS_CONFIG.idleRPM;
  };

  useEffect(() => {
    audioRef.current.init();
    let frameId;

    const loop = (time) => {
      if (!state.current.lastTime) state.current.lastTime = time;
      const dt = (time - state.current.lastTime) / 1000;
      state.current.lastTime = time;

      const { gear, throttlePos, clutchPos, brakePos, speedMPS, rpm, brakePressure } = state.current;
      
      // Brake Logic
      let newBrakePressure = brakePressure;
      if (brakePos > 0) newBrakePressure += dt * 0.8; 
      else newBrakePressure = 0;
      newBrakePressure = Math.min(Math.max(newBrakePressure, 0), 1);
      state.current.brakePressure = newBrakePressure;
      const brakeForce = newBrakePressure * PHYSICS_CONFIG.brakeMaxPower;

      // Engine Logic
      let targetNoLoadRPM = 0;
      if (isEngineOn) {
          targetNoLoadRPM = PHYSICS_CONFIG.idleRPM + (throttlePos * (PHYSICS_CONFIG.maxRPM - PHYSICS_CONFIG.idleRPM));
      }

      const currentRatio = gear === 'N' ? 0 : PHYSICS_CONFIG.ratios[gear];
      
      let clutchFriction = 0;
      if (clutchPos < 0.1) clutchFriction = 1.0; 
      else if (clutchPos > 0.8) clutchFriction = 0.0; 
      else clutchFriction = 1 - clutchPos; 

      const dragForce = 0.5 * PHYSICS_CONFIG.dragCoefficient * 1.2 * (speedMPS ** 2) + (speedMPS * 5); 

      let driveForce = 0;
      if (gear !== 'N' && isEngineOn) {
         const torqueCurve = Math.sin((rpm / PHYSICS_CONFIG.maxRPM) * Math.PI); 
         const engineTorque = torqueCurve * 200 * throttlePos; 
         driveForce = (engineTorque * currentRatio) / PHYSICS_CONFIG.wheelRadius;
      }

      const netForce = (driveForce * clutchFriction) - dragForce - brakeForce;
      let newSpeed = speedMPS + (netForce / PHYSICS_CONFIG.bikeMass) * dt;
      if (newSpeed < 0) newSpeed = 0;
      state.current.speedMPS = newSpeed;

      // RPM Logic
      let nextRPM = rpm;
      if (!isEngineOn) {
          nextRPM -= 1500 * dt; 
      } else if (gear === 'N' || clutchPos > 0.8) {
          const diff = targetNoLoadRPM - rpm;
          nextRPM += diff * (dt * 5); 
      } else {
          const wheelCircumference = 2 * Math.PI * PHYSICS_CONFIG.wheelRadius;
          const wheelRPM = (newSpeed / wheelCircumference) * 60 * currentRatio;
          nextRPM = (targetNoLoadRPM * (1 - clutchFriction)) + (wheelRPM * clutchFriction);
      }

      if (isEngineOn && gear !== 'N' && clutchFriction > 0.8 && newSpeed < 1 && throttlePos < 0.1) {
          setIsEngineOn(false);
          nextRPM = 0;
      }

      if (nextRPM < 0) nextRPM = 0;
      if (nextRPM > PHYSICS_CONFIG.maxRPM) nextRPM = PHYSICS_CONFIG.maxRPM;
      
      state.current.rpm = nextRPM;

      setRpm(Math.round(nextRPM));
      setSpeed(Math.round(state.current.speedMPS * 3.6));
      audioRef.current.update(nextRPM, throttlePos);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isEngineOn]);

  const setClutch = (val) => { state.current.clutchPos = val; setClutchDisplay(val); };
  const setThrottle = (val) => { state.current.throttlePos = val; setThrottleDisplay(val); };
  const setBrake = (active) => { state.current.brakePos = active ? 1 : 0; setBrakeDisplay(active); };

  return {
    rpm, speed, gear, isEngineOn, warningMsg,
    clutchDisplay, throttleDisplay, brakeDisplay,
    setClutch, setThrottle, setBrake, shiftGear, toggleEngine,
    config: PHYSICS_CONFIG
  };
};