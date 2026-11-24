import './lockdown.js';
import { runProbes } from './probes.js';
self.onmessage = async ({ data }) => self.postMessage(await runProbes(data.base, data.tag));
