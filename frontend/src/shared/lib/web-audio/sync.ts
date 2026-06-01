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
  console.log(`[WEB AUDIO SYNC] Starting scheduling loop. Hardware Timeline Current Time: ${ctx.currentTime}s, Calculated play scheduling timestamp (StartTime): ${startTime}s`);

  sourceNodes.forEach(({ node, trimStartMs, trimEndMs }, index) => {
    node.loop = isLoop;
    if (isLoop) {
      node.loopStart = trimStartMs / 1000;
      node.loopEnd = trimEndMs ? trimEndMs / 1000 : duration;
      console.log(`[WEB AUDIO SYNC] Loop configuration applied on Node index [${index}]. LoopStart: ${node.loopStart}s, LoopEnd: ${node.loopEnd}s`);
    }
    
    const offsetInSeconds = (trimStartMs / 1000) + startOffset;
    if (trimEndMs) {
      const playDuration = (trimEndMs / 1000) - offsetInSeconds;
      console.log(`[WEB AUDIO SYNC] Scheduling bounded buffer on Node index [${index}]. StartTime: ${startTime}s, OffsetInSeconds: ${offsetInSeconds}s, Bounded PlayDuration: ${playDuration}s`);
      node.start(startTime, offsetInSeconds, playDuration > 0 ? playDuration : 0);
    } else {
      console.log(`[WEB AUDIO SYNC] Scheduling standard buffer on Node index [${index}]. StartTime: ${startTime}s, OffsetInSeconds: ${offsetInSeconds}s`);
      node.start(startTime, offsetInSeconds);
    }
  });
};

export const stopPlayback = (sourceNodes: AudioBufferSourceNode[]): void => {
  console.log(`[WEB AUDIO SYNC] stopping and deallocating ${sourceNodes.length} scheduled buffer nodes...`);
  sourceNodes.forEach((node, index) => {
    try {
      node.stop();
      node.disconnect();
      console.log(`[WEB AUDIO SYNC] Node index [${index}] successfully stopped and disconnected.`);
    } catch (e) {
      console.warn(`[WEB AUDIO SYNC WARNING] Failed to stop node index [${index}] (Node might have finished playing or is already inactive).`);
    }
  });
};