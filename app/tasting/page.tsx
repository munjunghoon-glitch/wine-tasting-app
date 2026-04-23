'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSession } from '@/data/sessions';
import type { Wine, WineType, TastingData, WineProfile, WineRecommendations, WineRecommendItem, Session } from '@/utils/types';

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

const BUBBLE_OPTIONS  = ['섬세함', '보통', '강함', '크리미함'];
const ACIDITY_OPTIONS = ['낮음', '보통', '높음'];
const BODY_OPTIONS    = ['가벼움', '미디엄', '묵직함'];
const TANNIN_OPTIONS  = ['부드러움', '보통', '강함'];
const FEELING_OPTIONS = [
  '상큼하고 가벼움', '풍부하고 진함', '우아하고 섬세함', '달콤하고 부드러움',
  '묵직하고 강렬함', '신선하고 생동감 있음', '복잡하고 흥미로움', '크리미하고 부드러움',
];

const TABS = [
  { key: 'by_country'  as const, label: '🌍 나라별' },
  { key: 'by_grape'    as const, label: '🍇 품종별' },
  { key: 'by_producer' as const, label: '🏺 생산자별' },
  { key: 'by_price'    as const, label: '💰 가격대별' },
];

type Step   = 'select' | 'tasting' | 'profile' | 'recommend';
type TabKey = 'by_country' | 'by_grape' | 'by_producer' | 'by_price';

// ── 메인 ──────────────────────────────────────────────────────

