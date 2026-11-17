import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAiError } from '../server/ai-errors.js';
test('fallback diagnostics distinguish quota, availability, credentials and response format',()=>{
 for(const [error,code] of [[{status:429},'AI_QUOTA'],[{status:503},'AI_BUSY'],[{status:403},'AI_ACCESS'],[{status:400,message:'API key not valid'},'AI_ACCESS'],[{status:404},'AI_MODEL'],[new SyntaxError('bad JSON'),'AI_FORMAT'],[Error('Incomplete report'),'AI_FORMAT'],[{status:400},'AI_REQUEST'],[Error('fetch failed'),'AI_CONNECTION']]) assert.equal(classifyAiError(error).code,code);
});
test('diagnostics never echo SDK message or credentials',()=>{
 const secret='PRIVATE_API_KEY_EXAMPLE'; const d=classifyAiError({status:429,message:`quota https://example.com?key=${secret}`});assert.ok(!JSON.stringify(d).includes(secret));
});
