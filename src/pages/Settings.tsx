import { Top, ListRow, Spacing } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}>
      <Card>
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="목표 수정" bottom="하루 섭취 목표를 바꿔요" />}
          onClick={() => navigate('/settings/goal')}
        />
      </Card>
      <Spacing size={24} />
    </ScreenScaffold>
  );
}