function TastingContent() {
  const searchParams = useSearchParams();
  const sessionId    = searchParams.get('session') || 'default';

  const [session, setSession]                 = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading]   = useState(true);
  const [step, setStep]                       = useState<Step>('select');
  const [selectedWine, setSelectedWine]       = useState<Wine | null>(null);
  const [isCustom, setIsCustom]               = useState(false);
  const [customName, setCustomName]           = useState('');
  const [customType, setCustomType]           = useState<WineType>('red');
  const [tasting, setTasting]                 = useState<Partial<TastingData>>({ flavors: [] });
  const [loadingProfile, setLoadingProfile]   = useState(false);
  const [loadingRecs, setLoadingRecs]         = useState(false);
  const [profile, setProfile]                 = useState<WineProfile | null>(null);
  const [recommendations, setRecommendations] = useState<WineRecommendations | null>(null);
  const [activeTab, setActiveTab]             = useState<TabKey>('by_country');
  const [error, setError]                     = useState('');
  const [recsError, setRecsError]             = useState('');
  const [downloading, setDownloading]         = useState(false);

  const activeType: WineType = isCustom ? customType : (selectedWine?.type ?? 'red');

  function handleSelectWine(wine: Wine) {
    setSelectedWine(wine);
    setIsCustom(false);
    setTasting({ flavors: [], type: wine.type });
    setStep('tasting');
  }

  function handleSelectCustom() {
    if (!customName.trim()) return;
    setSelectedWine(null);
    setIsCustom(true);
    setTasting({ flavors: [], type: customType });
    setStep('tasting');
  }

  function setField<K extends keyof TastingData>(key: K, value: TastingData[K]) {
    setTasting(prev => ({ ...prev, [key]: value }));
  }

  function toggleFlavor(f: string) {
    const cur = tasting.flavors ?? [];
    if (cur.includes(f)) {
      setField('flavors', cur.filter(x => x !== f));
    } else if (cur.length < 5) {
      setField('flavors', [...cur, f]);
    }
  }

  useEffect(() => {
    setSessionLoading(true);
    fetch(`/api/sessions?session=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.session) {
          setSession(data.session);
        } else {
          setSession(getSession(sessionId));
        }
      })
      .catch(() => setSession(getSession(sessionId)))
      .finally(() => setSessionLoading(false));
  }, [sessionId]);

  function toggleRating(star: number) {
    setTasting(prev => ({ ...prev, rating: prev.rating === star ? undefined : star }));
  }

  async function handleSubmit() {
    if (!tasting.feeling) {
      setError('전체적인 느낌을 선택해주세요.');
      return;
    }
    setError('');
    setRecsError('');
    setProfile(null);
    setRecommendations(null);
    setLoadingProfile(true);

    const wineName = isCustom ? (customName || '알 수 없는 와인') : (selectedWine?.name ?? '');
    const tastingPayload = {
      flavors: tasting.flavors ?? [],
      acidity: tasting.acidity,
      body:    tasting.body,
      tannin:  tasting.tannin,
      bubble:  tasting.bubble,
      feeling: tasting.feeling,
    };
    const baseBody = { wineName, wineType: activeType, tasting: tastingPayload };

    // ── 1단계: 프로파일 (빠름) ──────────────────────────
    try {
      const res = await fetch('/api/ai-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseBody),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '프로파일 생성 실패');

      setProfile(data.profile);
      setLoadingProfile(false);
      setStep('profile');

      // ── 2단계: 추천 (백그라운드) ───────────────────────
      setLoadingRecs(true);
      fetch('/api/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseBody, profile: data.profile }),
      })
        .then(r => r.json())
        .then(recsData => {
          if (!recsData.success) throw new Error(recsData.error || '추천 생성 실패');
          setRecommendations(recsData.recommendations);
          setActiveTab('by_country');
        })
        .catch(e => {
          setRecsError('추천 와인을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
          console.error('추천 API 오류:', e);
        })
        .finally(() => setLoadingRecs(false));

    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      setError(`분석 중 오류가 발생했습니다: ${msg}`);
      setLoadingProfile(false);
    }
  }

  async function downloadCard() {
    if (!profile || downloading) return;
    setDownloading(true);

    const { default: html2canvas } = await import('html2canvas');

    const chips = [
      ...(tasting.flavors ?? []),
      tasting.acidity ? `산도 ${tasting.acidity}` : null,
      tasting.body    ? `바디 ${tasting.body}`    : null,
      tasting.tannin  ? `탄닌 ${tasting.tannin}`  : null,
      tasting.bubble  ? `기포 ${tasting.bubble}`  : null,
      tasting.feeling ?? null,
    ].filter((c): c is string => Boolean(c));

    const chipHtml = chips.map(c =>
      `<span style="display:inline-block;font-size:22px;background:rgba(201,169,110,0.12);color:#c9a96e;border-radius:40px;padding:6px 20px;border:1px solid rgba(201,169,110,0.3);margin:0 8px 8px 0;font-family:'Noto Sans KR',sans-serif;">${c}</span>`
    ).join('');

    const ratingHtml = tasting.rating
      ? `<p style="font-size:28px;color:#c9a96e;text-align:center;margin:0 0 28px;letter-spacing:0.05em;font-family:'Noto Sans KR',sans-serif;">⭐ ${tasting.rating}/5</p>`
      : '';

    const section = (label: string, content: string) => `
      <div style="margin-bottom:28px;">
        <p style="font-size:22px;color:#c9a96e;margin:0 0 8px;letter-spacing:0.12em;font-family:'Noto Sans KR',sans-serif;">${label}</p>
        <p style="font-size:26px;color:#c4b0a0;line-height:1.8;margin:0;font-family:'Noto Sans KR',sans-serif;">${content}</p>
      </div>`;

    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', left: '-9999px', top: '0',
      width: '780px', background: '#0a0608',
      padding: '96px 56px 80px', boxSizing: 'border-box',
    });

    el.innerHTML = `
      <p style="font-size:28px;color:#f5ede4;letter-spacing:0.25em;text-align:center;margin:0 0 64px;font-family:'Cormorant Garamond',Georgia,serif;font-weight:300;">
        🍷 나의 와인 취향
      </p>
      ${ratingHtml}
      <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(201,169,110,0.4);border-radius:32px;padding:48px;margin-bottom:28px;">
        <p style="font-size:22px;color:#c9a96e;letter-spacing:0.15em;margin:0 0 24px;font-family:'Noto Sans KR',sans-serif;">✦ 취향 프로파일</p>
        <p style="font-size:52px;color:#c9a96e;margin:0 0 16px;line-height:1.3;font-family:'Cormorant Garamond',Georgia,serif;">${profile.persona}</p>
        <p style="font-size:26px;color:#f5ede4;margin:0 0 44px;line-height:1.7;font-family:'Noto Sans KR',sans-serif;">${profile.title}</p>
        ${section('향 취향', profile.aroma)}
        ${section('구조감', profile.structure)}
        <div>
          <p style="font-size:22px;color:#c9a96e;margin:0 0 8px;letter-spacing:0.12em;font-family:'Noto Sans KR',sans-serif;">어울리는 상황</p>
          <p style="font-size:26px;color:#c4b0a0;line-height:1.8;margin:0;font-family:'Noto Sans KR',sans-serif;">${profile.pairing}</p>
        </div>
      </div>
      <div style="margin-bottom:64px;">${chipHtml}</div>
      <p style="font-size:22px;color:rgba(201,169,110,0.4);text-align:center;margin:0;letter-spacing:0.08em;font-family:'Noto Sans KR',sans-serif;">
        wine-tasting-app-yw74.vercel.app
      </p>`;

    document.body.appendChild(el);
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: '#0a0608',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = 'wine-taste-결과.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      document.body.removeChild(el);
      setDownloading(false);
    }
  }

  function handleReset() {
    setStep('select');
    setSelectedWine(null);
    setIsCustom(false);
    setCustomName('');
    setTasting({ flavors: [] });
    setProfile(null);
    setRecommendations(null);
    setLoadingProfile(false);
    setLoadingRecs(false);
    setActiveTab('by_country');
    setError('');
    setRecsError('');
  }

  // ── 세션 로딩 화면 ────────────────────────────────────────
  if (sessionLoading || !session) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '48px' }}>🍷</div>
        <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', color: '#b09880', marginTop: '20px' }}>
          로딩 중...
        </p>
      </div>
    );
  }

  // ── 프로파일 분석 로딩 화면 ───────────────────────────────
  if (loadingProfile) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0608', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.6}}`}</style>
        <div style={{ fontSize: '60px', animation: 'pulse 2s ease-in-out infinite' }}>🍷</div>
        <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '20px', color: '#c9a96e', marginTop: '28px', letterSpacing: '0.04em', textAlign: 'center' }}>
          소믈리에가 당신의 취향을 분석 중입니다...
        </p>
        <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#b09880', marginTop: '10px' }}>
          잠시만 기다려 주세요
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0608', color: '#f5ede4' }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* 헤더 */}
      <header style={{ borderBottom: '1px solid rgba(201,169,110,0.25)', padding: '20px 16px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-cormorant)', fontSize: 'clamp(22px,5vw,32px)', fontWeight: 300, letterSpacing: '0.08em', color: '#f5ede4', margin: 0 }}>
          Wine Tasting
        </h1>
        <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#b09880', marginTop: '4px' }}>
          {session.title}
        </p>
      </header>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* ── STEP 0: 와인 선택 ──────────────────────────────── */}
        {step === 'select' && (
          <div>
            <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', color: '#c4b0a0', marginBottom: '16px' }}>
              오늘 시음한 와인을 선택하세요
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {session.wineList.map(wine => (
                <button
                  key={wine.id}
                  onClick={() => handleSelectWine(wine)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '12px', padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#c9a96e')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,169,110,0.4)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '17px', color: '#ffffff', margin: 0 }}>{wine.name}</p>
                      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#c4b0a0', margin: '4px 0 0' }}>{wine.country} · {wine.grape}</p>
                      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', color: '#c4b0a0', margin: '2px 0 0' }}>{wine.desc}</p>
                    </div>
                    <span style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', background: 'rgba(201,169,110,0.15)', color: '#c9a96e', borderRadius: '20px', padding: '2px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {WINE_TYPE_LABEL[wine.type]}
                    </span>
                  </div>
                </button>
              ))}

              <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '12px', padding: '16px' }}>
                <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', color: '#f5ede4', margin: '0 0 12px' }}>✏️ 기타 직접 입력</p>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="와인 이름을 입력하세요"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {(['champagne', 'sparkling', 'white', 'red'] as WineType[]).map(t => (
                    <button key={t} onClick={() => setCustomType(t)} style={{ ...chipStyle, background: customType === t ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.06)', color: customType === t ? '#f5ede4' : '#c4b0a0', border: `1px solid ${customType === t ? 'rgba(201,169,110,0.5)' : 'rgba(201,169,110,0.3)'}` }}>
                      {WINE_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
                <button onClick={handleSelectCustom} disabled={!customName.trim()} style={{ ...primaryBtn, marginTop: '12px', opacity: customName.trim() ? 1 : 0.4 }}>
                  테이스팅 시작 →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: 테이스팅 입력 ────────────────────────────── */}
        {step === 'tasting' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={handleReset} style={backBtn}>← 뒤로</button>
              <div>
                <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '18px', color: '#c9a96e', margin: 0 }}>
                  {isCustom ? customName : selectedWine?.name}
                </p>
                <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', color: '#c4b0a0', margin: '2px 0 0' }}>
                  {WINE_TYPE_LABEL[activeType]} 테이스팅
                </p>
              </div>
            </div>

            <Card>
              <FieldLabel>어떤 향이 느껴지나요? (최대 5개)</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {FLAVORS[activeType].map(f => {
                  const selected = (tasting.flavors ?? []).includes(f);
                  const maxed    = (tasting.flavors ?? []).length >= 5 && !selected;
                  return (
                    <button
                      key={f}
                      onClick={() => toggleFlavor(f)}
                      disabled={maxed}
                      style={{ ...chipStyle, background: selected ? 'rgba(201,169,110,0.25)' : 'rgba(201,169,110,0.06)', color: selected ? '#fff5e8' : maxed ? '#6a5a6a' : '#c4b0a0', border: `1px solid ${selected ? 'rgba(201,169,110,0.55)' : 'rgba(201,169,110,0.3)'}`, cursor: maxed ? 'not-allowed' : 'pointer', opacity: maxed ? 0.4 : 1 }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </Card>

            {(activeType === 'champagne' || activeType === 'sparkling') && (
              <Card>
                <FieldLabel>기포는 어떤가요?</FieldLabel>
                <OptionGroup options={BUBBLE_OPTIONS} value={tasting.bubble} onChange={v => setField('bubble', v)} />
              </Card>
            )}

            {(activeType === 'white' || activeType === 'red') && (
              <>
                <Card>
                  <FieldLabel>산도(신맛)는?</FieldLabel>
                  <OptionGroup options={ACIDITY_OPTIONS} value={tasting.acidity} onChange={v => setField('acidity', v)} />
                </Card>
                <Card>
                  <FieldLabel>바디(무게감)는?</FieldLabel>
                  <OptionGroup options={BODY_OPTIONS} value={tasting.body} onChange={v => setField('body', v)} />
                </Card>
              </>
            )}

            {activeType === 'red' && (
              <Card>
                <FieldLabel>탄닌(떫은맛)은?</FieldLabel>
                <OptionGroup options={TANNIN_OPTIONS} value={tasting.tannin} onChange={v => setField('tannin', v)} />
              </Card>
            )}

            <Card>
              <FieldLabel>전체적인 느낌은?</FieldLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {FEELING_OPTIONS.map(f => (
                  <button
                    key={f}
                    onClick={() => setField('feeling', f)}
                    style={{ ...chipStyle, background: tasting.feeling === f ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.06)', color: tasting.feeling === f ? '#f5ede4' : '#c4b0a0', border: `1px solid ${tasting.feeling === f ? 'rgba(201,169,110,0.5)' : 'rgba(201,169,110,0.3)'}` }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </Card>

            {/* 별점 */}
            <Card>
              <FieldLabel>이 와인, 점수를 매긴다면?</FieldLabel>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '14px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => toggleRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '36px', lineHeight: 1, padding: '4px', color: (tasting.rating ?? 0) >= star ? '#c9a96e' : '#c4b0a0', transition: 'color 0.15s, transform 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {(tasting.rating ?? 0) >= star ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </Card>

            {error && (
              <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#e05050', marginBottom: '12px', lineHeight: 1.5 }}>
                {error}
              </p>
            )}

            <button onClick={handleSubmit} disabled={!tasting.feeling} style={{ ...primaryBtn, width: '100%', opacity: tasting.feeling ? 1 : 0.45 }}>
              분석 시작 →
            </button>
          </div>
        )}

        {/* ── STEP 2: 취향 프로파일 카드 ───────────────────────── */}
        {step === 'profile' && profile && (
          <div style={{ animation: 'fadeIn 0.35s ease' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', color: '#c9a96e', letterSpacing: '0.15em', margin: '0 0 14px' }}>
                ✦ 나의 와인 취향
              </p>
              <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '26px', color: '#c9a96e', margin: '0 0 6px', lineHeight: 1.2 }}>
                {profile.persona}
              </p>
              <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', color: '#f5ede4', margin: '0 0 22px', lineHeight: 1.6 }}>
                {profile.title}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ProfileSection label="향 취향"      content={profile.aroma} />
                <ProfileSection label="구조감"        content={profile.structure} />
                <ProfileSection label="어울리는 상황" content={profile.pairing} />
              </div>
            </div>

            {/* 입력 요약 칩 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {(tasting.flavors ?? []).map(f => <SummaryChip key={f}>{f}</SummaryChip>)}
              {tasting.acidity && <SummaryChip>산도 {tasting.acidity}</SummaryChip>}
              {tasting.body    && <SummaryChip>바디 {tasting.body}</SummaryChip>}
              {tasting.tannin  && <SummaryChip>탄닌 {tasting.tannin}</SummaryChip>}
              {tasting.bubble  && <SummaryChip>기포 {tasting.bubble}</SummaryChip>}
              {tasting.feeling && <SummaryChip>{tasting.feeling}</SummaryChip>}
              {tasting.rating  && <SummaryChip>⭐ {tasting.rating}/5</SummaryChip>}
            </div>

            {/* 추천 로딩 중 */}
            {loadingRecs && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(201,169,110,0.3)', borderTop: '2px solid #c9a96e', borderRadius: '50%', animation: 'spin 0.9s linear infinite', flexShrink: 0 }} />
                <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#b09880', margin: 0 }}>
                  추천 와인을 준비하고 있습니다...
                </p>
              </div>
            )}

            {recsError && (
              <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#e05050', marginBottom: '12px' }}>
                {recsError}
              </p>
            )}

            {!loadingRecs && recommendations && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.4s ease' }}>
                <button onClick={() => setStep('recommend')} style={{ ...primaryBtn, width: '100%' }}>
                  🍾 나에게 맞는 와인 추천받기
                </button>
                <button onClick={downloadCard} disabled={downloading} style={{ ...downloadBtn, width: '100%' }}>
                  {downloading ? '저장 중...' : '📸 내 취향 카드 저장하기'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: 탭 기반 큐레이션 ─────────────────────────── */}
        {step === 'recommend' && recommendations && (
          <div>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,169,110,0.25)', marginBottom: '20px', overflowX: 'auto' }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #c9a96e' : '2px solid transparent', color: activeTab === tab.key ? '#c9a96e' : '#c4b0a0', padding: '10px 14px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.2s, border-color 0.2s', marginBottom: '-1px', flexShrink: 0 }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div key={activeTab} style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.25s ease' }}>
              {recommendations[activeTab].map((item, i) => (
                <RecommendCard key={i} item={item} index={i} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
              <button onClick={() => setStep('profile')} style={{ ...secondaryBtn, flex: 1 }}>← 취향 분석으로</button>
              <button onClick={handleReset} style={{ ...primaryBtn, flex: 1 }}>처음으로</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────

function ProfileSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', color: '#c9a96e', margin: '0 0 4px', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#c4b0a0', lineHeight: 1.7, margin: 0 }}>{content}</p>
    </div>
  );
}

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', background: 'rgba(201,169,110,0.12)', color: '#c9a96e', borderRadius: '20px', padding: '3px 10px', border: '1px solid rgba(201,169,110,0.3)' }}>
      {children}
    </span>
  );
}

function RecommendCard({ item, index }: { item: WineRecommendItem; index: number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '12px', padding: '18px' }}>
      <p style={{ fontFamily: 'var(--font-cormorant)', fontSize: '17px', color: '#ffffff', margin: '0 0 8px', lineHeight: 1.3 }}>
        {index + 1}. {item.name}
      </p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <Tag>{item.country}</Tag>
        {item.grape    && <Tag>{item.grape}</Tag>}
        {item.producer && <Tag>{item.producer}</Tag>}
        <Tag gold>{item.price}</Tag>
      </div>
      <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#c4b0a0', lineHeight: 1.7, margin: 0 }}>
        {item.reason}
      </p>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', color: '#b09880', margin: 0 }}>{children}</p>;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(201,169,110,0.4)', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
      {children}
    </div>
  );
}

function OptionGroup({ options, value, onChange }: { options: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
      {options.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          style={{ ...chipStyle, background: value === o ? 'rgba(201,169,110,0.2)' : 'rgba(201,169,110,0.06)', color: value === o ? '#f5ede4' : '#c4b0a0', border: `1px solid ${value === o ? 'rgba(201,169,110,0.5)' : 'rgba(201,169,110,0.3)'}` }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span style={{ fontFamily: 'var(--font-noto-sans-kr)', fontSize: '11px', background: gold ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.08)', color: gold ? '#c9a96e' : '#c4b0a0', borderRadius: '20px', padding: '2px 10px' }}>
      {children}
    </span>
  );
}

// ── 공통 스타일 ───────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,169,110,0.35)',
  borderRadius: '8px', padding: '10px 12px', color: '#f5ede4', fontSize: '14px',
  fontFamily: 'var(--font-noto-sans-kr)', outline: 'none', boxSizing: 'border-box',
};

const chipStyle: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', borderRadius: '20px',
  padding: '5px 12px', cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s',
};

const primaryBtn: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', background: '#8b1a2e',
  color: '#f5ede4', border: 'none', borderRadius: '10px', padding: '14px 24px',
  cursor: 'pointer', letterSpacing: '0.02em',
};

const downloadBtn: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)', fontSize: '14px', background: 'transparent',
  color: '#c9a96e', border: '1px solid #c9a96e', borderRadius: '10px', padding: '14px 24px',
  cursor: 'pointer', letterSpacing: '0.02em',
};

const secondaryBtn: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)', fontSize: '13px', background: 'transparent',
  color: '#c4b0a0', border: '1px solid rgba(201,169,110,0.35)', borderRadius: '10px',
  padding: '14px 24px', cursor: 'pointer',
};

const backBtn: React.CSSProperties = {
  fontFamily: 'var(--font-noto-sans-kr)', fontSize: '12px', background: 'transparent',
  color: '#c4b0a0', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '8px',
  padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap',
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
