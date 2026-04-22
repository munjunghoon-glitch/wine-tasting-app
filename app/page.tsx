'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get('session') || 'default';

  useEffect(() => {
    router.replace(`/tasting?session=${session}`);
  }, [session, router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0608',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#c9a96e',
      fontFamily: 'serif',
      fontSize: '18px',
    }}>
      🍷 Loading...
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
