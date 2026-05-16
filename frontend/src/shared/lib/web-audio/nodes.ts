export const createGainNode = (ctx: AudioContext, initialVolume: number = 1.0): GainNode => {
  const gainNode = ctx.createGain();
  gainNode.gain.value = initialVolume;
  return gainNode;
};

export const createPannerNode = (ctx: AudioContext, initialPan: number = 0.0): StereoPannerNode => {
  const pannerNode = ctx.createStereoPanner();
  pannerNode.pan.value = initialPan;
  return pannerNode;
};

export const connectNodes = (source: AudioNode, ...nodes: AudioNode[]): void => {
  nodes.reduce((prevNode, currentNode) => {
    prevNode.connect(currentNode);
    return currentNode;
  }, source);
};