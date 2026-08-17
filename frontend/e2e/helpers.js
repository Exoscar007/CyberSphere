/**
 * E2E Test Helpers for CyberSphere
 * Provides session seeding and mock data fixtures.
 */

export async function loginAsAdmin(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'mock-access-token-admin-12345');
    localStorage.setItem('refreshToken', 'mock-refresh-token-admin-12345');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'ADMIN',
        station_name: null,
      })
    );
  });
}

export async function loginAsStation(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'mock-access-token-station-12345');
    localStorage.setItem('refreshToken', 'mock-refresh-token-station-12345');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 2,
        username: 'station_navrangpura',
        role: 'STATION',
        station_name: 'Navrangpura',
      })
    );
  });
}

export async function clearSession(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  });
}
