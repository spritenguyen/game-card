import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from './src/components/ui/Icon';
import { ICON_REGISTRY, isIconName, getIcon, type IconName } from './src/components/ui/iconRegistry';
import ts from 'typescript';
const fixtures=JSON.parse(readFileSync(new URL('./tests/fixtures/icon-render-before-registry.json',import.meta.url),'utf8'));

test(`${fixtures.length} existing icon renders preserve SVG, classes, size and fallback`,()=>{
 const original=console.warn;console.warn=()=>{};
 try{for(const {props,sha256} of fixtures){
  const actual=createHash('sha256').update(renderToStaticMarkup(React.createElement(Icon,props))).digest('hex');
  assert.equal(actual,sha256,JSON.stringify(props));
 }}finally{console.warn=original}
});

test('Canonical contract renders every registered icon and rejects prototype properties',()=>{
 for(const name of Object.keys(ICON_REGISTRY)){
  assert.equal(isIconName(name),true);
  assert.equal(typeof getIcon(name as IconName),'object');
  const markup=renderToStaticMarkup(React.createElement(Icon,{icon:name as IconName,className:'text-xl'}));
  assert.equal(markup,renderToStaticMarkup(React.createElement(getIcon(name as IconName),{className:'text-xl',size:24}))); 
 }
 for(const name of ['__proto__','constructor','toString','unknown']){
  assert.equal(isIconName(name),false);
  const warn=console.warn;console.warn=()=>{};
  try{assert.equal(renderToStaticMarkup(React.createElement(Icon,{name})),renderToStaticMarkup(React.createElement(getIcon('CircleHelp'),{className:name,size:16})))}finally{console.warn=warn}
 }
});

test('Registry imports only named Lucide components; no namespace/dynamic loader',()=>{
 const text=readFileSync('src/components/ui/iconRegistry.ts','utf8');
 const source=ts.createSourceFile('registry.ts',text,ts.ScriptTarget.Latest,true);
 const imports=source.statements.filter(ts.isImportDeclaration);
 assert.equal(imports.length,1);
 const binding=imports[0].importClause!.namedBindings!;
 assert.ok(ts.isNamedImports(binding));
 assert.ok(!/import\s*\(|require\s*\(|icons\[|dynamicIconImports/.test(text));
 for(const element of binding.elements.filter(item=>!item.isTypeOnly))assert.ok(isIconName(element.name.text));
});

// Compile-time assertions are checked by the repository's tsc command.
function typeContract(){
 getIcon('CircleHelp');
 // @ts-expect-error Icons outside the registry are not part of the public contract.
 getIcon('NotRegistered');
 // @ts-expect-error Canonical Icon props cannot accept arbitrary provider/user strings.
 const props: import('./src/components/ui/Icon').IconProps={icon:'NotRegistered'};
 return props;
}
