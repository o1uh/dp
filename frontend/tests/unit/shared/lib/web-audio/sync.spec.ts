import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncPlayback, stopPlayback } from '@/shared/lib/web-audio/sync';
import * as contextModule from '@/shared/lib/web-audio/context';

describe('Web Audio API Synchronization', () => {
  let mockContext: any;
  let mockSourceNode: any;

  beforeEach(() => {
    mockSourceNode = {
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      loop: false,
      loopStart: 0,
      loopEnd: 0,
    };

    mockContext = {
      currentTime: 10.0,
    };

    vi.spyOn(contextModule, 'getAudioContext').mockReturnValue(mockContext as AudioContext);
  });

  it('syncPlayback assigns correct start time based on context.currentTime', () => {
    const config = {
      sourceNodes: [{ node: mockSourceNode, trimStartMs: 0, trimEndMs: null }],
      startOffset: 0,
      isLoop: false,
      duration: 100,
    };

    syncPlayback(config);

    // startTime = ctx.currentTime + 0.05
    expect(mockSourceNode.start).toHaveBeenCalledWith(10.05, 0);
  });

  it('syncPlayback applies correct offsets and trims', () => {
    const config = {
      sourceNodes: [{ node: mockSourceNode, trimStartMs: 2000, trimEndMs: 5000 }],
      startOffset: 1.5,
      isLoop: false,
      duration: 100,
    };

    syncPlayback(config);

    const expectedOffsetInSeconds = (2000 / 1000) + 1.5; // 3.5
    const expectedPlayDuration = (5000 / 1000) - expectedOffsetInSeconds; // 5.0 - 3.5 = 1.5

    expect(mockSourceNode.start).toHaveBeenCalledWith(10.05, 3.5, 1.5);
  });

  it('stopPlayback cleanly stops and disconnects nodes', () => {
    stopPlayback([mockSourceNode]);
    expect(mockSourceNode.stop).toHaveBeenCalled();
    expect(mockSourceNode.disconnect).toHaveBeenCalled();
  });
});