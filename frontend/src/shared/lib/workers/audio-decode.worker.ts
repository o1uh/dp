self.onmessage = (e: MessageEvent<{ channelData: Float32Array, samples: number }>) => {
  try {
    const { channelData, samples } = e.data;
    console.log(`[AUDIO DECODE WORKER] Peak calculation task received. Input Float32Array size: ${channelData.length} entries. Targeted samples count: ${samples}`);
    
    const startTime = performance.now();
    const blockSize = Math.floor(channelData.length / samples);
    const peaks = new Float32Array(samples);
    console.log(`[AUDIO DECODE WORKER] Resolution properties set. Calculated block size: ${blockSize} values per sample index`);
    
    for (let i = 0; i < samples; i++) {
      let max = 0;
      const start = i * blockSize;
      const end = start + blockSize;
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks[i] = max;
    }

    const duration = performance.now() - startTime;
    console.log(`[AUDIO DECODE WORKER] Peak generation successfully finalized in ${duration.toFixed(2)}ms. Total peaks mapped: ${peaks.length}`);
    
    self.postMessage({ success: true, peaks });
  } catch (error: any) {
    console.error("[AUDIO DECODE WORKER ERROR] Critical failure inside background audio-decoding thread context!", {
      errorMessage: error.message,
      errorStack: error.stack,
      inputLength: e.data?.channelData?.length
    });
    self.postMessage({ success: false, error: 'Peak generation failed in worker' });
  }
};