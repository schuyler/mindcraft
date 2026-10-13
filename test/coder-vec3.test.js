import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'fs';
import { Coder } from '../src/agent/coder.js';
import { lockdown } from '../src/agent/library/lockdown.js';

after(() => rmSync('bots/coder-test', { recursive: true, force: true }));

test('generated code can call Vec3 with or without new', async () => {
    const coder = new Coder({ name: 'coder-test' });
    while (!coder.code_template) await new Promise(r => setTimeout(r, 10));
    lockdown();

    const staged = await coder._stageCode('bot.vectors = [Vec3(1, 2, 3), new Vec3(4, 5, 6)];');
    const bot = { output: '', interrupt_code: false };
    await staged.func.main(bot);

    assert.equal(bot.vectors[0].x, 1);
    assert.equal(bot.vectors[1].y, 5);
});
