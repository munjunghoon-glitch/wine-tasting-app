import { NextRequest, NextResponse } from 'next/server';
import { getSession, SESSIONS } from '@/data/sessions';
import type { Session, WineType } from '@/utils/types';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('session');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // ── 세션 목록 요청 (session 파라미터 없음) ──────────────────
  if (!sessionId) {
    if (!sheetId) {
      const sessions = Object.values(SESSIONS)
        .filter(s => s.sessionId !== 'default')
        .reverse()
        .map(s => ({ sessionId: s.sessionId, title: s.title, wineCount: s.wineList.length }));
      return NextResponse.json({ sessions, source: 'fallback' });
    }

    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      const res = await fetch(csvUrl, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const csv = await res.text();
      const allSessions = parseSessionsFromCSV(csv);
      const sessions = Object.values(allSessions)
        .filter(s => s.sessionId !== 'default')
        .reverse()
        .map(s => ({ sessionId: s.sessionId, title: s.title, wineCount: s.wineList.length }));

      console.log(`[Sessions] ✅ 목록 조회 | 세션 수: ${sessions.length}`);
      return NextResponse.json({ sessions, source: 'google_sheets' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[Sessions] ❌ 목록 조회 실패 (${msg}) → fallback`);
      const sessions = Object.values(SESSIONS)
        .filter(s => s.sessionId !== 'default')
        .reverse()
        .map(s => ({ sessionId: s.sessionId, title: s.title, wineCount: s.wineList.length }));
      return NextResponse.json({ sessions, source: 'fallback' });
    }
  }

  // ── 특정 세션 요청 ────────────────────────────────────────
  if (!sheetId) {
    console.log('[Sessions] GOOGLE_SHEET_ID 미설정 → fallback 사용');
    return NextResponse.json({ success: true, session: getSession(sessionId), source: 'fallback' });
  }

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const csv = await res.text();
    const allSessions = parseSessionsFromCSV(csv);
    const session = allSessions[sessionId] ?? allSessions['default'] ?? getSession(sessionId);

    console.log(`[Sessions] ✅ Google Sheets 성공 | 세션 수: ${Object.keys(allSessions).length} | 요청: ${sessionId} | 와인 수: ${session.wineList.length}`);
    return NextResponse.json({ success: true, session, source: 'google_sheets' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[Sessions] ❌ Google Sheets 실패 (${msg}) → fallback 사용`);
    return NextResponse.json({ success: true, session: getSession(sessionId), source: 'fallback' });
  }
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      cols.push(cur.trim()); cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseSessionsFromCSV(csv: string): Record<string, Session> {
  const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
  const sessions: Record<string, Session> = {};

  // 첫 번째 행은 헤더(sessionId, title, name, type, country, grape, desc)
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 7) continue;

    const [sessionId, title, name, type, country, grape, desc] = cols;
    if (!sessionId || !name) continue;

    if (!sessions[sessionId]) {
      sessions[sessionId] = { sessionId, title, wineList: [] };
    }

    sessions[sessionId].wineList.push({
      id: sessions[sessionId].wineList.length + 1,
      name,
      type: type as WineType,
      country,
      grape,
      desc,
    });
  }

  return sessions;
}
