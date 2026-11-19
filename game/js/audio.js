// Synthesised sound with WebAudio: engine, horn, siren and pickup chimes.
// No audio files; every sound is an oscillator shaped in code. Created lazily
// on the first user gesture so browsers allow the AudioContext to start.
export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null, sirenOsc = null, sirenGain = null;
  let muted = false;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420;
      engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'triangle'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
    } catch { ctx = null; }
    return !!ctx;
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  return {
    unlock() { ensure(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted() { return muted; },
    engine(speedRatio, driving) {
      if (!ctx || muted) return;
      const target = driving ? 0.05 + Math.abs(speedRatio) * 0.09 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(50 + Math.abs(speedRatio) * 130, ctx.currentTime, 0.08);
    },
    siren(active, t) {
      if (!ctx || muted) return;
      sirenGain.gain.setTargetAtTime(active ? 0.035 : 0, ctx.currentTime, 0.1);
      if (active) sirenOsc.frequency.value = 650 + Math.sin(t * 4.2) * 220;
    },
    horn() { blip(220, 0.28, 'square', 0.16); setTimeout(() => blip(220, 0.2, 'square', 0.12), 30); },
    pickup() { blip(660, 0.09, 'square', 0.16); setTimeout(() => blip(990, 0.14, 'square', 0.16), 80); },
    cash() { blip(880, 0.08, 'triangle', 0.2); setTimeout(() => blip(1320, 0.16, 'triangle', 0.2), 70); },
    punch() { blip(140, 0.09, 'sawtooth', 0.2, 60); },
    crash() { blip(90, 0.22, 'sawtooth', 0.24, 40); },
    door() { blip(320, 0.07, 'square', 0.12, 180); },
    star() { blip(520, 0.12, 'square', 0.18, 780); },
  };
}
