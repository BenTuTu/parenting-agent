import 'dotenv/config';
import { run, user } from '@openai/agents';
import { parentingAgent } from '../src/agent.js';

const question = process.argv[2] ?? '我家宝宝10个月了，应该会哪些技能？';

const result = await run(parentingAgent, [user(question)]);
console.log(result.finalOutput);
