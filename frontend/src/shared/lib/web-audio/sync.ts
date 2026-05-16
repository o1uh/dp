import { getAudioContext } from './context';

interface PlaybackConfig {
  sourceNodes: AudioBufferSourceNode[];
  startOffset: number;
  isLoop: boolean;
  duration: number;
}

export const syncPlayback = ({ sourceNodes, startOffset, isLoop, duration }: PlaybackConfig): void => {
  const ctx = getAudioContext();
  const startTime = ctx.currentTime + 0.05;

  sourceNodes.forEach(node => {
    node.loop = isLoop;
    if (isLoop) {
      node.loopStart = 0;
      node.loopEnd = duration;
    }
    node.start(startTime, startOffset);
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