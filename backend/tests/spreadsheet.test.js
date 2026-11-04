import { strFromU8, unzipSync } from 'fflate';
import { buildXlsx, objectsToRows, rowsToCsv } from '../src/lib/spreadsheet.js';

const parts = async (sheets) => {
  const files = unzipSync(new Uint8Array(await buildXlsx(sheets)));
  return Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, strFromU8(bytes)]));
};

describe('spreadsheet export', () => {
  test('xlsx holds the package parts, one worksheet per sheet', async () => {
    const files = await parts([{ name: 'Ringkasan', rows: [['A'], ['1']] }, { name: 'Sinyal', rows: [['B'], ['2']] }]);
    expect(Object.keys(files).sort()).toEqual([
      '[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml',
      'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml',
    ]);
    expect(files['xl/workbook.xml']).toContain('<sheet name="Ringkasan" sheetId="1" r:id="rId1"/>');
  });

  test('cells keep numbers as numbers, escape text, bold the header and filter the table', async () => {
    const files = await parts([{ name: 'Peringatan', rows: [['Judul', 'Skor'], ['Isu <A> & "B"', 91]], widths: [40, 10] }]);
    const sheet = files['xl/worksheets/sheet1.xml'];
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1">');
    expect(sheet).toContain('Isu &lt;A&gt; &amp; &quot;B&quot;');
    expect(sheet).toContain('<c r="B2"><v>91</v></c>');
    expect(sheet).toContain('<col min="1" max="1" width="40" customWidth="1"/>');
    expect(sheet).toContain('<autoFilter ref="A1:B2"/>');
    expect(files['xl/workbook.xml']).toContain("'Peringatan'!$A$1:$B$2");
  });

  test('sheet names follow the Excel rules', async () => {
    const files = await parts([{ name: 'Isu: a/b', rows: [['x']] }, { name: 'Isu: a/b', rows: [['y']] }, { name: 'x'.repeat(40), rows: [['z']] }]);
    expect(files['xl/workbook.xml']).toContain('name="Isu  a b"');
    expect(files['xl/workbook.xml']).toContain('name="Isu  a b 2"');
    expect(files['xl/workbook.xml']).toContain(`name="${'x'.repeat(31)}"`);
  });

  test('csv quotes commas, quotes and line breaks', () => {
    expect(rowsToCsv(objectsToRows([{ a: 'x,y', b: 'say "hi"' }, { a: null, b: 'two\nlines' }]))).toBe('a,b\n"x,y","say ""hi"""\n,"two\nlines"');
  });
});
