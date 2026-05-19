self.onmessage = (e: MessageEvent<{ channelData: Float32Array, samples: number }>) => {
  try {
    const { channelData, samples } = e.data;
    
    const blockSize = Math.floor(channelData.length / samples);
    const peaks = new Float32Array(samples);
    
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

    self.postMessage({ success: true, peaks });
  } catch (error) {
    self.postMessage({ success: false, error: 'Peak generation failed in worker' });
  }
};