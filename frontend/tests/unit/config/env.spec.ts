import { describe, it, expect } from 'vitest';

describe('Environment Variables Validation', () => {
  it('should have NEXT_PUBLIC_API_URL defined', () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    expect(apiUrl).toBeDefined();
    expect(apiUrl.startsWith('http')).toBe(true);
  });

  it('should have NEXT_PUBLIC_WS_URL defined', () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
    expect(wsUrl).toBeDefined();
    expect(wsUrl.startsWith('ws')).toBe(true);
  });
});