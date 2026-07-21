// Simulate the extractJSON escape logic from the file
function extractJSONMin(text) {
  if (!text) throw new Error('empty');
  const start = text.indexOf('{');
  if (start === -1) throw new Error('no JSON');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\\\') { escape = true; continue; }   // <-- from source, 2-char string
    if (ch === '"' && !escape) { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('not closed');
}

// Correct version for comparison
function extractJSONCorrect(text) {
  if (!text) throw new Error('empty');
  const start = text.indexOf('{');
  if (start === -1) throw new Error('no JSON');
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }   // 1-char string
    if (ch === '"' && !escape) { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('not closed');
}

// First, check the literal length
const lit = '\\\\';
console.log('"\\\\\\\\" literal length:', lit.length, 'chars:', [...lit].map(c => c.charCodeAt(0)));

// Test: a JSON object with an escaped quote inside a string value
const testInput = 'prefix noise {"a":"b\\"c","d":1} suffix';
console.log('\nTest input:', testInput);
try {
  const r1 = extractJSONMin(testInput);
  console.log('BUGGY result:', r1);
} catch (e) {
  console.log('BUGGY error:', e.message);
}
try {
  const r2 = extractJSONCorrect(testInput);
  console.log('CORRECT result:', r2);
} catch (e) {
  console.log('CORRECT error:', e.message);
}

// Test 2: nested { in string
const test2 = 'before {"label":"contains { char","v":2} after';
try {
  const r1 = extractJSONMin(test2);
  console.log('BUGGY test2 result:', r1);
} catch (e) {
  console.log('BUGGY test2 error:', e.message);
}
try {
  const r2 = extractJSONCorrect(test2);
  console.log('CORRECT test2 result:', r2);
} catch (e) {
  console.log('CORRECT test2 error:', e.message);
}

// Test 3: simple { inside string - the main claimed benefit
const test3 = 'noise {"items":[{"a":1}]} more';
try {
  const r1 = extractJSONMin(test3);
  console.log('BUGGY test3 result:', r1);
} catch (e) {
  console.log('BUGGY test3 error:', e.message);
}
try {
  const r2 = extractJSONCorrect(test3);
  console.log('CORRECT test3 result:', r2);
} catch (e) {
  console.log('CORRECT test3 error:', e.message);
}
