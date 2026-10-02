"""Run with npm run dev. Browser integration tests use mocked provider transports."""
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
 const ai=await import('/src/services/ai/index.ts');
 const {FullCard}=await import('/src/components/FullCard.tsx');
 const {StudioView}=await import('/src/views/StudioView.tsx');
 const {DEFAULT_APP_CONFIG}=await import('/src/lib/constants.ts');
 const config={...DEFAULT_APP_CONFIG,language:'en',geminiKey:'test-placeholder-key',pollinationsKey:'must-not-be-sent',useCustomGemini:false};
 const passed=[];const check=(ok,msg)=>{if(!ok)throw Error(msg)};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn)=>{for(let i=0;i<500;i++){if(fn())return;await sleep(10)}throw Error('Timed out: '+fn)};
 const click=async(text)=>{await wait(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes(text)));Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes(text)).click();await sleep(30)};
 const sample=(schema,key)=>{
  switch(schema.type.toLowerCase()){
   case 'object':return Object.fromEntries(Object.entries(schema.properties).map(([k,s])=>[k,sample(s,k)]));
   case 'array':return [sample(schema.items,'item'),sample(schema.items,'item')];
   case 'string':return key==='reply'?'AI reply':key==='faction'?'CyberCore':key==='element'?'Fire':'test '+key;
   case 'number':case 'integer':return 100;
   case 'boolean':return false;
  }
 };
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=';
 const imageResponse=()=>new Response(Uint8Array.from(atob(png),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/png'}});
 window.calls=[];window.failText=false;window.failImage=false;window.delayReply=false;window.delayImage=false;
 const fetchBefore=window.fetch;
 window.fetch=async(url,init)=>{
  const address=String(url);calls.push({url:address,body:init?.body,headers:init?.headers});
  if(address.includes(':generateContent')){
   if(failText)return Response.json({error:{message:'Unavailable'}},{status:503});
   const schema=JSON.parse(init.body).generationConfig?.responseSchema;
   const response=()=>Response.json({candidates:[{content:{parts:[{text:schema?JSON.stringify(sample(schema,'root')):'Image alt text.'}]}}]});
   if(delayReply&&schema?.properties?.reply)return new Promise(resolve=>window.releaseReply=()=>resolve(response()));
   return response();
  }
  if(address===ai.AI_CONFIG.text.pollinationsEndpoint)return Response.json({error:'Unavailable'},{status:503});
  if(address===ai.AI_CONFIG.image.endpoint){
   check(init.method==='POST','Worker method wrong');
   check(!new Headers(init.headers).has('Authorization'),'Worker received Pollinations key');
   if(delayImage)return new Promise(resolve=>window.releaseImage=()=>resolve(imageResponse()));
   return failImage?Response.json({error:'Image generation failed'},{status:500}):imageResponse();
  }
  return fetchBefore(url,init);
 };
 const base={id:'original',name:'Original Name',faction:'CyberCore',element:'Fire',cardClass:'UR',hp:1000,attack:100,defense:0,speed:100,level:1,height:170,weight:60,measurements:'90-60-90',lore:'Original lore',ultimateMove:'Original move',visualDescription:'A warrior',translations:{en:{name:'Localized Name',lore:'Localized lore'}},imageUrl:'data:image/png;base64,'+png};
 const generated=await ai.generateCardFromAI('test','N',config);check(generated.origin==='Extracted'&&generated.ultimateLevel===1,'Card facade changed domain behavior');
 await ai.generateFusionFromAI(base,base,'SSR',config);await ai.generateAscensionFromAI(base,'enigma',config);await ai.generateBossFromAI(1000,100,'normal',config);await ai.translateCardWithAI(base,'en',config);await ai.generateCampaignScenarioFromAI('stage','description','team',config);await ai.generateDialogueFromAI(base,'context',config);await ai.generateAltTextFromAI(base,config);
 passed.push('Card/fusion/ascension/boss/translation/campaign/dialogue/vision facade integration');
 const before=calls.filter(c=>c.url.includes(':generateContent')).length;
 await ai.generateImageFromAi({...base,imageUrl:'',studioConcept:'test concept',studioRatio:'1:1'},config);
 await ai.generateBackgroundImageFromAi('test background',config);
 check(calls.filter(c=>c.url.includes(':generateContent')).length===before,'Image calls text AI');
 check(calls.some(c=>c.url===ai.AI_CONFIG.image.endpoint&&JSON.parse(c.body).width===1024),'Image dimensions/body lost');
 passed.push('Character/background images call only image service and exact Worker contract');
 window.failText=true;
 let failed=false;try{await ai.generateCardFromAI('test','N',config)}catch(e){failed=e.code==='ALL_PROVIDERS_FAILED'}
 check(failed,'Facade hides total provider failure');window.failText=false;
 passed.push('Total text failure reaches caller as controlled error');
 const root=createRoot(document.getElementById('root'));
 window.writes=[];window.uiErrors=[];
 function Wrapper(){
  const [card,setCard]=React.useState(base);window.currentCard=card;window.changeCard=setCard;
  return React.createElement(FullCard,{card,config,isSaved:true,context:'gallery',updateCard:async c=>{writes.push(c);setCard(c)},onError:m=>uiErrors.push(m),onAlert:()=>{},onConfirm:(m,cb)=>cb(),currency:1000,modifyCurrency:()=>{}});
 }
 root.render(React.createElement(React.StrictMode,null,React.createElement(Wrapper)));
 await click('Holo-Comm');await wait(()=>document.querySelector('#root input'));
 const input=document.querySelector('#root input');
 const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
 setter.call(input,'Hello');input.dispatchEvent(new Event('input',{bubbles:true}));await sleep(30);
 window.delayReply=true;input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));await wait(()=>window.releaseReply);
 changeCard({...currentCard,level:9,equippedLens:'concurrent-lens'});await sleep(30);releaseReply();window.delayReply=false;
 await wait(()=>currentCard.chatHistory?.length===2);
 check(currentCard.name==='Original Name'&&currentCard.lore==='Original lore','Chat overwrites originals with translations');
 check(currentCard.level===9&&currentCard.equippedLens==='concurrent-lens','Delayed reply overwrites concurrent card update');
 check(writes.length===2,'Duplicate request/save from Enter');
 passed.push('Holocomm preserves original localized fields and concurrent card updates');
 setter.call(input,'Second request');input.dispatchEvent(new Event('input',{bubbles:true}));await sleep(30);
 window.delayReply=true;window.releaseReply=null;input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));await wait(()=>window.releaseReply);
 const savedBefore=writes.length;root.render(null);await sleep(30);releaseReply();window.delayReply=false;await sleep(50);
 check(writes.length===savedBefore,'Late reply saves after card unmount');
 passed.push('Closing FullCard prevents late AI response from saving');
 const ui=createRoot(document.getElementById('ui'));window.studioAlerts=[];window.studioWrites=[];window.dustDelta=0;window.processing=false;
 const studioProps={config,cards:[base],currency:0,modifyCurrency:()=>{},inventory:{quantumDust:1000},modifyInventory:(b,e,m,d)=>dustDelta+=d||0,updateCard:async c=>studioWrites.push(c),onAlert:(t,m)=>studioAlerts.push({t,m}),isGlobalProcessing:false,setGlobalProcessing:v=>processing=v};
 ui.render(React.createElement(StudioView,studioProps));await wait(()=>document.querySelector('#ui [title="Original Name"]'));
 document.querySelector('#ui [title="Original Name"]').closest('[class*="cursor-pointer"]').click();await sleep(30);
 const concept=Array.from(document.querySelectorAll('#ui div')).find(el=>el.textContent==='Vogue Editorial');concept.closest('[class*="cursor-pointer"]').click();await sleep(30);
 window.failImage=true;
 await click('START PHOTOSHOOT');await click('CONFIRM');await wait(()=>studioAlerts.length>0);
 check(studioWrites.length===0&&dustDelta===0&&!processing,'Worker error crashes or charges Studio');
 passed.push('Image Worker error handled by Studio; dust refunded and processing released');
 window.failImage=false;window.delayImage=true;studioAlerts=[];
 await click('START PHOTOSHOOT');await click('CONFIRM');await wait(()=>window.releaseImage);
 studioProps.cards=[{...base,level:8,equippedLens:'concurrent-lens'}];ui.render(React.createElement(StudioView,studioProps));await sleep(30);releaseImage();window.delayImage=false;await wait(()=>studioWrites.length===1);
 check(studioWrites[0].level===8&&studioWrites[0].equippedLens==='concurrent-lens','Photoshoot overwrites concurrent update');
 check(studioWrites[0].variants.at(-1).startsWith('data:image/png')&&!processing&&dustDelta<0,'Studio Worker success not saved');
 passed.push('Image Worker success through Studio UI preserves concurrent card updates');
 ui.unmount();root.unmount();window.fetch=fetchBefore;check(uiErrors.length===0,'Unexpected card UI error');return passed;
}'''

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox', '--no-proxy-server'])
        page = await browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        async def route(request):
            if urlsplit(request.request.url).netloc != urlsplit(BASE).netloc:
                await request.abort()
            elif urlsplit(request.request.url).path == '/__phase2':
                await request.fulfill(body=HTML, content_type='text/html')
            else:
                await request.continue_()
        await page.route('**/*', route)
        await page.goto(BASE + '/__phase2')
        await page.wait_for_function('window.harnessReady')
        results = await page.evaluate(TESTS)
        assert not errors, errors
        print(json.dumps({'passed': len(results), 'cases': results, 'page_errors': errors}, ensure_ascii=False, indent=2))
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
