import { test, expect } from '@playwright/test';

test.describe('Nginx File Size Validation', () => {
  test('Returns HTTP 413 for payloads exceeding client_max_body_size', async ({ request }) => {
    // client_max_body_size на 500
    // буфер 501. 
    // на E2E создавать 500 не оч но разок можно
    
    test.setTimeout(120000);
    const largeBuffer = Buffer.alloc(501 * 1024 * 1024); 

    const response = await request.post('http://localhost:80/api/files/upload-init', {
      data: largeBuffer,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });

    expect(response.status()).toBe(413);
  });
});