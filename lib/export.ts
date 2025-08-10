'use client';

import { format } from 'date-fns';
import { pdf } from '@react-pdf/renderer';
import { createPdfDocument } from '@/lib/pdf-document';
import type { ExportOptions, SheetsExportOptions } from '@/types';

// Updated exportToPdf to use react-pdf
export async function exportToPdf({ data, title, columns }: ExportOptions): Promise<void> {
  try {
    const currentDate = new Date().toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const currentTime = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Create PDF Document with react-pdf
    const MyDocument = createPdfDocument({
      title,
      data,
      columns,
      dateInfo: `Exported on: ${currentDate} ${currentTime}`,
    });

    // Generate PDF blob
    const blob = await pdf(MyDocument).toBlob();

    // Download PDF file
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

// Export data to Google Sheets
export async function exportToGoogleSheets({ data, sheetName }: SheetsExportOptions) {
  try {
    // Check if data is empty
    if (!data || data.length === 0) {
      throw new Error('No data available for export');
    }

    // Prepare CSV content
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','), // Add headers
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle values that might contain commas or are undefined/null
            return value == null ? 'N/A' : typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
          })
          .join(',')
      ),
    ].join('\n');

    // Create a blob and download it
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${sheetName}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    throw new Error('Failed to export to Google Sheets');
  }
}
