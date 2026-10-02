"""Real same-origin tabs, Web Locks, localStorage events and IndexedDB. No AI requests."""
import asyncio
import json
import os
import runpy
from urllib.parse import urlsplit
from playwright.async_api import async_playwright
BASE = os.environ.get('GAME_TEST_URL', 'http://127.0.0.1:3000')
HTML = runpy.run_path('phase1-regression.py')['HTML']
MOUNT = r'''async () => {
 const React=(await import('/node_modules/.vite/deps/react.js')).default;
 const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
 const {useGameState}=await import('/src/hooks/useGameState.ts');
 window.coordinator=(await import('/src/infrastructure/storage/saveCoordinator.ts')).saveCoordinator;
 window.repo=(await import('/src/config/gameDependencies.ts')).gameRepository;
 window.storage=(await import('/src/infrastructure/storage/browserStorage.ts')).browserStorage;
 window.root=createRoot(document.getElementById('root'));
 function Harness(){window.game=useGameState();return null}
 root.render(React.createElement(React.StrictMode,null,React.createElement(Harness)));
}'''
async def ready(page):
    await page.goto(BASE+'/__multitab')
    await page.wait_for_function('window.harnessReady')
    await page.evaluate(MOUNT)
    await page.wait_for_function('window.game?.isHydrated')
async def writer(page):
    await page.wait_for_function("window.game?.saveSync.mode==='writer'")
