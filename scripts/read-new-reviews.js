const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../ref/OZON Review.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log('Sheet name:', sheetName);
  console.log('Total rows:', data.length);
  console.log('\nFirst row sample:');
  console.log(JSON.stringify(data[0], null, 2));
  console.log('\nColumn names:');
  console.log(Object.keys(data[0] || {}));
} catch (error) {
  console.error('Error reading Excel file:', error.message);
}
