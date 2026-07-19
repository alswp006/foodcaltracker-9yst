import { Top, Paragraph, Spacing } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SubmitFooter } from '@/components/BottomCTA';
import { safeGet, safeSet } from '@/lib/storage';
import { STORAGE_KEYS, DEFAULT_FLAGS } from '@/lib/types';
import type { AppFlags } from '@/lib/types';

export default function Onboarding() {
  const navigate = useNavigate();

  const handleStart = () => {
    const flags = safeGet<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS);
    safeSet<AppFlags>(STORAGE_KEYS.flags, { ...flags, onboarded: true });
    navigate('/', { replace: true });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>시작하기</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="시작하기" onClick={handleStart} />}
    >
      <Paragraph.Text typography="t3">하루 섭취 목표를 정하면 리포트가 더 정확해져요</Paragraph.Text>
      <Spacing size={8} />
      <Paragraph.Text typography="t6">목표는 설정에서 언제든 바꿀 수 있어요</Paragraph.Text>
    </ScreenScaffold>
  );
}
