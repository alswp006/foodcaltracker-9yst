import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';

export default function Premium() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>프리미엄</Top.TitleParagraph>} />}>
      <Card>
        <EmptyState
          title="프리미엄 안내를 준비하고 있어요"
          description="무제한 분석과 상세 리포트를 제공할 예정이에요"
        />
      </Card>
    </ScreenScaffold>
  );
}
