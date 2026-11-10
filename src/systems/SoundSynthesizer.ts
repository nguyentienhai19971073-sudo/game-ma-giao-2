/**
 * Procedural Wuxia Sound Synthesizer using Web Audio API.
 * Produces authentic martial arts sound effects (Guqin pluck, ceremonial gong,
 * war drum, sword slash, internal energy burst, fanfare, broom sweep) with zero external file dependencies.
 */
export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private sfxVolume = 0.55;
  private ambientVolume = 0.25;
  private ambientTimer: number | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolumes(sfxVolume: number, ambientVolume: number, muted = false) {
    this.sfxVolume = Math.max(0, Math.min(1, sfxVolume));
    this.ambientVolume = Math.max(0, Math.min(1, ambientVolume));
    this.isMuted = muted;
  }

  public playGong(intensity = 1.0) {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [196, 293.66, 392, 523.25];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.985, now + 2.4);

      const peak = (this.sfxVolume * 0.28 * intensity) / (idx + 1);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.55);
    });
  }

  public playWarDrum(hits = 1) {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    for (let i = 0; i < hits; i++) {
      const start = ctx.currentTime + i * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, start);
      osc.frequency.exponentialRampToValueAtTime(42, start + 0.28);

      gain.gain.setValueAtTime(this.sfxVolume * 0.45, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    }
  }

  public playSwordSlash() {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.16);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playChime() {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(this.sfxVolume * 0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.68);
    });
  }

  public playThroneFanfare() {
    if (this.isMuted || this.sfxVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.playWarDrum(3);
    const chord = [261.63, 329.63, 392.0, 523.25, 659.25];
    chord.forEach((freq, idx) => {
      const start = ctx.currentTime + 0.2 + idx * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 1.85);
    });
  }

  public playGuqinNote() {
    if (this.isMuted || this.ambientVolume <= 0.01) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Pentatonic wuxia scale (D minor pentatonic / Guqin tuning)
    const scale = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0];
    const freq = scale[Math.floor(Math.random() * scale.length)];
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.006, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 1.8);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.ambientVolume * 0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.25);
  }

  public startAmbientGuqin() {
    if (this.ambientTimer !== null || typeof window === 'undefined') return;
    this.ambientTimer = window.setInterval(() => {
      if (!this.isMuted && this.ambientVolume > 0.02) {
        this.playGuqinNote();
      }
    }, 3400);
  }

  public stopAmbientGuqin() {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  public playThunder() {
    this.playGong(1.3);
    this.playWarDrum(3);
  }

  public playBySoundType(type: 'gong' | 'drum' | 'sword' | 'bell' | 'thunder' | 'fanfare') {
    switch (type) {
      case 'gong':
        this.playGong(1.0);
        break;
      case 'drum':
        this.playWarDrum(2);
        break;
      case 'sword':
        this.playSwordSlash();
        break;
      case 'bell':
        this.playChime();
        break;
      case 'thunder':
        this.playThunder();
        break;
      case 'fanfare':
        this.playThroneFanfare();
        break;
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
