import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';

export default function Result() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>기록 확인</Top.TitleParagraph>} />}>
      <Card>
        <EmptyState
          title="결과 화면을 준비하고 있어요"
          description="분석이 끝나면 여기서 바로 확인할 수 있어요"
        />
      </Card>
    </ScreenScaffold>
  );
}
