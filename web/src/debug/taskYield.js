// A task boundary for local reviews without hidden-tab timer clamping.
// Unlike a resolved Promise, this lets input and painting run between work.
const channel = new MessageChannel(), waiting = [];
channel.port1.onmessage = () => waiting.shift()?.();
export const yieldTask = () => new Promise(resolve => { waiting.push(resolve); channel.port2.postMessage(null); });
