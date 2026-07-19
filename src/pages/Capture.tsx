import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';

export default function Capture() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>사진으로 기록</Top.TitleParagraph>} />}>
      <Card>
        <EmptyState
          title="촬영 기능을 준비하고 있어요"
          description="곧 사진 한 장으로 식사를 기록할 수 있어요"
        />
      </Card>
    </ScreenScaffold>
  );
}
