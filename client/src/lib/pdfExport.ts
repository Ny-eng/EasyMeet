import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Event, Response } from '@shared/schema';

export function exportToPDF(event: Event, responses: Response[]) {
  // A4サイズのPDFを作成（横向き）
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // タイトルセクション
  doc.setFontSize(24);
  doc.text(event.title, 20, 20);

  // イベント情報
  doc.setFontSize(12);
  doc.text(`主催者: ${event.organizer}`, 20, 30);
  doc.text(`回答期限: ${format(new Date(event.deadline), 'yyyy年MM月dd日')}`, 20, 37);

  if (event.description) {
    doc.text('説明:', 20, 44);
    const descriptionLines = doc.splitTextToSize(event.description, 250);
    doc.text(descriptionLines, 20, 51);
  }

  // テーブルデータの準備
  const tableData = responses.map(response => [
    response.name,
    ...response.availability.map(available => available ? 'O' : 'X')
  ]);

  // 合計を計算
  const totals = event.dates.map((_, dateIndex) => {
    return responses.reduce((sum, response) => {
      return sum + (response.availability[dateIndex] ? 1 : 0);
    }, 0);
  });

  // 合計行を追加
  if (responses.length > 0) {
    tableData.push([
      '合計',
      ...totals.map(total => `${total}/${responses.length}`)
    ]);
  }

  // テーブルヘッダーの作成
  const headers = [
    '名前',
    ...event.dates.map(date => {
      const d = new Date(date);
      return `${format(d, 'MM/dd')}\n${format(d, 'HH:mm')}`;
    })
  ];

  // テーブルの描画
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: event.description ? 60 : 45,
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [200, 200, 200],
      textColor: [0, 0, 0],
      halign: 'center',
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
    },
    bodyStyles: {
      halign: 'center',
    },
  });

  // ファイル名を生成
  const fileName = `${event.title.replace(/[\/\?<>\\:\*\|"]/g, '_')}_schedule.pdf`;

  // PDFをダウンロード
  doc.save(fileName);
}