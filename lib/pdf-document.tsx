import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { ExportColumn } from '@/types';

// Register fonts for react-pdf
// Font registration is necessary for proper rendering, especially with Thai language
Font.register({
  family: 'Sarabun',
  src: 'https://fonts.gstatic.com/s/sarabun/v13/DtVmJx26TKEr37c9YOZqulw.ttf',
});

// Create styles for PDF document
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Sarabun', // Using registered Thai font
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  dateTime: {
    fontSize: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#bfbfbf',
    borderBottomStyle: 'solid',
  },
  tableHeaderCell: {
    backgroundColor: '#f2f2f2',
    padding: 5,
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableCell: {
    padding: 5,
    fontSize: 10,
  },
});

interface PdfDocumentProps {
  title: string;
  dateInfo: string;
  data: any[];
  columns: ExportColumn[];
}

// PDF Document component
export const createPdfDocument = ({
  title,
  dateInfo,
  data,
  columns,
}: PdfDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.dateTime}>{dateInfo}</Text>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableRow}>
          {columns.map((column, index) => (
            <View
              key={`header-${index}`}
              style={[
                styles.tableHeaderCell,
                { width: `${100 / columns.length}%` },
              ]}
            >
              <Text>{column.header}</Text>
            </View>
          ))}
        </View>

        {/* Table Body */}
        {data.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.tableRow}>
            {columns.map((column, cellIndex) => {
              const value = row[column.accessor];
              const formattedValue =
                column.format && value !== undefined && value !== null
                  ? column.format(value)
                  : value !== undefined && value !== null
                  ? value
                  : 'N/A';

              return (
                <View
                  key={`cell-${rowIndex}-${cellIndex}`}
                  style={[
                    styles.tableCell,
                    { width: `${100 / columns.length}%` },
                  ]}
                >
                  <Text>{formattedValue}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

export default createPdfDocument;
