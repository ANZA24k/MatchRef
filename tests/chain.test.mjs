import test from 'node:test';
import assert from 'node:assert/strict';
import { connect, encodeWriteArgs, receiptState } from '../web/chain.js';

test('wallet connects and switches to Studionet', async () => {
  const calls = [];
  const account = '0x' + '12'.repeat(20);
  const provider = { async request(input) {
    calls.push(input);
    if (input.method === 'eth_requestAccounts') return [account];
    if (input.method === 'eth_chainId') return '0x1';
  } };
  const session = await connect(provider);
  assert.equal(session.account, account);
  assert.deepEqual(calls[2], { method: 'wallet_switchEthereumChain', params: [{ chainId: '0xf22f' }] });
});

test('registration wallet args encode addresses as GenVM calldata', () => {
  const args = encodeWriteArgs('register_match', ['id', '0x' + '12'.repeat(20), '0x' + '34'.repeat(20), 'rule']);
  assert.equal(args[1].bytes.length, 20);
  assert.equal(args[2].bytes[0], 0x34);
  assert.equal(args[3], 'rule');
});

test('accepted receipts are pending and finalized execution errors are failures', () => {
  assert.equal(receiptState({ statusName: 'ACCEPTED' }).done, false);
  assert.equal(receiptState({ statusName: 'FINALIZED', consensus_data: { leader_receipt: [{ execution_result: 'ERROR' }] } }).success, false);
  assert.equal(receiptState({ statusName: 'FINALIZED', consensus_data: { leader_receipt: [{ execution_result: 'SUCCESS' }] } }).success, true);
  assert.equal(receiptState({ statusName: 'UNDETERMINED' }).done, true);
});
