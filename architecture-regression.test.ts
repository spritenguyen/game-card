import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import ts from 'typescript';
import * as rules from './src/domain/gameRules';
import * as stats from './src/application/gameStats';
import * as compatibility from './src/lib/gameLogic';
import { migrateInventory } from './src/domain/inventory';
import { generateQuests, generateExpeditions } from './src/domain/dailyActivities';
import { prepareSavedCards } from './src/application/prepareSavedCards';
import type { Card } from './src/types';

const fixture = JSON.parse(readFileSync(new URL('./tests/fixtures/phase3-game-rules.json', import.meta.url), 'utf8'));
const cards = fixture.cards as Card[];

test('Combat, equipment, synergy and invalid saved skills retain the pre-refactor results', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    let stored: string | null = null;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored } });
    try {
        for (const example of fixture.cases) {
            stored = JSON.stringify(example.skills);
            const inputs = [null, ...cards];
            assert.deepEqual(inputs.map(card => stats.calculateCombatStats(card)), example.stats);
            assert.deepEqual(stats.getComboStats(cards.slice(0, 6)), example.combo);
            assert.equal(stats.getSquadDodgeRate(cards.slice(0, 6)), example.dodge);
            assert.deepEqual(inputs.map(card => compatibility.calculateCombatStats(card)), example.stats);
            if (Array.isArray(example.skills)) {
                assert.deepEqual(inputs.map(card => rules.calculateCombatStats(card, example.skills)), example.stats);
            }
        }
    } finally {
        if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    }
});

test('Equipment drop chance, rarity, stats, IDs and RNG consumption retain their original results', () => {
    const random = Math.random, now = Date.now;
    try {
        Date.now = () => 1700000000000;
        for (const example of fixture.equipment) {
            let state = example.seed;
            Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
            assert.deepEqual(rules.rollImplant(example.level, example.elite), example.implant);
            state = example.seed;
            assert.deepEqual(rules.rollGear(example.level, example.elite), example.gear);
        }
    } finally { Math.random = random; Date.now = now; }
});

test('Rank parsing and dismantling economy retain the original results', () => {
    for (const example of fixture.ranks) {
        const rank = example.rank ?? undefined;
        assert.equal(rules.getRankIndex(rank), example.index);
        assert.equal(rules.getDismantleValue(rank), example.dc);
        assert.equal(rules.getDismantleDustValue(rank), example.dust);
    }
});

test('Legacy material aliases merge without losing inventory or duplicating migration rewards', () => {
    const inventory = { baseTickets: 2, eliteTickets: 3, quantumDust: 4, materials: {
        Lightcore: 1, LightCore: 2, 'Light Core': 3,
        Darkcore: 1, Darkessence: 2, DarkEssence: 3,
        Magiccore: 1, ManaCrystal: 2, Techcore: 1, TechNode: 2,
        Mutantcore: 1, MutantCell: 2, unrelated: 10,
    } };
    const migrated = migrateInventory(inventory);
    assert.deepEqual(migrated, { baseTickets: 2, eliteTickets: 3, quantumDust: 4, materials: {
        'Light Core': 6, 'Dark Core': 6, 'Magic Core': 3, 'Tech Core': 3, 'Mutant Core': 3, unrelated: 10,
    } });
    assert.deepEqual(migrateInventory(migrated), migrated);
});

test('Daily activities retain pools, selection counts, timestamp IDs and initial state', () => {
    const random = Math.random, now = Date.now;
    try {
        Math.random = () => 0.5; Date.now = () => 1700000000000;
        const quests = generateQuests(), expeditions = generateExpeditions();
        assert.deepEqual(quests.map(q => q.type), ['extract', 'extract', 'boss', 'fusion']);
        assert.deepEqual(quests.map(q => q.rewardDC), [50, 150, 100, 100]);
        assert.deepEqual(quests.map(q => q.id), [0, 1, 2, 3].map(i => `q_daily_1700000000000_${i}`));
        assert(quests.every(q => q.currentCount === 0 && !q.isCompleted && !q.isClaimed));
        assert.deepEqual(expeditions.map(e => e.durationMinutes), [30, 60, 120]);
        assert.deepEqual(expeditions.map(e => e.rewardDC), [200, 400, 800]);
        assert(expeditions.every(e => e.status === 'idle'));
    } finally { Math.random = random; Date.now = now; }
});

