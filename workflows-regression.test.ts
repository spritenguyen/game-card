import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CombatLifecycle } from './src/application/combat/combatLifecycle';
import { resolveCombatOutcome } from './src/application/combat/resolveCombatOutcome';
import { photoshoot } from './src/application/studio/photoshoot';
import { sendAgentMessage } from './src/application/agents/sendAgentMessage';
import { scenarioInput, tracePorts, fixtureLoot, seeded } from './tests/combatScenarios';
import type { Card } from './src/types';
import { DEFAULT_APP_CONFIG } from './src/config/appConfig';
const golden = JSON.parse(readFileSync(new URL('./tests/fixtures/combat-outcomes-before-extraction.json', import.meta.url), 'utf8'));

for (const { scenario, trace: expected } of golden) {
  test(`Combat baseline ${scenario.mode}/${scenario.threat}/${scenario.outcome}/turn ${scenario.turn}`, async () => {
    const input = scenarioInput(scenario), snapshot = structuredClone(input), trace: unknown[][] = [];
    await seeded(() => resolveCombatOutcome(input, tracePorts(trace), fixtureLoot));
    assert.deepEqual(JSON.parse(JSON.stringify(trace)), expected);
    assert.deepEqual(input, snapshot, 'Outcome resolution must not mutate battle snapshot');
  });
}

test('Combat lifecycle rejects double admission and stale runs across cancel/reset/restart', () => {
  const state = new CombatLifecycle();
  assert.equal(state.phase, 'idle');
  const first = state.start()!;
  assert.equal(state.phase, 'running');
  assert.equal(state.start(), null);
  state.resolve(first); assert.equal(state.phase, 'resolving'); assert.equal(state.start(), null);
  state.cancel(); assert.equal(state.owns(first), false);
  state.reset(); const next = state.start()!;
  state.fail(first); state.complete(first); state.resolve(first);
  assert.equal(state.phase, 'running');
  state.resolve(next); state.complete(next); assert.equal(state.phase, 'completed');
  const failed = state.start()!; state.fail(failed); state.complete(failed);
  assert.equal(state.phase, 'failed');
});

// Each persistence checkpoint must prevent all subsequent effects after cancellation.
for (const mode of ['single_boss', 'battlefield', 'phantasm', 'world_boss']) {
 for (const checkpoint of ['implant', 'gear', ...(mode === 'battlefield' || mode === 'single_boss' ? ['card'] : [])]) {
  test(`Cancellation during ${mode}/${checkpoint} prevents remaining effects`, async () => {
    const trace: unknown[][] = [], ports = tracePorts(trace);
    let cancel = false, release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    ports.isCancelled = () => cancel;
    const key = ({ implant: 'addImplant', gear: 'addGear', card: 'updateCard' } as const)[checkpoint];
    ports[key] = async () => { cancel = true; trace.push(['pending']); await pending; };
    const operation = seeded(() => resolveCombatOutcome(scenarioInput({ mode, threat: 'Elite', outcome: 'victory', turn: 1 }), ports, fixtureLoot));
    while (!cancel) await new Promise(resolve => setImmediate(resolve));
    const snapshot = structuredClone(trace); release(); await operation;
    assert.deepEqual(trace, snapshot);
  });
 }
}

test('Already cancelled outcome has no side effects; persistence rejection propagates once', async () => {
  const trace: unknown[][]=[]; const ports=tracePorts(trace);
  const input=scenarioInput({mode:'phantasm',threat:'Elite',outcome:'victory',turn:1});
  ports.isCancelled=()=>true; await resolveCombatOutcome(input,ports,fixtureLoot); assert.deepEqual(trace,[]);
  ports.isCancelled=()=>false; ports.addImplant=async()=>{throw Error('save failed')};
  await assert.rejects(seeded(()=>resolveCombatOutcome(input,ports,fixtureLoot)),/save failed/);
  assert.ok(!trace.some(([kind])=>['gear','result','phantasmWin'].includes(kind as string)));
});

const card={id:'card',affection:8,imageUrl:'old',name:'Original'} as Card;
for(const failure of ['provider','deleted','save',null]){
 test(`Photoshoot preserves metadata and balances Dust: ${failure || 'success'}`,async()=>{
  const events: unknown[][]=[];let saved:Card|undefined;
  const ports={getCurrentCard:()=>failure==='deleted'?undefined:{...card,name:'Concurrent edit',affection:20,variants:['old','concurrent']},
   updateCard:async(value:Card)=>{events.push(['save']);if(failure==='save')throw Error('save');saved=value},
   modifyDust:(amount:number)=>events.push(['dust',amount]),setProcessing:(value:boolean)=>events.push(['processing',value]),
   onImage:(value:string)=>events.push(['image',value]),onSuccess:()=>events.push(['success']),onError:()=>events.push(['error'])};
  await photoshoot({card,concept:'Vogue',ratio:'9:16',model:'fixed',config:DEFAULT_APP_CONFIG},ports,async(payload,config,model,ignoreCache)=>{
   assert.equal(payload.studioConcept,'Vogue');assert.equal(payload.studioRatio,'9:16');assert.equal(ignoreCache,true);assert.equal(model,'fixed');
   if(failure==='provider')throw Error('provider');return 'new';
  });
  assert.deepEqual(events[0],['processing',true]);assert.deepEqual(events[1],['dust',-50]);assert.deepEqual(events.at(-1),['processing',false]);
  assert.equal(events.filter(([kind])=>kind==='error').length,failure?1:0);
  assert.equal(events.filter(([kind])=>kind==='dust').reduce((sum,[,amount])=>sum+Number(amount),0),failure?0:-50);
  if(!failure){assert.equal(saved?.name,'Concurrent edit');assert.equal(saved?.affection,30);assert.deepEqual(saved?.variants,['old','concurrent','new']);}
 });
}

