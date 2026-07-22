// backend/src/auth/public.decorator.ts

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** ログインセッションを必須にしないルートに付与する(LINE Webhook・icsリンク・OAuthコールバック等) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
