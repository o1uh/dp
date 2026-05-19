import { getAudioContext } from './context';

interface PlaybackConfig {
  sourceNodes: { node: AudioBufferSourceNode, trimStartMs: number, trimEndMs: number | null }[];
  startOffset: number;
  isLoop: boolean;
  duration: number;
}

export const syncPlayback = ({ sourceNodes, startOffset, isLoop, duration }: PlaybackConfig): void => {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + 0.05;

  sourceNodes.forEach(({ node, trimStartMs, trimEndMs }) => {
    node.loop = isLoop;
    if (isLoop) {
      node.loopStart = trimStartMs / 1000;
      node.loopEnd = trimEndMs ? trimEndMs / 1000 : duration;
    }
    
    const offsetInSeconds = (trimStartMs / 1000) + startOffset;
    if (trimEndMs) {
      const playDuration = (trimEndMs / 1000) - offsetInSeconds;
      node.start(startTime, offsetInSeconds, playDuration > 0 ? playDuration : 0);
    } else {
      node.start(startTime, offsetInSeconds);
    }
  });
};

export const stopPlayback = (sourceNodes: AudioBufferSourceNode[]): void => {
  sourceNodes.forEach(node => {
    try {
      node.stop();
      node.disconnect();
    } catch (e) {
      // игнорирование ошибки, если узел уже остановлен
    }
  });
};