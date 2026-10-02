"""Phase 4 lifecycle and persistence regressions; run with Vite dev.
Requires Python Playwright and Chromium. External requests are blocked.
"""
import asyncio
import json
import os
import runpy
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
BASE = os.environ.get('GAME_TEST_URL', 'http://127.0.0.1:3000')
HTML = runpy.run_path('phase1-regression.py')['HTML']
TESTS = r'''async () => {
 const React=(await import('/node_modules/.vite/deps/react.js')).default;
 const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
 const {useGameState}=await import('/src/hooks/useGameState.ts');
 const legacy=await import('/src/lib/db.ts');
 const adapter=await import('/src/infrastructure/storage/indexedDbGameRepository.ts');
 const composition=await import('/src/config/gameDependencies.ts');
 const {DEFAULT_APP_CONFIG}=await import('/src/config/appConfig.ts');
 const {getCurrentLanguage}=await import('/src/lib/i18n.ts');
 const passed=[];const check=(ok,msg)=>{if(!ok)throw Error(msg)};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn)=>{for(let i=0;i<500;i++){if(fn())return;await sleep(10)}throw Error('Timed out: '+fn)};
 check(legacy.dbService===adapter.dbService&&legacy.dbService===composition.gameRepository,'Compatibility paths created duplicate repository instances');
 await legacy.dbService.initDB();await legacy.dbService.clearAll();localStorage.clear();
 passed.push('Legacy DB imports and composition root share one repository');
 const card={id:'persisted',name:'Fixture',faction:'CyberCore',element:'Fire',role:'Striker',cardClass:'N',level:1,hp:1000,attack:100,defense:0,speed:100,timestamp:1,lore:'Safe',imageUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'};
 let root=createRoot(document.getElementById('root'));
 function Harness(){window.game=useGameState();return null}
 root.render(React.createElement(React.StrictMode,null,React.createElement(Harness)));
 await wait(()=>window.game?.databaseStatus==='online'&&window.game?.saveSync.mode==='writer'&&window.game?.isHydrated);
 await game.addCard(card);await wait(()=>game.cards.length===1);
 game.setSquad([game.cards[0],null,null,null,null,null]);
 game.saveConfig({...DEFAULT_APP_CONFIG,language:'en',artStyle:'stylized',geminiKey:'test-placeholder-key',pollinationsKey:'legacy-only',useCustomGemini:false});
 game.modifyCurrency(-500);game.modifyInventory(2,1,{'Light Core':3},20);
 game.setUnlockedSkills(['hp_1']);
 await wait(()=>JSON.parse(localStorage.cineApiConfig||'{}').language==='en'&&localStorage.cineCurrency==='1000'&&JSON.parse(localStorage.cineSquadIds||'[]')[0]==='persisted');
 check(getCurrentLanguage()==='en','Language config not synchronized');
 root.unmount();
 root=createRoot(document.getElementById('root'));window.game=null;
 root.render(React.createElement(React.StrictMode,null,React.createElement(Harness)));
 await wait(()=>game?.squad[0]?.id==='persisted');
 check(game.currency===1000&&game.inventory.baseTickets===2&&game.inventory.quantumDust===20,'Progress lost on remount');
 check(game.config.language==='en'&&game.config.artStyle==='stylized'&&game.config.geminiKey==='test-placeholder-key'&&game.config.pollinationsKey==='legacy-only','Settings migration lost persisted fields');
 check(game.unlockedSkills[0]==='hp_1','Skills lost on remount');root.unmount();
 passed.push('StrictMode remount restores cards, squad, settings, currency, inventory and skills');
 const {CombatView}=await import('/src/views/CombatView.tsx');
 const realTimeout=window.setTimeout,random=Math.random;
 window.setTimeout=(fn,ms,...args)=>realTimeout(fn,Math.min(ms||0,10),...args);Math.random=()=>0;
 for (const rejectSave of [false,true]) {
 const ui=createRoot(document.getElementById('ui'));
 let release,rejectPending,implantCalls=0,gearCalls=0,wins=0,processing=false,combatErrors=0;
 const pending=new Promise((resolve,reject)=>{release=resolve;rejectPending=reject});
 try{
  localStorage.setItem('cineCurrentCombatMode','phantasm');
  const fighter={...card,id:'fighter'};
  ui.render(React.createElement(CombatView,{cards:[fighter],squad:[fighter,null,null,null,null,null],setSquad:()=>{},config:DEFAULT_APP_CONFIG,currency:0,level:1,modifyCurrency:()=>{},modifyInventory:()=>{},gainExperience:()=>{},leaderId:null,setLeaderId:()=>{},eliteEnemySquad:[null,null,null,null,null,null],setEliteEnemySquad:()=>{},battlefieldEnemySquad:[{...card,id:'enemy',hp:1,attack:0,speed:1},null,null,null,null,null],setBattlefieldEnemySquad:()=>{},onOpenSquadSelector:()=>{},onClearSquadSlot:()=>{},onError:()=>combatErrors++,onAlert:()=>{},onConfirm:()=>{},updateQuestProgress:()=>{},isGlobalProcessing:false,setGlobalProcessing:v=>processing=v,phantasmProgress:{floor:1,cardsHp:{fighter:1000000}},onPhantasmWin:()=>wins++,onPhantasmDefeat:()=>{},addImplant:async()=>{implantCalls++;await pending},addGear:async()=>{gearCalls++}}));
  await wait(()=>implantCalls===1);
  ui.unmount();if(rejectSave)rejectPending(Error('Injected delayed persistence error'));else release();await new Promise(r=>realTimeout(r,100));
  check(!processing,'Unmount left processing locked');
  check(gearCalls===0&&wins===0,'Combat continued rewards/progress after unmount during pending persistence');
  check(combatErrors===0,'Cancelled battle opened a late error dialog after persistence rejection');
 }finally{release?.()}
 }
 window.setTimeout=realTimeout;Math.random=random;
 passed.push('Unmount during awaited combat reward stops subsequent reward/progress callbacks');
 return passed;
}'''
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--no-proxy-server'])
        page=await browser.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        async def route(request):
            if urlsplit(request.request.url).netloc!=urlsplit(BASE).netloc:await request.abort()
            elif urlsplit(request.request.url).path=='/__phase4':await request.fulfill(body=HTML,content_type='text/html')
            else:await request.continue_()
        await page.route('**/*',route)
        await page.goto(BASE+'/__phase4')
        try: await page.wait_for_function('window.harnessReady',timeout=10000)
        except Exception:
            print(json.dumps({'harness_errors':errors,'html':await page.content()},ensure_ascii=False))
            raise
        results=await page.evaluate(TESTS)
        assert not errors,errors
        print(json.dumps({'passed':len(results),'cases':results,'page_errors':errors},ensure_ascii=False,indent=2))
        await browser.close()
if __name__=='__main__':asyncio.run(main())
