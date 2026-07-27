// frontend/lib/portal-liff.ts

import liff from '@line/liff';

let initPromise: Promise<void> | null = null;

/** LIFF SDKの初期化(1回だけ実行し、以降は同じPromiseを返す) */
export function initLiff(): Promise<void> {
  if (!initPromise) {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

    if (!liffId) {
      initPromise = Promise.reject(new Error('NEXT_PUBLIC_LIFF_ID is not set'));
    } else {
      initPromise = liff.init({ liffId, withLoginOnExternalBrowser: true });
    }
  }

  return initPromise;
}

export function isInClient(): boolean {
  return liff.isInClient();
}

export function isLoggedIn(): boolean {
  return liff.isLoggedIn();
}

/** LINEログイン画面へリダイレクトする(呼び出すとページ遷移するため、以降の処理は実行されない) */
export function loginWithLiff(): void {
  liff.login();
}

export function getIdToken(): string | null {
  return liff.getIDToken();
}
