/**
 * src/app/api/auth/logout/route.ts
 *
 * ログアウトAPI
 *
 * POST /api/auth/logout
 * Response: { message: string }
 */

import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  await deleteSession();

  return NextResponse.json({ message: 'ログアウトしました' });
}