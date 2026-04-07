const fs = require('fs');
const path = require('path');

const codeMd = fs.readFileSync('code.md', 'utf8');

// Regex to find code blocks with file path comments
const codeBlockRegex = /```[\w]*\n\/\/\s*(.+?)\n([\s\S]+?)```/g;

let match;
while ((match = codeBlockRegex.exec(codeMd)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2];
    
    const fullPath = path.join(__dirname, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, `// ${filePath}\n${fileContent}`);
    console.log(`Created: ${filePath}`);
}

// Special case for SQL schema
const sqlRegex = /```sql\n([\s\S]+?)```/;
const sqlMatch = sqlRegex.exec(codeMd);
if (sqlMatch) {
    const sqlContent = sqlMatch[1];
    const sqlPath = path.join(__dirname, 'supabase', 'schema.sql');
    const sqlDir = path.dirname(sqlPath);
    if (!fs.existsSync(sqlDir)) {
        fs.mkdirSync(sqlDir, { recursive: true });
    }
    fs.writeFileSync(sqlPath, sqlContent);
    console.log('Created: supabase/schema.sql');
}
