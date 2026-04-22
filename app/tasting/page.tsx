'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSession } from '@/data/sessions';
import { getRecommendations } from '@/utils/recommend';
import type { Wine, WineType, TastingData, RecommendedWine } from '@/utils/types';

// ── 상수 ──────────────────────────────────────────────────────
const FLAVORS: Record<WineType, string[]> = {
  champagne: ['토스트/빵', '사과/배', '레몬/라임', '꽃향기', '크림/버터', '이스트', '미네랄', '복숭아'],
  sparkling:  ['사과/배', '레몬/라임', '복숭아/살구', '꽃향기', '이스트', '미네랄', '허브'],
  white:      ['레몬/라임', '자몽', '사과/배', '복숭아/살구', '꽃향기', '허브/풀', '미네랄', '바닐라/오크', '꿀'],
  red:        ['체리/딸기', '블랙베리/자두', '라즈베리', '흙/가죽', '삼나무/오크', '향신료', '초콜릿', '담배/허브'],
};

const WINE_TYPE_LABEL: Record<WineType, string> = {
  champagne: '🥂 샴페인',
  sparkling:  '✨ 스파클링',
  white:      '🍋 화이트',
  red:        '🍷 레드',
};

const BUBBLE_OPTIONS   = ['섬세함', '보통', '강함', '크리미함'];
const ACIDITY_OPTIONS  = ['낮음', '보통', '높음'];
const BODY_OPTIONS     = ['가벼움', '미디엄', '묵직함'];
const TANNIN_OPTIONS   = ['부드러움', '보통', '강함'];
const FINISH_OPTIONS   = ['짧음', '보통', '긺'];

