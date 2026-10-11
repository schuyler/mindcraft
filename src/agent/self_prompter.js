const STOPPED = 0
const ACTIVE = 1
const PAUSED = 2
export class SelfPrompter {
    constructor(agent) {
        this.agent = agent;
        this.state = STOPPED;
        this.loop_active = false;
        this.interrupt = false;
        this.prompt = '';
        this.idle_time = 0;
        this.cooldown = 2000;
        this.user_turns = 0;
    }

    start(prompt) {
        console.log('Self-prompting started.');
        if (!prompt) {
            if (!this.prompt)
                return 'No prompt specified. Ignoring request.';
            prompt = this.prompt;
        }
        this.state = ACTIVE;
        this.prompt = prompt;
        this.startLoop();
    }

    isActive() {
        return this.state === ACTIVE;
    }

    isStopped() {
        return this.state === STOPPED;
    }

    isPaused() {
        return this.state === PAUSED;
    }

    async handleLoad(prompt, state) {
        if (state == undefined)
            state = STOPPED;
        this.state = state;
        this.prompt = prompt;
        if (state !== STOPPED && !prompt)
            throw new Error('No prompt loaded when self-prompting is active');
        if (state === ACTIVE) {
            await this.start(prompt);
        }
    }

    setPromptPaused(prompt) {
        this.prompt = prompt;
        this.state = PAUSED;
    }

    async startLoop() {
        if (this.loop_active) {
            console.warn('Self-prompt loop is already active. Ignoring request.');
            return;
        }
        if (this.user_turns > 0)
            return; // update() starts the loop once the player's turn ends
        console.log('starting self-prompt loop')
        this.loop_active = true;
        let no_command_count = 0;
        const MAX_NO_COMMAND = 3;
        while (!this.interrupt) {
            const msg = `You are self-prompting with the goal: '${this.prompt}'. Your next response MUST contain a command with this syntax: !commandName. Respond:`;
            
            let used_command = await this.agent.handleMessage('system', msg, -1);
            if (this.interrupt)
                break;
            if (!used_command) {
                no_command_count++;
                if (no_command_count >= MAX_NO_COMMAND) {
                    let out = `Agent did not use command in the last ${MAX_NO_COMMAND} auto-prompts. Stopping auto-prompting.`;
                    this.agent.openChat(out);
                    console.warn(out);
                    this.state = STOPPED;
                    break;
                }
            }
            else {
                no_command_count = 0;
                await new Promise(r => setTimeout(r, this.cooldown));
            }
        }
        console.log('self prompt loop stopped')
        this.loop_active = false;
        this.interrupt = false;
    }

    update(delta) {
        // automatically restarts loop
        if (this.state === ACTIVE && !this.loop_active && this.user_turns === 0) {
            if (this.agent.isIdle())
                this.idle_time += delta;
            else
                this.idle_time = 0;

            if (this.idle_time >= this.cooldown) {
                console.log('Restarting self-prompting...');
                this.startLoop();
                this.idle_time = 0;
            }
        }
        else {
            this.idle_time = 0;
        }
    }

    stopLoop() {
        // the loop clears interrupt when it exits
        if (this.loop_active) {
            console.log('stopping self-prompt loop')
            this.interrupt = true;
        }
    }

    async stop(stop_action=true) {
        this.state = STOPPED;
        this.stopLoop();
        if (stop_action)
            await this.agent.actions.stop();
    }

    async pause() {
        this.state = PAUSED;
        this.stopLoop();
        await this.agent.actions.stop();
    }

    shouldInterrupt(is_self_prompt) { // to be called from handleMessage
        return is_self_prompt && this.interrupt;
    }

    beginUserTurn() {
        this.user_turns++;
        this.stopLoop();
    }

    endUserTurn() {
        this.user_turns--;
    }
}