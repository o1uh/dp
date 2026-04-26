import { describe, it, expect, vi } from 'vitest';

describe('SHA-256 Chunking (Worker Logic)', () => {
  it('correctly calculates SHA-256 hash for a given buffer', async () => {
    const text = 'test_audio_data';
    const buffer = new TextEncoder().encode(text).buffer;
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const expectedHash = '60b0530689cd16fa10ed2b065bb993fb1b6c2ddffd25d9c3e9f4873e3879c131';
    expect(hashHex).toBe(expectedHash);
  });
});