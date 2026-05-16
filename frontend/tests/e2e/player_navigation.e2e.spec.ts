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
      // Возвращаем фейковый URL, чтобы избежать мгновенного завершения трека (onEnded)
      route.fulfill({ 
        json: { download_url: 'http://localhost:3000/dummy-audio.mp3' } 
      })
    );

    // Перехват запроса к фейковому аудио, чтобы предотвратить сетевые ошибки в логах
    await page.route('**/dummy-audio.mp3', route => {
      route.fulfill({ body: 'fake audio content', contentType: 'audio/mpeg' });
    });

    // Установка состояния авторизации 
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

    // Переход в библиотеку и запуск трека
    await page.goto('http://localhost:3000/library');
    
    // Ожидание рендера названия трека
    await page.waitForSelector('text=Navigation Test Track');
    await page.click('text=▶ Play');

    // Проверка появления MiniPlayer
    const miniPlayer = page.locator('div.fixed.bottom-0');
    await expect(miniPlayer).toBeVisible();
    await expect(miniPlayer.locator('text=Navigation Test Track')).toBeVisible();

    // Ожидание старта воспроизведения (кнопка паузы "||")
    const pauseButton = miniPlayer.locator('button:has-text("||")');
    await expect(pauseButton).toBeVisible();

    // Навигация в каталог
    await page.click('a[href="/catalog"]');
    await page.waitForURL('**/catalog*');

    // Проверка сохранения состояния плеера после смены маршрута
    await expect(miniPlayer).toBeVisible();
    await expect(miniPlayer.locator('text=Navigation Test Track')).toBeVisible();
    await expect(pauseButton).toBeVisible(); // Если кнопка паузы активна, значит isPlaying === true
  });
});