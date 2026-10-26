// Runs the walkthrough: which step is showing, the little state of each screen, and visitor actions.
(() => {
    const { track } = app.dom;
    const { STEPS, show } = app.story.steps;
    const { createStage } = app.story.stage;
    const { newModel, applyAction, drawScreen, drawHost } = app.story.screens;

    const STEP_SECONDS = 9;
    const INTERACT_SECONDS = 16;
    const PULSE_SECONDS = 0.9;
    const PULSE_LIFT = 0.8;
    const SCREEN_MS = 90;
    const RING_GROWTH = 6;
    const ERASE = { kind: "erase" };

    function createPlayer(parent, scenario) {
        const stage = createStage(parent, scenario);
        const tagSets = STEPS.map((step) => step.tags(stage).map(([text, point]) => stage.tags.add(text, point)));
        const state = { idx: 0, playing: true, start: performance.now() / 1000 };
        const live = { models: [], host: newModel(), sends: [], demoDone: false, lastDraw: 0, running: true, last: 0 };
        const listeners = new Set();
        const notify = () => listeners.forEach((fn) => fn(state));

        function reset() {
            live.models = scenario.targets.map(() => newModel());
            live.host = newModel();
            live.sends = [];
            live.demoDone = false;
        }

        function go(idx) {
            state.idx = Math.max(0, Math.min(STEPS.length - 1, idx));
            state.start = performance.now() / 1000;
            reset();
            stage.tags.hideAll();
            tagSets[state.idx].forEach((tag) => { tag.on = true; });
            stage.setCamera(STEPS[state.idx].camera, false);
            notify();
        }

        const current = () => STEPS[state.idx];
        const liveIdx = () => current().live || [];

        function send(action) {
            const sec = performance.now() / 1000;
            const targets = liveIdx();
            if (!targets.length) return false;
            applyAction(live.host, action, sec);
            targets.forEach((idx) => applyAction(live.models[idx], action, sec));
            live.sends.push({ start: sec, targets });
            return true;
        }

        // Keyboard on the stage: typing scenarios take characters, stepping scenarios take Enter, Space or Right.
        function typeKey(evt) {
            if (evt.ctrlKey || evt.metaKey || evt.altKey) return false;
            const text = scenario.actions.find((action) => action.kind === "text");
            const step = scenario.actions.find((action) => action.kind === "step");
            const keys = { Enter: "\n", Tab: "\t" };
            if (text && evt.key === "Backspace") return send(ERASE);
            if (text && (evt.key.length === 1 || keys[evt.key])) return send({ kind: "text", text: keys[evt.key] || evt.key });
            if (step && [" ", "Enter", "ArrowRight"].includes(evt.key)) return send(step);
            return false;
        }

        function drawScreens(sec) {
            if (sec - live.lastDraw < SCREEN_MS / 1000) return;
            live.lastDraw = sec;
            const lit = liveIdx();
            drawHost(stage.host.screen.ctx, scenario, live.host, lit.length);
            stage.targets.forEach((slot, idx) => drawScreen(slot.screen.ctx, scenario, slot.name, live.models[idx], sec * 1000, lit.includes(idx)));
        }

        function animateRadio(sec) {
            const hostTip = stage.host.stick.group.position;
            stage.targets.forEach((slot, idx) => {
                const link = stage.links[idx];
                const to = slot.stick.group.position;
                link.position.copy(hostTip).add(to).multiplyScalar(0.5).setY(hostTip.y + PULSE_LIFT);
                link.scale.x = hostTip.distanceTo(to);
                link.material.opacity = liveIdx().includes(idx) ? 0.9 : 0.3;
                const send = live.sends.slice().reverse().find((item) => item.targets.includes(idx) && sec - item.start < PULSE_SECONDS);
                const pulse = stage.pulses[idx];
                pulse.visible = !!send && link.visible;
                if (send) pulse.position.lerpVectors(hostTip, to, (sec - send.start) / PULSE_SECONDS).setY(hostTip.y + PULSE_LIFT);
            });
            const ring = stage.rings[0];
            const at = ring.userData.at ?? -1;
            const sendAt = live.sends.length ? (sec - live.sends[live.sends.length - 1].start) / PULSE_SECONDS : 2;
            const growth = current().id === "pair" ? at : sendAt < 1 ? sendAt : -1;
            ring.visible = growth >= 0 && growth <= 1;
            if (ring.visible) {
                ring.position.copy(hostTip).setY(hostTip.y + 0.4);
                ring.scale.setScalar(1 + growth * RING_GROWTH);
                ring.material.opacity = 1 - growth;
            }
        }

        function frame(now) {
            if (!live.running) return;
            const sec = now / 1000;
            const dt = Math.min(0.05, sec - (live.last || sec));
            live.last = sec;
            const step = current();
            const t = sec - state.start;
            show(stage, step.show);
            step.pose(stage, t, sec);
            if (step.demoAt !== undefined && !live.demoDone && t >= step.demoAt) {
                live.demoDone = true;
                send({ ...scenario.demo });
            }
            if (step.tagText) tagSets[state.idx].forEach((tag, idx) => { tag.text = step.tagText(stage, idx); });
            drawScreens(sec);
            animateRadio(sec);
            if (state.playing && t > (step.interact ? INTERACT_SECONDS : STEP_SECONDS) && state.idx < STEPS.length - 1) go(state.idx + 1);
            stage.render(dt);
            requestAnimationFrame(frame);
        }

        track(() => { live.running = false; });
        go(0);
        stage.setCamera(STEPS[0].camera, true);
        requestAnimationFrame(frame);
        return {
            stage, state, go, send, typeKey,
            current, next: () => go(state.idx + 1), prev: () => go(state.idx - 1),
            setPlaying(value) { state.playing = value; notify(); },
            subscribe(fn) { listeners.add(fn); track(() => listeners.delete(fn)); },
        };
    }

    app.story.createPlayer = createPlayer;
})();
