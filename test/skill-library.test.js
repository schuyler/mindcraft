import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SkillLibrary } from '../src/agent/library/skill_library.js';

test('code docs always include goToPosition', async () => {
    const library = new SkillLibrary(null, null);
    await library.initSkillLibrary();
    const docs = await library.getRelevantSkillDocs('build a 5-block-tall dirt tower at x 4, z 63', 5);
    assert.match(docs, /skills\.goToPosition\n/);
});
