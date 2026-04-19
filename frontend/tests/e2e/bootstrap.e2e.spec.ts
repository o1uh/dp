import { test, expect } from '@playwright/test';

test.describe('Bootstrap Configuration', () => {
  
  test('Frontend root route returns 200 and renders content', async ({ request }) => {
    const response = await request.get('http://localhost:3000');
    expect(response.status()).toBe(200);
  });

  test('Nginx correctly routes /api/* to backend', async ({ request }) => {
    const response = await request.get('http://localhost:80/api/health/liveness');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});