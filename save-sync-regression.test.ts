import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSaveVersion, SaveConflictError } from './src/infrastructure/storage/saveCoordinator';

test('Legacy save has revision zero until first versioned commit', () => {
  assert.equal(parseSaveVersion(null), null);
});
test('Version contract roundtrips monotonic safe integer revisions', () => {
  for (const revision of [1, 7, Number.MAX_SAFE_INTEGER]) {
    const value={schemaVersion:1,revision,writerId:'tab-id',updatedAt:1700000000000};
    assert.deepEqual(parseSaveVersion(JSON.stringify(value)),value);
  }
});
test('Corrupt, unsafe and incompatible version records cannot reset revision silently', () => {
  for(const record of ['{bad','null','{}', ...[
    {schemaVersion:2,revision:1,writerId:'tab',updatedAt:1},
    {schemaVersion:1,revision:0,writerId:'tab',updatedAt:1},
    {schemaVersion:1,revision:-1,writerId:'tab',updatedAt:1},
    {schemaVersion:1,revision:1.5,writerId:'tab',updatedAt:1},
    {schemaVersion:1,revision:Number.MAX_SAFE_INTEGER+1,writerId:'tab',updatedAt:1},
    {schemaVersion:1,revision:1,writerId:'',updatedAt:1},
    {schemaVersion:1,revision:1,writerId:'tab',updatedAt:null},
  ].map(value=>JSON.stringify(value))])assert.throws(()=>parseSaveVersion(record));
});
test('Conflict is a controlled typed error for existing caller error handlers', () => {
  assert.ok(new SaveConflictError() instanceof Error);
  assert.equal(new SaveConflictError().name,'SaveConflictError');
});
