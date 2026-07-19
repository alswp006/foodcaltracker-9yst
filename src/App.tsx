import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import { Skeleton } from '@toss/tds-mobile';
import { useAppReady } from '@/lib/hooks';
import { safeGet } from '@/lib/storage';
import { STORAGE_KEYS, DEFAULT_FLAGS } from '@/lib/types';
import type { AppFlags } from '@/lib/types';
import { PageShell } from '@/components/PageShell';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Capture from '@/pages/Capture';
import Result from '@/pages/Result';
import Search from '@/pages/Search';
import Premium from '@/pages/Premium';
import Report from '@/pages/Report';
import Settings from '@/pages/Settings';
import GoalEdit from '@/pages/GoalEdit';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

const TAB_ROOTS = ['/', '/report', '/settings'];

function BootSkeleton() {
  return (
    <PageShell>
      <div style={{ height: 28, marginBottom: 20 }}>
        <Skeleton />
      </div>
      <div style={{ height: 120, marginBottom: 12 }}>
        <Skeleton />
      </div>
      <div style={{ height: 120 }}>
        <Skeleton />
      </div>
    </PageShell>
  );
}

// 부트스트랩 완료 후에만 평가 — fct:flags.onboarded === false면 /onboarding 외 모든 경로를 막는다.
// 개발용 /__tds-gallery는 가드 대상에서 제외.
function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const flags = safeGet<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS);

  const exempt = location.pathname === '/onboarding' || location.pathname.startsWith('/__');
  console.log('ZZ OnboardingGate render pathname=', location.pathname, 'onboarded=', flags.onboarded, 'exempt=', exempt);
  if (!flags.onboarded && !exempt) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const ready = useAppReady();
  const location = useLocation();
  console.log('ZZ App render, ready=', ready, 'pathname=', location.pathname);

  if (!ready) {
    return <BootSkeleton />;
  }

  const showTabBar = TAB_ROOTS.includes(location.pathname);

  return (
    <OnboardingGate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/capture" element={<Capture />} />
        <Route path="/result" element={<Result />} />
        <Route path="/search" element={<Search />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/goal" element={<GoalEdit />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabBar && (
        <FloatingTabBar
          items={[
            { label: '홈', path: '/' },
            { label: '리포트', path: '/report' },
            { label: '설정', path: '/settings' },
          ]}
        />
      )}
    </OnboardingGate>
  );
}