// ── 메인 ──────────────────────────────────────────────────────
function TastingContent() {
  const searchParams  = useSearchParams();
  const sessionId     = searchParams.get('session') || 'default';
  const session       = getSession(sessionId);

  // step: 'select' | 'tasting' | 'result'
  const [step, setStep]               = useState<'select' | 'tasting' | 'result'>('select');
  const [selectedWine, setSelectedWine] = useState<Wine | null>(null);
  const [isCustom, setIsCustom]       = useState(false);
  const [customName, setCustomName]   = useState('');
  const [customType, setCustomType]   = useState<WineType>('red');
  const [tasting, setTasting]         = useState<Partial<TastingData>>({ flavors: [] });
  const [recommendations, setRecommendations] = useState<RecommendedWine[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const activeType: WineType = isCustom ? customType : (selectedWine?.type ?? 'red');

  // 와인 선택
  function handleSelectWine(wine: Wine) {
    setSelectedWine(wine);
    setIsCustom(false);
    setTasting({ flavors: [], type: wine.type });
    setStep('tasting');
  }

  function handleSelectCustom() {
    setSelectedWine(null);
    setIsCustom(true);
    setTasting({ flavors: [], type: customType });
    setStep('tasting');
  }

  // 테이스팅 필드 업데이트
  function set<K extends keyof TastingData>(key: K, value: TastingData[K]) {
    setTasting(prev => ({ ...prev, [key]: value }));
  }

  function toggleFlavor(f: string) {
    const cur = tasting.flavors ?? [];
    set('flavors', cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f]);
  }

  // 추천 제출
  async function handleSubmit() {
    if (!tasting.feeling?.trim()) {
      setError('전체적인 느낌을 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);

    const tastingData: TastingData = {
      type:    activeType,
      flavors: tasting.flavors ?? [],
      bubble:  tasting.bubble,
      finish:  tasting.finish,
      acidity: tasting.acidity,
      body:    tasting.body,
      tannin:  tasting.tannin,
      feeling: tasting.feeling ?? '',
      isCustomWine:   isCustom,
      customWineName: isCustom ? customName : undefined,
    };

    try {
      if (isCustom) {
        // 기타 와인 → AI 추천
        const res = await fetch('/api/ai-recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wineName: customName || '알 수 없는 와인', tasting: tastingData }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setRecommendations(data.recommendations);
      } else if (selectedWine) {
        // 큐레이션 or 룰 기반
        const recs = getRecommendations(selectedWine, tastingData);
        setRecommendations(recs);
      }
      setStep('result');
    } catch (e) {
      setError('추천 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setStep('select');
    setSelectedWine(null);
    setIsCustom(false);
    setCustomName('');
    setTasting({ flavors: [] });
    setRecommendations([]);
    setError('');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0608', color: '#e8dcc8' }}>
      {/* 헤더 */}
      <header style={{ borderBottom: '1px solid #2a1a1f', padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-cormorant)',
          fontSize: 'clamp(22px, 5vw, 32px)',
          fontWeight: 300,
          letterSpacing: '0.08em',
          color: '#c9a96e',
          margin: 0,
        }}>
          Wine Tasting
        </h1>
        <p style={{
          fontFamily: 'var(--font-noto-sans-kr)',
          fontSize: '12px',
          color: '#7a5c6a',
          marginTop: '4px',
        }}>
          {session.title}
        </p>
      </header>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* ── STEP 1: 와인 선택 ────────────────────────────────── */}
        {step === 'select' && (
          <div>
            <SectionTitle>오늘 시음한 와인을 선택하세요</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {session.wineList.map(wine => (
                <button
                  key={wine.id}
                  onClick={() => handleSelectWine(wine)}
                  style={{
                    background: '#15080d',
                    border: '1px solid #3a2030',
                    borderRadius: '12px',
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    width: '100%',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a96e')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a2030')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '17px', color: '#e8dcc8', margin: 0 }}>
                        {wine.name}
                      </p>
                      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#7a5c6a', margin: '4px 0 0' }}>
                        {wine.country} · {wine.grape}
                      </p>
                      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#9a7a6a', margin: '2px 0 0' }}>
                        {wine.desc}
                      </p>
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-noto-sans-kr)',
                      fontSize: '11px',
                      background: '#2a1020',
                      color: '#c9a96e',
                      borderRadius: '20px',
                      padding: '2px 10px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}>
                      {WINE_TYPE_LABEL[wine.type]}
                    </span>
                  </div>
                </button>
              ))}

              {/* 기타 와인 */}
              <div style={{
                background: '#15080d',
                border: '1px solid #3a2030',
                borderRadius: '12px',
                padding: '16px',
              }}>
                <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', color: '#e8dcc8', margin: '0 0 12px' }}>
                  ✏️ 기타 와인 직접 입력
                </p>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="와인 이름을 입력하세요"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {(['champagne', 'sparkling', 'white', 'red'] as WineType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setCustomType(t)}
                      style={{
                        ...chipStyle,
                        background: customType === t ? '#c9a96e' : '#2a1020',
                        color:      customType === t ? '#0a0608' : '#9a7a6a',
                      }}
                    >
                      {WINE_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleSelectCustom}
                  disabled={!customName.trim()}
                  style={{ ...primaryBtn, marginTop: '12px', opacity: customName.trim() ? 1 : 0.4 }}
                >
                  이 와인으로 시작
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: 테이스팅 ─────────────────────────────────── */}
        {step === 'tasting' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={handleReset} style={backBtn}>← 뒤로</button>
              <div>
                <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '18px', color: '#c9a96e', margin: 0 }}>
                  {isCustom ? customName : selectedWine?.name}
                </p>
                <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', color: '#7a5c6a', margin: '2px 0 0' }}>
                  {WINE_TYPE_LABEL[activeType]} 테이스팅
                </p>
              </div>
            </div>

            {/* 향/맛 느낌 */}
            <Card>
              <FieldLabel>어떤 향과 맛이 느껴지나요? (복수 선택)</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {FLAVORS[activeType].map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFlavor(f)}
                    style={{
                      ...chipStyle,
                      background: (tasting.flavors ?? []).includes(f) ? '#8b1a2e' : '#2a1020',
                      color:      (tasting.flavors ?? []).includes(f) ? '#f0d0c0' : '#9a7a6a',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Card>

            {/* 샴페인/스파클링 전용 */}
            {(activeType === 'champagne' || activeType === 'sparkling') && (
              <>
                <Card>
                  <FieldLabel>기포는 어떤가요?</FieldLabel>
                  <OptionGroup options={BUBBLE_OPTIONS} value={tasting.bubble} onChange={v => set('bubble', v)} />
                </Card>
                <Card>
                  <FieldLabel>여운(피니시)은?</FieldLabel>
                  <OptionGroup options={FINISH_OPTIONS} value={tasting.finish} onChange={v => set('finish', v)} />
                </Card>
              </>
            )}

            {/* 화이트/레드 공통 */}
            {(activeType === 'white' || activeType === 'red') && (
              <>
                <Card>
                  <FieldLabel>산도(신맛)는?</FieldLabel>
                  <OptionGroup options={ACIDITY_OPTIONS} value={tasting.acidity} onChange={v => set('acidity', v)} />
                </Card>
                <Card>
                  <FieldLabel>바디(무게감)는?</FieldLabel>
                  <OptionGroup options={BODY_OPTIONS} value={tasting.body} onChange={v => set('body', v)} />
                </Card>
              </>
            )}

            {/* 레드 전용 */}
            {activeType === 'red' && (
              <Card>
                <FieldLabel>탄닌(떫은맛)은?</FieldLabel>
                <OptionGroup options={TANNIN_OPTIONS} value={tasting.tannin} onChange={v => set('tannin', v)} />
              </Card>
            )}

            {/* 전체 느낌 */}
            <Card>
              <FieldLabel>전체적인 느낌을 자유롭게 적어주세요 *</FieldLabel>
              <textarea
                value={tasting.feeling ?? ''}
                onChange={e => set('feeling', e.target.value)}
                placeholder="예: 상큼하고 가벼워서 식전주로 딱 좋을 것 같아요"
                rows={3}
                style={{ ...inputStyle, resize: 'none', marginTop: '8px' }}
              />
            </Card>

            {error && (
              <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#e05050', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, width: '100%' }}>
              {loading ? '✨ 추천 생성 중...' : isCustom ? '🤖 AI 추천 받기' : '🍷 와인 추천 받기'}
            </button>
          </div>
        )}

        {/* ── STEP 3: 결과 ─────────────────────────────────────── */}
        {step === 'result' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => setStep('tasting')} style={backBtn}>← 다시 입력</button>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '18px', color: '#c9a96e', margin: 0 }}>
                추천 결과
              </p>
            </div>

            {recommendations.length === 0 ? (
              <p style={{ fontFamily: 'var(--font-noto-sans-kr)', color: '#7a5c6a', textAlign: 'center' }}>
                추천 결과가 없습니다.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {recommendations.map((rec, i) => (
                  <RecommendCard key={i} rec={rec} index={i} />
                ))}
              </div>
            )}

            <button onClick={handleReset} style={{ ...primaryBtn, width: '100%', marginTop: '28px' }}>
              처음으로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────

function RecommendCard({ rec, index }: { rec: RecommendedWine; index: number }) {
  return (
    <div style={{
      background: '#15080d',
      border: '1px solid #3a2030',
      borderRadius: '12px',
      padding: '18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '16px',
            color: '#e8dcc8',
            margin: 0,
            lineHeight: 1.3,
          }}>
            {index + 1}. {rec.name || rec.style}
          </p>
          {rec.name && rec.name !== rec.style && (
            <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#9a7a6a', margin: '2px 0 0' }}>
              {rec.style}
            </p>
          )}
        </div>
        <span style={{
          fontFamily: 'var(--font-noto-sans-kr)',
          fontSize: '10px',
          background: rec.source === 'ai' ? '#1a2a40' : '#1a0d20',
          color:      rec.source === 'ai' ? '#6ab0e0' : '#c9a96e',
          borderRadius: '20px',
          padding: '3px 10px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {rec.source === 'ai' ? '🤖 AI 추천' : '⭐ 큐레이션'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <Tag>{rec.grape}</Tag>
        <Tag>{rec.country}</Tag>
        <Tag color="#c9a96e">{rec.price}</Tag>
      </div>

      <p style={{
        fontFamily: 'var(--font-noto-sans-kr)',
        fontSize: '13px',
        color: '#b09080',
        lineHeight: 1.6,
        margin: '0 0 10px',
      }}>
        {rec.description}
      </p>

    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-noto-sans-kr)',
      fontSize: '14px',
      color: '#9a7a6a',
      marginBottom: '16px',
    }}>
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-noto-sans-kr)',
      fontSize: '13px',
      color: '#9a7a6a',
      margin: 0,
    }}>
      {children}
    </p>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#15080d',
      border: '1px solid #2a1020',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
    }}>
      {children}
    </div>
  );
}

