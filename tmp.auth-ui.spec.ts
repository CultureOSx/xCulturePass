import { test, expect } from '@playwright/test';

type ReqResult = { status: number; body: string };

async function postJson(request: any, url: string, data: unknown, headers: Record<string, string> = {}): Promise<ReqResult> {
  const res = await request.post(url, { data, headers: { 'Content-Type': 'application/json', ...headers } });
  return { status: res.status(), body: await res.text() };
}

test('auth UI login redirect + hydration', async ({ page, request }) => {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const baseApi = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
  expect(apiKey, 'Missing EXPO_PUBLIC_FIREBASE_API_KEY').toBeTruthy();
  expect(baseApi, 'Missing EXPO_PUBLIC_API_URL').toBeTruthy();

  const email = `ui_smoke_${Date.now()}@example.com`;
  const password = 'TempPass123!';

  const signUp = await postJson(request, `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    email,
    password,
    returnSecureToken: true,
  });
  expect(signUp.status, signUp.body).toBe(200);
  const signUpJson = JSON.parse(signUp.body) as { idToken: string; localId: string };
  const idToken = signUpJson.idToken;
  const uid = signUpJson.localId;

  const register = await postJson(request, `${baseApi}/api/auth/register`, {
    displayName: 'UI Smoke User',
    username: `ui_${uid.slice(0, 6)}`,
    city: 'Sydney',
    country: 'Australia',
  }, { Authorization: `Bearer ${idToken}` });
  expect([200, 201], register.body).toContain(register.status);

  let meStatus: number | null = null;
  page.on('response', (resp) => {
    if (resp.url().includes('/api/auth/me')) {
      meStatus = resp.status();
    }
  });

  await page.goto('http://127.0.0.1:8081/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Welcome back')).toBeVisible({ timeout: 20000 });

  await page.getByPlaceholder('Enter your email address').fill(email);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect.poll(() => page.url(), { timeout: 30000 }).not.toContain('/login');
  expect(meStatus, 'Expected /api/auth/me to be called and return 200').toBe(200);

  const del = await postJson(request, `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, { idToken });
  expect(del.status, del.body).toBe(200);
});