test('Saved-card preparation repairs legacy metadata and delegates persistence and image URLs', async () => {
    const random = Math.random;
    const saved: Card[] = [];
    const imageBlob = new Blob(['image']);
    const valid = { ...cards[0] }, invalid = { ...cards[1], faction: 'obsolete', element: undefined, imageBlob } as unknown as Card;
    try {
        Math.random = () => 0;
        const result = prepareSavedCards([valid, invalid], { saveCard: async card => { saved.push({ ...card }); throw Error('Offline'); } }, blob => {
            assert.equal(blob, imageBlob); return 'blob:prepared';
        });
        assert.equal(result[0], valid);
        assert.equal(result[1].faction, 'CyberCore');
        assert.equal(result[1].element, 'Fire');
        assert.equal(result[1].imageUrl, 'blob:prepared');
        assert.equal(saved.length, 1);
        await Promise.resolve(); // Migration failure remains handled, as before.
    } finally { Math.random = random; }
});

function filesIn(folder: string): string[] {
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const path = resolve(folder, entry.name);
        return entry.isDirectory() ? filesIn(path) : /\.tsx?$/.test(path) ? [path] : [];
    });
}

// Analyze emitted imports, so erased type-only edges do not count as runtime cycles.
const sourceRoot = resolve('src');
const files = filesIn(sourceRoot);
const graph = new Map<string, string[]>();
for (const path of files) {
    const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const ast = ts.createSourceFile(path + '.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const dependencies: string[] = [];
    function visit(node: ts.Node) {
        let specifier: ts.Expression | undefined;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) specifier = node.arguments[0];
        if (specifier && ts.isStringLiteral(specifier) && specifier.text.startsWith('.')) {
            const base = resolve(dirname(path), specifier.text);
            const target = [base, base + '.ts', base + '.tsx', resolve(base, 'index.ts')].find(candidate => files.includes(candidate));
            if (specifier.text.endsWith('.css')) {
                assert(existsSync(base), `Missing stylesheet: ${base}`);
            } else {
                assert(target, `Unresolved internal import: ${path} -> ${specifier.text}`);
                dependencies.push(target);
            }
        }
        ts.forEachChild(node, visit);
    }
    visit(ast); graph.set(path, dependencies);
}

test('Runtime import graph has no cycles or unresolved internal imports', () => {
    const done = new Set<string>(), active = new Set<string>();
    const stack: string[] = [];
    const visit = (path: string) => {
        assert(!active.has(path), 'Runtime cycle: ' + [...stack, path].map(p => relative(sourceRoot, p)).join(' -> '));
        if (done.has(path)) return;
        active.add(path); stack.push(path);
        for (const dependency of graph.get(path) || []) visit(dependency);
        stack.pop(); active.delete(path); done.add(path);
    };
    for (const path of files) visit(path);
});

test('Domain stays independent of React, browser storage, application and external providers', () => {
    for (const path of files.filter(p => p.startsWith(resolve('src/domain') + '/'))) {
        for (const dependency of graph.get(path) || []) {
            assert(dependency.startsWith(resolve('src/domain') + '/'), `Outward domain dependency: ${path} -> ${dependency}`);
        }
        const ast = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
        function visit(node: ts.Node) {
            if (ts.isIdentifier(node)) assert(!['localStorage', 'indexedDB', 'window', 'document', 'fetch'].includes(node.text), `${path}: browser/provider dependency ${node.text}`);
            if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) assert(node.moduleSpecifier.text.startsWith('.'), `${path}: external dependency`);
            ts.forEachChild(node, visit);
        }
        visit(ast);
    }
});
