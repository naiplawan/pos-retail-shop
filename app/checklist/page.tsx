import { getChecklistItems } from '@/app/api/checklist/route';
import ChecklistDetail from './checklist-detail';

export default async function Checklist() {
  const data = await getChecklistItems();

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">รายการการสั่งซื้อ</h1>
      <ChecklistDetail initialItems={data} />
    </main>
  );
}
