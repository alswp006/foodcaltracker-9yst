import { Top } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/StateView';

export default function Search() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>음식 검색</Top.TitleParagraph>} />}>
      <Card>
        <EmptyState
          title="검색 기능을 준비하고 있어요"
          description="음식 이름으로 직접 찾을 수 있게 될 거예요"
        />
      </Card>
    </ScreenScaffold>
  );
}
