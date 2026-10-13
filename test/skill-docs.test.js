import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSkillDocs } from '../src/agent/library/index.js';

test('goToPosition doc says it stops short and names min_distance', () => {
    const doc = getSkillDocs().find(d => d.startsWith('skills.goToPosition\n'));
    assert.match(doc, /Stops once within min_distance blocks/);
    assert.match(doc, /@param \{number\} min_distance,/);
});
