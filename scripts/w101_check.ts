import { checkAllWords, summarizeIssues } from '../src/lib/dataConsistency'
import words from '../public/data/words.json'

const issues = checkAllWords(words as any)
const summary = summarizeIssues(issues)
console.log(JSON.stringify({ total: words.length, issueCount: issues.length, summary, samples: issues.slice(0, 10) }, null, 2))
