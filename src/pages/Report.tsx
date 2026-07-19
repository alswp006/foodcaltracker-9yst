import { Top, Paragraph, Spacing } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';

export default function Report() {
  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>주간 리포트</Top.TitleParagraph>} />}>
      <Card testId="report-summary-card">
        <Paragraph.Text typography="t4">리포트를 준비하고 있어요</Paragraph.Text>
        <Spacing size={4} />
        <Paragraph.Text typography="t6">기록이 쌓이면 주간 추이를 보여드려요</Paragraph.Text>
      </Card>
      <Spacing size={24} />
    </ScreenScaffold>
  );
}