function OptionGroup({ options, value, onChange }: {
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{
            ...chipStyle,
            background: value === o ? '#8b1a2e' : '#2a1020',
            color:      value === o ? '#f0d0c0' : '#9a7a6a',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: 'var(--font-noto-sans-kr)',
      fontSize: '11px',
      background: '#2a1020',
      color: color ?? '#7a5c6a',
      borderRadius: '20px',
      padding: '2px 10px',
    }}>
      {children}
    </span>
  );
}

// ── 공통 스타일 ───────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0f050a',
  border: '1px solid #3a2030',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e8dcc8',
  fontSize: '14px',
  fontFamily: 'var(--font-noto-sans-kr)',
  outline: 'none',
  boxSizing: 'border-box',
};

const chipStyle: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)',
  fontSize: '12px',
  borderRadius: '20px',
  padding: '5px 12px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
};

const primaryBtn: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)',
  fontSize: '14px',
  background: '#8b1a2e',
  color: '#f0d0c0',
  border: 'none',
  borderRadius: '10px',
  padding: '14px 24px',
  cursor: 'pointer',
  letterSpacing: '0.02em',
};

const backBtn: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)',
  fontSize: '12px',
  background: 'transparent',
  color: '#7a5c6a',
  border: '1px solid #3a2030',
  borderRadius: '8px',
  padding: '6px 12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

// ── export ────────────────────────────────────────────────────

export default function TastingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0608', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a96e', fontFamily: 'serif' }}>
        🍷 Loading...
      </div>
    }>
      <TastingContent />
    </Suspense>
  );
}
