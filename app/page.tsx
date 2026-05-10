'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SessionSummary {
  sessionId: string;
  title: string;
  wineCount: number;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionParam) {
      router.replace(`/tasting?session=${sessionParam}`);
      return;
    }

    fetch('/api/sessions')
      .then(r => r.json())
      .then(data => { if (data.sessions) setSessions(data.sessions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionParam, router]);

  if (sessionParam) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0608', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontFamily: 'serif', fontSize: '18px' }}>
        🍷 Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0608', color: '#f5ede4' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '64px 16px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '52px', marginBottom: '20px' }}>🍷</div>
          <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(28px,7vw,40px)', fontWeight: 300, letterSpacing: '0.1em', color: '#f5ede4', margin: '0 0 10px' }}>
            Wine Tasting
          </h1>
          <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#b09880', margin: 0 }}>
            나만의 와인 취향 찾기
          </p>
        </div>

        <div style={{ width: '100%', borderTop: '1px solid rgba(201,169,110,0.25)', marginBottom: '36px' }} />

        {/* 세션 목록 */}
        <div style={{ width: '100%' }}>
          <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#c4b0a0', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📋 모임을 선택하세요
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: '24px', height: '24px', border: '2px solid rgba(201,169,110,0.25)', borderTop: '2px solid #c9a96e', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
            </div>
          ) : sessions.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', color: '#b09880', textAlign: 'center', padding: '48px 0' }}>
              등록된 모임이 없습니다
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
              {sessions.map(s => (
                <button
                  key={s.sessionId}
                  onClick={() => router.push(`/tasting?session=${s.sessionId}`)}
                  onMouseEnter={() => setHoveredId(s.sessionId)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${hoveredId === s.sessionId ? '#c9a96e' : 'rgba(201,169,110,0.3)'}`,
                    borderRadius: '14px',
                    padding: '20px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '19px', color: '#f5ede4', margin: '0 0 6px', lineHeight: 1.3 }}>
                    {s.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#c4b0a0', margin: 0 }}>
                    와인 {s.wineCount}종
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0608', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontFamily: 'serif', fontSize: '18px' }}>
        🍷 Loading...
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
