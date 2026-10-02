"""Browser regressions for Phase 1.
Run npm run dev, then: python phase1-regression.py
Requires Python Playwright and Chromium (no AI requests are sent).
"""
import asyncio
import json
import os
from urllib.parse import urlsplit
from playwright.async_api import async_playwright

BASE = os.environ.get('GAME_TEST_URL', 'http://127.0.0.1:3000')
HTML = '''<html><body><div id="root"></div><div id="ui"></div>
<script type="module">import R from '/@react-refresh';R.injectIntoGlobalHook(window);
window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;
window.__vite_plugin_react_preamble_installed__=true;window.harnessReady=true;</script></body></html>'''
TESTS = r'''async () => {
 const React=(await import('/node_modules/.vite/deps/react.js')).default;
 const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
 const {dbService}=await import('/src/lib/db.ts');
 const {useGameState}=await import('/src/hooks/useGameState.ts');
 const {DEFAULT_APP_CONFIG}=await import('/src/lib/constants.ts');
 const {sanitizeHtml}=await import('/src/lib/sanitizeHtml.ts');
 const passed=[];
 const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn)=>{for(let i=0;i<500;i++){if(fn())return;await sleep(10);}throw new Error('Timed out: '+fn);};
 const reject=async(fn)=>{let failed=false;try{await fn();}catch{failed=true;}check(failed,'Expected transaction failure');};
 const card=(id,extra={})=>({id,name:id,faction:'CyberCore',element:'Fire',cardClass:'N',hp:1000,attack:100,defense:0,speed:100,role:'Striker',level:1,timestamp:1,lore:'Safe',imageUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',...extra});
 await dbService.initDB();await dbService.clearAll();
 await dbService.saveCard(card('saved'));
 localStorage.setItem('cineCurrency','0');
 localStorage.setItem('cineLevel','5');
 localStorage.setItem('cineSquadIds',JSON.stringify(['saved',null,null,null,null,null]));
 localStorage.setItem('cineCampaignProgress','{bad');
 localStorage.setItem('cinePhantasmProgress','null');
 function H(){window.game=useGameState();return null;}
 const root=createRoot(document.getElementById('root'));
 root.render(React.createElement(React.StrictMode,null,React.createElement(H)));
 await wait(()=>window.game?.squad[0]?.id==='saved');await sleep(30);
 check(game.currency===0,'Zero currency replaced');
 check(JSON.parse(localStorage.cineSquadIds)[0]==='saved','Squad erased during hydration');
 check(game.campaignProgress.chapter===1&&game.phantasmProgress.floor===1,'Corrupt save crashes/fails defaults');
 passed.push('StrictMode hydration, zero balance, malformed save');
 game.setFusionSlot1(game.cards[0]);game.setLeaderId('saved');
 await sleep(20);await game.updateCard({...game.cards[0],level:10});
 await wait(()=>game.squad[0]?.level===10&&game.fusionSlot1?.level===10);
 const originalSave=dbService.saveCard;
 dbService.saveCard=async()=>{throw new Error('Injected save failure');};
 await reject(()=>game.updateCard({...game.cards[0],level:99}));
 dbService.saveCard=originalSave;
 check(game.cards[0].level===10&&game.squad[0].level===10,'Failed update changed state');
 passed.push('Card update synchronizes squad/fusion; failed save preserves state');
 await game.addCard(card('material'));await sleep(20);
 await reject(()=>game.replaceCards(card('new',{bad:()=>{}}),['saved','material']));
 check((await dbService.getAllCards()).length===2,'Failed fusion deleted inputs');
 await reject(()=>game.replaceCards(card('new'),['saved','missing']));
 check((await dbService.getAllCards()).length===2,'Missing input allowed partial fusion');
 await game.replaceCards(card('saved',{level:11}),['material']);
 await wait(()=>game.cards.length===1&&game.squad[0]?.level===11);
 check(game.leaderId==='saved','Upgrade cleared leader');
 await game.addCard(card('material'));await sleep(20);
 await game.replaceCards(card('fused'),['saved','material']);
 await wait(()=>game.cards.length===1&&game.cards[0].id==='fused'&&game.squad[0]===null);
 check(game.leaderId===null&&game.fusionSlot1===null,'Fusion left stale references');
 passed.push('Atomic fusion rollback, missing input, upgrade and consumed references');
 for(const kind of ['implants','gears']){
   const item=id=>({id,name:id,slot:1,rarity:1,mainStat:{type:'ATK',value:10,isPercentage:false},subStats:[]});
   const save=kind==='implants'?'saveImplant':'saveGear';
   const list=kind==='implants'?'getAllImplants':'getAllGears';
   await dbService[save](item('a'));await dbService[save](item('b'));
   await dbService.changeEquipment('fused',kind,1,'a');
   await reject(()=>dbService.changeEquipment('fused',kind,1,'a'));
   await dbService.changeEquipment('fused',kind,1,'b');
   check((await dbService[list]()).map(i=>i.id).join()==='a','Replace equipment loses previous');
   const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,...args){if(this.name==='cards')throw new Error('Injected card write failure');return put.call(this,value,...args);};
   try{await reject(()=>dbService.changeEquipment('fused',kind,1,'a'));}finally{IDBObjectStore.prototype.put=put;}
   check((await dbService[list]()).map(i=>i.id).join()==='a','Aborted equipment transfer changed bag');
   check((await dbService.getAllCards())[0][kind][1].id==='b','Aborted equipment transfer changed card');
   await dbService.changeEquipment('fused',kind,1);
   check((await dbService[list]()).length===2,'Unequip duplicated/lost item');
 }
 await game.changeGear('fused',1,'a');await wait(()=>game.cards[0].gears?.[1]?.id==='a');
 check(!game.gears.some(i=>i.id==='a'),'Hook bag not synced');
 passed.push('Implant/gear equip, swap, unequip, duplicate rejection and injected rollback');
 const ui=createRoot(document.getElementById('ui'));
 const {SkillsView}=await import('/src/views/SkillsView.tsx');
 ui.render(React.createElement(SkillsView,{config:game.config,level:game.level,unlockedSkills:game.unlockedSkills,setUnlockedSkills:game.setUnlockedSkills}));
 await wait(()=>document.querySelector('#ui h4'));
 document.querySelector('#ui h4').closest('[class*="cursor-pointer"]').click();
 await wait(()=>game.unlockedSkills.length===1);await sleep(20);
 check(JSON.parse(localStorage.cineUnlockedSkills).length===1,'Skill unlock not persisted in parent');
 passed.push('Skills uses and persists parent game state');
 const host=document.createElement('div');
 host.innerHTML=sanitizeHtml('<img src=x onerror="window.pwned=1"><svg onload="window.pwned=1"></svg><script>window.pwned=1</script><span class="text-red-500" onclick="window.pwned=1">Text</span><strong>Bold</strong><br>');
 document.body.append(host);await sleep(30);
 check(!window.pwned&&!host.querySelector('img,svg,script,[onclick],[onerror]'),'Unsafe generated HTML survived');
 check(host.querySelector('strong')?.textContent==='Bold'&&host.querySelector('br'),'Formatting lost');host.remove();
 passed.push('HTML payload stripped while preserving supported formatting');
 const {SplicingView}=await import('/src/views/SplicingView.tsx');
 let removed=0,currencyDelta=0,matDelta={},errors=[];
 const props={config:DEFAULT_APP_CONFIG,currency:10000,modifyCurrency:n=>currencyDelta+=n,inventory:{materials:{gene_fire:100}},cards:[card('extract')],modifyInventory:(b,e,m)=>matDelta=m,onCompleteFusion:async()=>{},removeCard:async()=>{removed++;},updateCard:async()=>{},onError:m=>errors.push(m),onAlert:()=>{},isGlobalProcessing:false,setGlobalProcessing:()=>{}};
 ui.render(React.createElement(SplicingView,props));await wait(()=>document.querySelector('#ui img'));
 document.querySelector('#ui img').closest('[class*="cursor-pointer"]').click();await sleep(30);
 const clickText=async(text)=>{const matches=b=>b.textContent.toLowerCase().includes(text.toLowerCase())&&(text!=='Extract'||!b.textContent.includes('Extraction'));await wait(()=>Array.from(document.querySelectorAll('button')).some(matches));Array.from(document.querySelectorAll('button')).find(matches).click();await sleep(30);};
 await clickText('Extract');await sleep(1100);
 check(removed===0,'Extraction destroys before confirmation');
 check(document.body.textContent.includes('XÁC NHẬN TRÍCH XUẤT'),'No confirmation dialog');
 await clickText('Hủy');check(removed===0,'Cancel destroys card');
 await clickText('Extract');await clickText('Xác nhận');await wait(()=>removed===1);await sleep(30);
 check(currencyDelta===-50&&Object.values(matDelta)[0]>0,'Confirmed extraction cost/reward wrong');
 passed.push('Extraction waits for confirmation; cancel and successful commit');
 const spliceCard=card('splice',{cardClass:'SSR',level:10,genes:[]});
 props.cards=[spliceCard];props.removeCard=async()=>{throw Error('Injected');};
 props.updateCard=async()=>{throw Error('Injected');};currencyDelta=0;matDelta={};errors=[];
 ui.render(React.createElement(SplicingView,props));await sleep(40);await clickText('Splicing');
 await wait(()=>Array.from(document.querySelectorAll('#ui p')).some(p=>p.textContent==='splice'));
 Array.from(document.querySelectorAll('#ui p')).find(p=>p.textContent==='splice').closest('[class*="cursor-pointer"]').click();await sleep(30);
 Array.from(document.querySelectorAll('#ui span')).find(p=>p.textContent.includes('Pyro-Sequence')).closest('[class*="cursor-pointer"]').click();await sleep(30);
 const spliceButtons=Array.from(document.querySelectorAll('#ui button'));const spliceButton=spliceButtons.find(b=>b.textContent.includes('Splice')&&!b.textContent.includes('Splicing'));
 check(spliceButton,'Missing splice button');spliceButton.click();await wait(()=>errors.length===1);
 check(currencyDelta===0&&Object.keys(matDelta).length===0&&spliceCard.genes.length===0,'Failed splicing mutated card/cost');
 passed.push('Genes read nested materials; failed splice preserves genes and resources');
 const {ClinicView}=await import('/src/views/ClinicView.tsx');
 currencyDelta=0;matDelta={};let alerts=[];
 ui.render(React.createElement(ClinicView,{implants:[],cards:[],changeImplant:async()=>{},addImplant:async()=>{throw Error('Injected');},removeImplant:async()=>{},updateImplant:()=>{},updateCard:async()=>{},onAlert:(t,m)=>alerts.push(t),modifyCurrency:()=>{},currency:0,config:DEFAULT_APP_CONFIG,inventory:{materials:{'Fire Core':2}},modifyInventory:(b,e,m)=>matDelta=m}));
 await clickText('CHẾ TẠO');await clickText('Core');await wait(()=>alerts.length>0);
 check(Object.keys(matDelta).length===0&&!alerts.includes('Chế Tạo Thành Công'),'Failed crafting charges resources');
 passed.push('Crafting waits for successful save and preserves materials on failure');
 const {ArmoryView}=await import('/src/views/ArmoryView.tsx');
 alerts=[];matDelta={};
 ui.render(React.createElement(ArmoryView,{gears:[],cards:[],changeGear:async()=>{},addGear:async()=>{throw Error('Injected');},removeGear:async()=>{},updateGear:()=>{},updateCard:async()=>{},onAlert:(t,m)=>alerts.push(t),modifyCurrency:()=>{},currency:0,config:DEFAULT_APP_CONFIG,inventory:{materials:{'Gear Fragment':10}},modifyInventory:(b,e,m)=>matDelta=m}));
 await wait(()=>document.querySelector('#ui')?.textContent.includes('Kho Trang Bị'));
 await clickText('CHẾ TẠO');await clickText('Ghép Mảnh');await wait(()=>alerts.length>0);
 check(Object.keys(matDelta).length===0&&!alerts.includes('Chế Tạo Thành Công'),'Failed gear crafting charges materials');
 passed.push('Gear crafting failure preserves fragments');
 const {BlackMarketView}=await import('/src/views/BlackMarketView.tsx');
 alerts=[];let dustDelta=0,updated=0;
 const marketProps={config:DEFAULT_APP_CONFIG,cards:[card('market')],currency:0,modifyCurrency:()=>{},inventory:{quantumDust:100,materials:{}},modifyInventory:(b,e,m,d)=>dustDelta+=d||0,updateCard:async()=>{updated++;throw Error('Injected');},onAlert:(t,m)=>alerts.push(m),isGlobalProcessing:false,setGlobalProcessing:()=>{}};
 ui.render(React.createElement(BlackMarketView,marketProps));await clickText('Gene Restructure');
 await wait(()=>document.querySelectorAll('#ui select').length===2);
 const select=(index,value)=>{const el=document.querySelectorAll('#ui select')[index];el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));};
 select(0,'market');select(1,'role');await sleep(30);await clickText('Initialize Mutation');
 check(dustDelta===0&&updated===0&&alerts.some(m=>m.includes('150')),'Insufficient role dust allowed');
 marketProps.inventory={quantumDust:250,materials:{}};alerts=[];
 ui.render(React.createElement(BlackMarketView,marketProps));await sleep(30);await clickText('Initialize Mutation');await wait(()=>updated===1);
 check(dustDelta===0,'Failed reroll does not refund exact cost');
 passed.push('Role reroll checks actual dust cost and refunds failed save');
 const {CombatView}=await import('/src/views/CombatView.tsx');
 const realTimeout=window.setTimeout;const random=Math.random;
 window.setTimeout=(fn,ms,...args)=>realTimeout(fn,Math.min(ms||0,10),...args);Math.random=()=>0;
 const runCombat=async(savedHp,enemyHp,options={})=>{
   let wins=[],losses=[],processing=false,combatErrors=[],started=false;
   localStorage.setItem('cineCurrentCombatMode','phantasm');localStorage.setItem('cineWorldBoss', options.worldBoss || '{bad');
   const c=card('fighter',{hp:1000000,attack:1000000,speed:1000000});
   ui.render(React.createElement(React.StrictMode,null,React.createElement(CombatView,{key:'fight'+savedHp,cards:[c],squad:[c,null,null,null,null,null],setSquad:()=>{},config:DEFAULT_APP_CONFIG,currency:0,level:1,modifyCurrency:()=>{},modifyInventory:()=>{},gainExperience:()=>{},leaderId:null,setLeaderId:()=>{},eliteEnemySquad:[null,null,null,null,null,null],setEliteEnemySquad:()=>{},battlefieldEnemySquad:[{...card('enemy'),hp:enemyHp,attack:0,speed:1},null,null,null,null,null],setBattlefieldEnemySquad:()=>{},onOpenSquadSelector:()=>{},onClearSquadSlot:()=>{},onError:m=>combatErrors.push(m),onAlert:()=>{},onConfirm:()=>{},updateQuestProgress:()=>{},isGlobalProcessing:false,setGlobalProcessing:v=>processing=v,phantasmProgress:{floor:1,cardsHp:{fighter:savedHp}},onBattleStatusChange:v=>{if(v)started=true;if(v&&options.cancel)queueMicrotask(()=>ui.render(null));},onPhantasmWin:h=>{wins.push(h);if(options.fail)throw Error('Injected combat failure');},onPhantasmDefeat:h=>losses.push(h)})));
   if(options.cancel){await wait(()=>started&&!processing);await new Promise(r=>realTimeout(r,100));check(!wins.length&&!losses.length&&!processing,'Unmounted combat awards rewards/leaves lock');}
   else {await wait(()=>wins.length+losses.length>0||combatErrors.length>0);await sleep(20);}
   check((options.fail?combatErrors.length===1:!combatErrors.length)&&!processing,'Combat throws or leaves processing locked');return {wins,losses};
 };
 try{
   let outcome=await runCombat(0,1000000);check(outcome.wins.length===0&&outcome.losses[0].fighter===0,'Dead Phantasm squad healed or advanced');
   outcome=await runCombat(1,1);check(outcome.wins.length===1&&outcome.wins[0].fighter<=1,'Battle ignores saved Phantasm HP');
   outcome=await runCombat(1000000,1e15);check(outcome.wins.length===0&&document.body.textContent.includes('Thất Bại (Hòa)'), 'Action limit treated as ordinary defeat');
   passed.push('Phantasm defeat preserves floor, win uses saved HP; malformed World Boss opens; action-limit draw');
   await runCombat(1,1,{fail:true});
   await runCombat(100,1e15,{cancel:true});
   await runCombat(0,1000,{worldBoss:JSON.stringify({boss:null,level:1,attemptsToday:3,lastAttemptDate:'2026-10-02'})});
   check(JSON.parse(localStorage.cineWorldBoss).attemptsToday===3,'Reload reset attempts using UTC instead of UTC+7');
   passed.push('Combat error/unmount release processing and prevent late rewards; World Boss UTC+7 date');
 }finally{window.setTimeout=realTimeout;Math.random=random;}
 ui.unmount();await sleep(30);
 const clear=dbService.clearAll;dbService.clearAll=async()=>{throw Error('Injected reset failure');};
 try{await reject(()=>game.resetGame());}finally{dbService.clearAll=clear;}
 await wait(()=>!game.isProcessing);check(game.cards.length===1,'Failed reset changed cards');
 game.setCampaignProgress({chapter:2,stage:3});game.setPhantasmProgress({floor:5,cardsHp:{fused:1}});await sleep(20);
 await game.resetGame();await wait(()=>!game.cards.length&&!game.implants.length&&!game.gears.length&&game.phantasmProgress.floor===1&&game.campaignProgress.chapter===1);
 check(!game.isProcessing,'Reset leaves processing locked');
 passed.push('Reset clears all in-memory stores and releases lock on save failure');
 root.unmount();return passed;
}'''

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--no-proxy-server'])
        page = await browser.new_page()
        await page.clock.set_fixed_time('2026-10-01T18:00:00Z')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        async def route(request):
            if urlsplit(request.request.url).netloc != urlsplit(BASE).netloc:
                await request.abort()
            elif urlsplit(request.request.url).path == '/__phase1':
                await request.fulfill(body=HTML, content_type='text/html')
            else:
                await request.continue_()
        await page.route('**/*', route)
        await page.goto(BASE + '/__phase1')
        await page.wait_for_function('window.harnessReady')
        results = await page.evaluate(TESTS)
        assert not errors, errors
        print(json.dumps({'passed': len(results), 'cases': results, 'page_errors': errors}, ensure_ascii=False, indent=2))
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
