import {
  getChecklistSheets,
  getChecklistItemsbySheetId,
} from '@/app/api/checklist/route';
import ChecklistDetail from './checklist-detail';

export const dynamic = 'force-dynamic';

interface SearchParams {
  sheetId?: string;
}

export default async function Checklist({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sheetsdata = await getChecklistSheets();

  // Get items for the selected sheet if a sheetId is provided, otherwise return empty array
  let itemdata = [];
  if (searchParams.sheetId) {
    const sheetId = parseInt(searchParams.sheetId, 10);
    if (!isNaN(sheetId)) {
      itemdata = await getChecklistItemsbySheetId(sheetId);
    }
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">รายการคำสั่งซื้อ</h1>
      <ChecklistDetail initialItems={itemdata} initialSheets={sheetsdata} />
    </main>
  );
}
