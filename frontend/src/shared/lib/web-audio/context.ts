let audioCtx: AudioContext | null = null;

export const getAudioContext = (): AudioContext => {
  if (typeof window === 'undefined') throw new Error('SSR not supported');
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};

export const resumeAudioContext = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
};