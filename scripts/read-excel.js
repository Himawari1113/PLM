const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ref', 'Ozon_Reviews_2026-02-13_2026-02-16.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('Sheet Name:', sheetName);
  console.log('Total Rows:', data.length);
  console.log('\nFirst 3 rows:');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
  
  if (data.length > 0) {
    console.log('\nColumn Names:');
    console.log(Object.keys(data[0]));
  }
} catch (error) {
  console.error('Error reading Excel file:', error);
}