async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--no-proxy-server'])
        context=await browser.new_context(); errors=[];passed=[]
        async def route(request):
            if urlsplit(request.request.url).netloc!=urlsplit(BASE).netloc: await request.abort()
            elif urlsplit(request.request.url).path=='/__multitab': await request.fulfill(body=HTML,content_type='text/html')
            else: await request.continue_()
        await context.route('**/*',route)
        a=await context.new_page();b=await context.new_page()
        for page in [a,b]: page.on('pageerror',lambda error:errors.append(str(error)))
        await ready(a);await writer(a)
        await a.evaluate("game.modifyCurrency(-250);game.modifyInventory(2,1,{'Core':4},15);game.setUnlockedSkills(['hp_1']);game.setCampaignProgress({chapter:2,stage:3});game.setPhantasmProgress({floor:4,cardsHp:{one:333}})")
        await a.wait_for_function("localStorage.cineCurrency==='1250'&&JSON.parse(localStorage.cineSaveVersion||'{}').revision>0")
        await a.evaluate(r'''async()=>{await game.addCard({id:'one',name:'Operative',faction:'CyberCore',element:'Fire',role:'Striker',cardClass:'N',level:1,hp:100,attack:10,defense:0,speed:100,timestamp:1,lore:'Safe',imageUrl:'data:image/png;base64,fixture'});}''')
        await a.wait_for_function("game.cards.some(c=>c.id==='one')")
        await a.evaluate("game.setSquad([game.cards[0],null,null,null,null,null]);game.setLeaderId('one');game.saveConfig({...game.config,language:'en'})")
        await a.wait_for_function("JSON.parse(localStorage.cineSquadIds||'[]')[0]==='one'&&JSON.parse(localStorage.cineApiConfig||'{}').language==='en'")
        await ready(b)
        await b.wait_for_function("game.saveSync.mode==='readonly'&&game.squad[0]?.id==='one'&&game.currency===1250")
        await a.wait_for_function("game.saveSync.revision===JSON.parse(localStorage.cineSaveVersion).revision")
        initial=await a.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')
        await b.evaluate(r'''async()=>{
          game.modifyCurrency(999);game.modifyInventory(99,99);game.setSquad([null,null,null,null,null,null]);game.setUnlockedSkills(['hacked']);storage.setItem('cineWorldBoss','bad');
          window.rejections=[];
          for(const op of [()=>game.updateCard({...game.cards[0],name:'Overwrite'}),()=>game.resetGame(),()=>repo.deleteCard('one')]){
           try{await op();throw Error('Readonly save was allowed')}catch(error){if(error.name!=='SaveConflictError')throw error;rejections.push(error.name)}
          }
        }''')
        await b.wait_for_timeout(150)
        assert await a.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')==initial
        assert await b.evaluate("game.currency===1250&&game.squad[0].id==='one'&&game.unlockedSkills[0]==='hp_1'&&localStorage.cineWorldBoss!=='bad'&&rejections.length===3")
        passed.append('Opening a second tab never echoes defaults; stale mutations and repository writes are rejected')
        await a.evaluate(r'''async()=>{await game.updateCard({...game.cards[0],level:9});await game.addImplant({id:'implant',name:'Fixture',slot:1});await game.addGear({id:'gear',name:'Fixture',slot:1});game.modifyCurrency(50);game.modifyInventory(1,0,{'Core':1},5)}''')
        await b.wait_for_function("game.cards[0]?.level===9&&game.squad[0]?.level===9&&game.currency===1300&&game.inventory.quantumDust===20&&game.implants.length===1&&game.gears.length===1&&game.config.language==='en'&&game.phantasmProgress.floor===4&&game.campaignProgress.stage===3")
        version=await a.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')
        await b.wait_for_function('(revision)=>game.saveSync.revision===revision',arg=version)
        passed.append('Version events synchronize currency, inventory, skills, cards/squad, equipment, config and progression')
        stable=await a.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')
        await a.evaluate(r'''async()=>{let rejected=false;try{await game.replaceCards({...game.cards[0],id:'invalid-fusion'},['missing-input'])}catch{rejected=true}if(!rejected)throw Error('Missing consumed card must abort')}''')
        await a.wait_for_timeout(100)
        assert await a.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')==stable
        assert await b.evaluate("game.cards.length===1&&game.cards[0].id==='one'")
        passed.append('Aborted IndexedDB transaction changes neither revision nor mirrored save')
        await a.close();await writer(b)
        assert await b.evaluate('game.currency===1300&&game.cards[0].level===9')
        await b.evaluate('game.modifyCurrency(-100)')
        await b.wait_for_function('(revision)=>localStorage.cineCurrency===\'1200\'&&JSON.parse(localStorage.cineSaveVersion).revision>revision',arg=version)
        passed.append('Closing owner hands exclusive access to the waiting tab after fresh hydration')
        c=await context.new_page();c.on('pageerror',lambda error:errors.append(str(error)))
        await ready(c);await c.wait_for_function("game.saveSync.mode==='readonly'&&game.currency===1200")
        before_reset=await b.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')
        await b.evaluate('async()=>{await game.resetGame()}')
        await c.wait_for_function("game.currency===1500&&game.cards.length===0&&game.implants.length===0&&game.gears.length===0&&game.inventory.quantumDust===0&&game.squad.every(c=>!c)&&game.quests.length===0&&game.expeditions.length===0&&game.config.language==='vi'&&game.phantasmProgress.floor===1")
        assert await b.evaluate('JSON.parse(localStorage.cineSaveVersion).revision')>before_reset
        passed.append('Reset mirrors all stores without resetting the monotonic revision')
        # Preserve old callbacks after unmount: they must never regain unmanaged write access.
        await b.evaluate('root.unmount()');await writer(c)
        await b.evaluate(r'''async()=>{game.modifyCurrency(999);let denied=false;try{await game.addCard({id:'late'})}catch(e){denied=e.name==='SaveConflictError'}if(!denied)throw Error('Unmounted hook retained write access')}''')
        assert await c.evaluate('game.currency===1500')
        passed.append('Unmount releases ownership and stale callbacks cannot mutate save')
        await context.close()
        # Simultaneous startup must admit exactly one writer.
        context=await browser.new_context();await context.route('**/*',route)
        pages=[await context.new_page(),await context.new_page()]
        for page in pages:page.on('pageerror',lambda error:errors.append(str(error)))
        await asyncio.gather(*(ready(page) for page in pages))
        modes=[await page.evaluate('game.saveSync.mode') for page in pages]
        assert sorted(modes)==['readonly','writer'],modes
        passed.append('Simultaneous StrictMode startup admits exactly one writer')
        owner=pages[modes.index('writer')]; mirror=pages[modes.index('readonly')]
        await owner.wait_for_function("JSON.parse(localStorage.cineSaveVersion||'{}').revision>0")
        await mirror.wait_for_function("game.saveSync.revision>0")
        await mirror.evaluate("localStorage.removeItem('cineSaveVersion')")
        await owner.wait_for_function("game.saveSync.mode==='blocked'")
        await owner.evaluate("game.modifyCurrency(999)")
        assert await owner.evaluate("localStorage.cineCurrency==='1500'")
        passed.append('Live version rollback fails closed instead of resetting save revision')
        await context.close()
        # No locks / invalid future schema fail closed rather than permit unsafe writes.
        for cause in ['no-locks','future-schema']:
            context=await browser.new_context();await context.route('**/*',route);page=await context.new_page()
            page.on('pageerror',lambda error:errors.append(str(error)))
            await page.goto(BASE+'/__multitab');await page.wait_for_function('window.harnessReady')
            if cause=='no-locks':await page.evaluate("Object.defineProperty(navigator,'locks',{value:undefined})")
            else:await page.evaluate("localStorage.setItem('cineSaveVersion',JSON.stringify({schemaVersion:99,revision:50,writerId:'future',updatedAt:1}))")
            await page.evaluate(MOUNT);await page.wait_for_function("game?.saveSync.mode==='blocked'")
            await page.evaluate('game.modifyCurrency(-100)')
            assert await page.evaluate('localStorage.cineCurrency===undefined')
            await context.close()
        passed.append('Missing Web Locks and incompatible version schema fail closed')
        assert not errors,errors
        print(json.dumps({'passed':len(passed),'cases':passed,'page_errors':errors},ensure_ascii=False,indent=2))
        await browser.close()
if __name__=='__main__':asyncio.run(main())