for(const failure of ['initial-save','provider','reply-save','error-save',null]){
 test(`Agent message persistence and controlled error: ${failure||'success'}`,async()=>{
  let current={...card,chatHistory:[],resonance:998} as Card;let saves=0,calls=0,errors=0;
  await sendAgentMessage(card,'Hello',DEFAULT_APP_CONFIG,{
   getCurrentCard:()=>current,isCurrent:()=>true,onError:()=>{errors++},updateCard:async value=>{
    saves++;if((failure==='initial-save'&&saves===1)||(failure==='reply-save'&&saves===2)||(failure==='error-save'&&saves===2))throw Error('save');current=value;
   },
  },async()=>{calls++;current={...current,name:'Concurrent edit'};if(failure==='provider'||failure==='error-save')throw Error('provider');return {reply:'Reply',isBounty:false,bountyData:null} as any});
  assert.equal(calls,failure==='initial-save'?0:1);
  assert.equal(errors,failure==='initial-save'||failure==='error-save'?1:0);
  if(!failure){assert.equal(current.name,'Concurrent edit');assert.equal(current.resonance,999);assert.deepEqual(current.chatHistory?.map(m=>m.content),['Hello','Reply']);}
  if(failure==='provider'||failure==='reply-save')assert.match(current.chatHistory!.at(-1)!.content,/Tín hiệu gián đoạn/);
 });
}

test('Agent switching/unmount while provider pending drops stale reply',async()=>{
 let current=card,active=true,resolve!: (reply:any)=>void;let saves=0;
 const pending=new Promise<any>(r=>resolve=r);
 const operation=sendAgentMessage(card,'Hello',DEFAULT_APP_CONFIG,{getCurrentCard:()=>current,isCurrent:()=>active,updateCard:async value=>{saves++;current=value}},async()=>pending);
 await new Promise(r=>setImmediate(r));active=false;resolve({reply:'Late',isBounty:false});await operation;
 assert.equal(saves,1);assert.equal(current.chatHistory?.length,1);
});

import { advanceCombatTurn } from './src/domain/combatTurnState';
const turnGolden = JSON.parse(readFileSync(new URL('./tests/fixtures/combat-turns-before-extraction.json', import.meta.url), 'utf8'));
test('150 ATB transitions match original actor priority, thresholds, dead slots and clock advances', () => {
 for(const {state,result} of turnGolden){
  const snapshot=structuredClone(state);
  assert.deepEqual(advanceCombatTurn(state),result);
  assert.deepEqual(state,snapshot,'ATB transition mutated input');
 }
});

test('Agent unmount during initial save skips provider; stale provider rejection skips error persistence', async () => {
 for(const stage of ['initial-save','provider-rejection']){
  let active=true,saves=0,calls=0,errors=0,release!:()=>void,reject!: (reason:Error)=>void;
  const pending=new Promise<void>((resolve,fail)=>{release=resolve;reject=fail});
  const operation=sendAgentMessage(card,'Hello',DEFAULT_APP_CONFIG,{
   getCurrentCard:()=>card,isCurrent:()=>active,onError:()=>{errors++},
   updateCard:async()=>{saves++;if(stage==='initial-save')await pending},
  },async()=>{calls++;if(stage==='provider-rejection')await pending;return {reply:'Late',isBounty:false} as any});
  await new Promise(resolve=>setImmediate(resolve));active=false;
  if(stage==='initial-save')release();else reject(Error('Late provider rejection'));
  await operation;assert.equal(saves,1);assert.equal(errors,0);assert.equal(calls,stage==='initial-save'?0:1);
 }
});

test('Agent bounty attachment retains content and existing history', async () => {
 let current={...card,chatHistory:[{role:'assistant',content:'Earlier'}],affection:12} as Card;
 await sendAgentMessage(card,'Mission?',DEFAULT_APP_CONFIG,{getCurrentCard:()=>current,isCurrent:()=>true,updateCard:async value=>{current=value}},async()=>({reply:'Accepted',isBounty:true,bountyData:{name:'Target',threatLevel:'Elite',hp:100,attack:20}} as any));
 assert.equal(current.resonance,14);
 assert.deepEqual(current.chatHistory?.slice(0,2).map(message=>message.content),['Earlier','Mission?']);
 assert.match(current.chatHistory!.at(-1)!.content,/Mục tiêu: Target/);
});
