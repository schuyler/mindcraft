import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'fs';
import { Coder } from '../src/agent/coder.js';

after(() => rmSync('bots/coder-test', { recursive: true, force: true }));

test('a reply whose code does not parse is retried with the parse error', async () => {
    // Two fences in one reply: extraction runs from the first fence to the last,
    // so the inner fence line ends up in the code.
    const replies = [
        '```\nbot.ran = 1;\n```javascript\nbot.ran = 2;\n```',
        '```\nbot.ran = 3;\nawait skills.wait(bot, 1);\n```',
    ];
    const prompts = [];
    const bot = { output: '', interrupt_code: false, modes: { pause() {} } };
    const agent = {
        name: 'coder-test',
        bot,
        prompter: {
            promptCoding: async (messages) => { prompts.push(messages); return replies.shift(); },
            skill_libary: { getAllSkillDocs: async () => ['skills.wait\n'] },
        },
        actions: { getBotOutputSummary: () => '' },
    };
    const coder = new Coder(agent);
    while (!coder.code_template || !coder.code_lint_template) await new Promise(r => setTimeout(r, 10));

    const result = await coder.generateCode({ getHistory: () => [] });

    assert.match(result, /^Agent wrote this code/);
    assert.equal(bot.ran, 3);
    assert.equal(prompts.length, 2);
    assert.match(prompts[1].at(-1).content, /SyntaxError/);
});
