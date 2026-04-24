import fs from 'fs';

const content = fs.readFileSync('c:/Users/sewwa/OneDrive/Desktop/Tyreshops/src/components/SupplierManagement.js', 'utf8');

const tags = [
  'Box', 'Grid', 'Card', 'CardContent', 'Table', 'TableBody', 'TableCell', 
  'TableContainer', 'TableHead', 'TableRow', 'Paper', 'Dialog', 
  'DialogTitle', 'DialogContent', 'DialogActions', 'Typography', 'Button', 'IconButton'
];

tags.forEach(tag => {
  const open = (content.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
  const close = (content.match(new RegExp(`</${tag}>`, 'g')) || []).length;
  if (open !== close) {
    console.log(`${tag}: ${open} vs ${close} - MISMATCH!`);
  } else {
    console.log(`${tag}: ${open} vs ${close} - OK`);
  }
});
