import { format } from 'date-fns';
import { Event, Response } from '@shared/schema';

export function exportToCSV(event: Event, responses: Response[]) {
  // ヘッダー行の作成
  const headers = [
    '名前',
    ...event.dates.map(date => {
      const d = new Date(date);
      return `${format(d, 'MM/dd HH:mm')}`;
    })
  ];

  // データ行の作成
  const rows = responses.map(response => [
    response.name,
    ...response.availability.map(available => available ? '○' : '×')
  ]);

  // 合計行の計算
  const totals = event.dates.map((_, dateIndex) => {
    return responses.reduce((sum, response) => {
      return sum + (response.availability[dateIndex] ? 1 : 0);
    }, 0);
  });

  // 合計行の追加
  rows.push([
    '参加可能人数',
    ...totals.map(total => `${total}/${responses.length}`)
  ]);

  // CSVデータの生成
  const csvContent = [
    // イベント情報
    [`イベント: ${event.title}`],
    [`主催者: ${event.organizer}`],
    [`回答期限: ${format(new Date(event.deadline), 'yyyy年MM月dd日')}`],
    event.description ? [`説明: ${event.description}`] : [],
    [], // 空行
    headers,
    ...rows
  ]
    .map(row => row.join(','))
    .join('\n');

  // ファイルのダウンロード
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${event.title}_出欠表.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
