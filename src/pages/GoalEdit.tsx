import { Top, Paragraph } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SubmitFooter } from '@/components/BottomCTA';

export default function GoalEdit() {
  const navigate = useNavigate();

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>목표 수정</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="저장" onClick={() => navigate(-1)} />}
    >
      <Card>
        <Paragraph.Text typography="t4">목표 수정 화면을 준비하고 있어요</Paragraph.Text>
      </Card>
    </ScreenScaffold>
  );
}
