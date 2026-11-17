import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {questions} from '../src/questions.js';
import {reportSchema,validateReport} from '../server/report-schema.js';
import {providerSchema} from '../server/provider-schema.js';
import {generatedReport} from './fixtures.js';
test('provider schema stays manageable while local detailed-report validation remains strict',()=>{
 const simplified=providerSchema(reportSchema);
 assert.equal(simplified.properties.dimensions.minItems,undefined);
 assert.match(simplified.properties.dimensions.description,/6/);
 assert.equal(reportSchema.properties.dimensions.minItems,6);
 const evidence=questions.map(q=>({id:q.id}));assert.doesNotThrow(()=>validateReport(generatedReport,evidence));
 const missing=structuredClone(generatedReport);missing.dimensions.pop();assert.throws(()=>validateReport(missing,evidence));
 const wrong=structuredClone(generatedReport);wrong.orientation.evidenceIds=['q999'];assert.throws(()=>validateReport(wrong,evidence));
 const sparse=structuredClone(generatedReport);delete sparse.areas[0].project;assert.throws(()=>validateReport(sparse,evidence));
});
