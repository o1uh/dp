import { test, expect } from '@playwright/test';

test.describe('Global Audio Player Persistence', () => {
  test('Воспроизведение не прерывается при маршрутизации (Next.js Link routing)', async ({ page }) => {
    // Мокирование API для изоляции E2E теста
    await page.route('**/api/users/me', route => 
      route.fulfill({ json: { id: 'test-user-id', username: 'tester', email: 'test@test.com' } })
    );
    await page.route('**/api/tracks*', route => 
      route.fulfill({
        json: { 
          items: [{ 
            id: 'track-1', 
            title: 'Navigation Test Track', 
            visibility: 'public', 
            play_count: 0,
            save_count: 0,
            downloads_count: 0,
            created_at: new Date().toISOString() 
          }], 
          total: 1 
        }
      })
    );
    await page.route('**/api/tracks/track-1/download', route => 
      route.fulfill({ 
        json: { download_url: 'http://localhost:3000/dummy-audio.mp3' } 
      })
    );

    await page.route('**/dummy-audio.mp3', route => {
      route.fulfill({ body: 'fake audio content', contentType: 'audio/mpeg' });
    });

    await page.route('**/api/notifications', route => 
      route.fulfill({ json: [] })
    );

    await page.addInitScript(() => {
      const originalAddEventListener = window.EventTarget.prototype.addEventListener;
      
      window.EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (type === 'error' && this instanceof HTMLMediaElement) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      Object.defineProperty(window.HTMLMediaElement.prototype, 'onerror', {
        set(val) { /* игнорируем */ },
        get() { return null; },
        configurable: true
      });

      window.HTMLMediaElement.prototype.play = async function() {
        return Promise.resolve();
      };
      window.HTMLMediaElement.prototype.load = function() {};
      
      Object.defineProperty(window.HTMLMediaElement.prototype, 'src', {
        get() {
          return this._mockSrc || '';
        },
        set(value) {
          this._mockSrc = value;
          setTimeout(() => {
            const event = new Event('loadedmetadata');
            this.dispatchEvent(event);
          }, 50);
        },
        configurable: true,
        enumerable: true
      });
    });

    await page.goto('http://localhost:3000/login');
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({ 
        state: { 
          isAuth: true, 
          _hasHydrated: true,
          accessToken: 'fake_token',
          profile: { id: 'test-user-id', username: 'tester', email: 'test@test.com' }
        } 
      }));
    });

    await page.goto('http://localhost:3000/library');
    
    await page.waitForSelector('text=Navigation Test Track');
    
    await page.click('text=Слушать');

    const miniPlayer = page.locator('div.fixed.bottom-0');
    await expect(miniPlayer).toBeVisible();
    await expect(miniPlayer.locator('text=Navigation Test Track')).toBeVisible();

    const pauseButton = miniPlayer.locator('button[aria-label="Пауза"]');
    await expect(pauseButton).toBeVisible();

    await page.click('a[href="/catalog"]');
    await page.waitForURL('**/catalog*');

    await expect(miniPlayer).toBeVisible();
    await expect(miniPlayer.locator('text=Navigation Test Track')).toBeVisible();
    await expect(pauseButton).toBeVisible(); 
  });
});