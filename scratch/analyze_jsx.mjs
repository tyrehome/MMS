import fs from 'fs';

const content = fs.readFileSync('c:/Users/sewwa/OneDrive/Desktop/Tyreshops/src/components/SupplierManagement.js', 'utf8');

const regex = /<([a-zA-Z0-9]+)([^>]*)\/?>|<\/([a-zA-Z0-9]+)>/g;
let stack = [];
let match;

while ((match = regex.exec(content)) !== null) {
  const [full, openTag, attrs, closeTag] = match;
  
  if (openTag) {
    if (attrs.trim().endsWith('/')) {
      // Self-closing
    } else {
      stack.push({ tag: openTag, line: content.substring(0, match.index).split('\n').length });
    }
  } else if (closeTag) {
    const last = stack.pop();
    if (!last || last.tag !== closeTag) {
      console.log(`Mismatch at line ${content.substring(0, match.index).split('\n').length}: expected ${last ? last.tag : 'nothing'}, got ${closeTag}`);
      if (last) stack.push(last);
    }
  }
}

if (stack.length > 0) {
  console.log('Unclosed tags:');
  stack.forEach(s => console.log(`${s.tag} at line ${s.line}`));
}
