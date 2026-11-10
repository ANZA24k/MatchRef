import './style.css';
import { reader, connect, receiptState, addressPattern, hashPattern, encodeWriteArgs, finalizedState } from './chain.js';
import { deployment } from './deployment.js';

const $ = (id) => document.getElementById(id);
const method = $('method');
const action = $('action');
const txStatus = $('tx-status');
const provider = window.ethereum?.providers?.find((item) => item.isMetaMask) || window.ethereum;
const methods = {
  register_match: ['Register match', [
    ['player_a', 'Player A wallet', 'address'], ['player_b', 'Player B wallet', 'address'],
    ['rule', 'Locked rule', 'textarea'], ['report_url', 'Commit-pinned raw text report URL', 'url'],
    ['report_sha256', 'SHA-256 digest (lowercase, 64 characters)', 'digest'],
    ['report_bytes', 'Exact report bytes', 'number', 12000],
    ['filing_minutes', 'Filing window (minutes)', 'number', 10080],
    ['response_minutes', 'Response window (minutes)', 'number', 10080],
  ]],
  file_dispute: ['File dispute', [['claim', 'Claim, report references and requested remedy', 'textarea']]],
  respond: ['Respond to dispute', [['response', 'Response and report references', 'textarea']]],
  review: ['Request validator review', []],
  close: ['Record organizer decision', [['disposition', 'Decision', 'select'], ['rationale', 'Closing rationale', 'textarea']]],
};

$('address').value = deployment.address;
$('match-id').value = deployment.matchId;
for (const [key, [label]] of Object.entries(methods)) method.add(new Option(label, key));

function renderFields() {
  $('handoff').hidden = true;
  $('fields').replaceChildren();
  for (const [key, caption, type, max] of methods[method.value][1]) {
    const label = document.createElement('label');
    label.textContent = caption;
    const input = document.createElement(type === 'textarea' || type === 'select' ? type : 'input');
    input.name = key;
    input.required = true;
    if (type === 'select') {
      for (const choice of ['ADOPT', 'OVERRIDE', 'NO_ACTION']) input.add(new Option(choice, choice));
    } else if (type === 'address') input.pattern = '0x[0-9a-fA-F]{40}';
    else if (type === 'digest') input.pattern = '[0-9a-f]{64}';
    else if (type === 'number') {
      input.type = type;
      input.min = 1;
      input.max = max;
      if (key.endsWith('_minutes')) input.value = 15;
    } else if (type === 'url') input.type = type;
    label.append(input);
    $('fields').append(label);
  }
}

function params() {
  return { address: $('address').value.trim(), matchId: $('match-id').value.trim() };
}

function actionData() {
  if (!$('lookup').reportValidity() || !action.reportValidity()) return null;
  const { address, matchId } = params();
  const values = new FormData(action);
  const args = [matchId, ...methods[method.value][1].map(([key, , type]) =>
    type === 'number' ? Number(values.get(key)) : values.get(key).trim())];
  return { address, functionName: method.value, args };
}

function detail(parent, name, value) {
  if (value === undefined || value === '') return;
  const term = document.createElement('dt');
  term.textContent = name;
  const description = document.createElement('dd');
  description.textContent = value;
  parent.append(term, description);
}

let readVersion = 0;
async function readCase() {
  const version = ++readVersion;
  const { address, matchId } = params();
  const status = $('read-status');
  $('case').replaceChildren();
  status.textContent = 'Reading finalized contract state…';
  try {
    const read = (functionName) => reader.readContract({ address, functionName, args: [matchId], transactionHashVariant: finalizedState });
    const match = await read('get_match');
    if (version !== readVersion) return;
    if (!match) {
      status.textContent = 'No finalized match found for this ID.';
      return;
    }
    const record = JSON.parse(match);
    const decision = record.receipt_sha256 ? await read('get_receipt') : '';
    if (version !== readVersion) return;
    const receipt = decision ? JSON.parse(decision) : {};
    const list = document.createElement('dl');
    const date = (value) => value ? new Date(value * 1000).toISOString() : '';
    detail(list, 'Organizer', record.organizer);
    detail(list, 'Players', [record.player_a, record.player_b].join('\n'));
    detail(list, 'Locked rule', record.rule);
    detail(list, 'Pinned report', record.report_url);
    detail(list, 'Report SHA-256', record.report_sha256);
    detail(list, 'Filing deadline', date(record.filing_deadline));
    detail(list, 'Claim filed', date(record.filed_at));
    detail(list, 'Claim and requested remedy', record.claim);
    detail(list, 'Response deadline', date(record.response_deadline));
    detail(list, 'Opponent response', record.response);
    detail(list, 'GenLayer recommendation', receipt.outcome);
    if (receipt.outcome) detail(list, 'Pinned report verified', receipt.report_verified ? 'Yes' : 'No');
    detail(list, 'Review time', date(receipt.reviewed_at));
    detail(list, 'Review input SHA-256', receipt.input_sha256);
    detail(list, 'Receipt SHA-256', record.receipt_sha256);
    detail(list, 'Organizer disposition', record.disposition);
    detail(list, 'Closing rationale', record.rationale);
    status.textContent = matchId + ' · ' + record.status;
    $('case').replaceChildren(list);
  } catch (error) {
    if (version === readVersion) status.textContent = 'Read failed. ' + error.message;
  }
}

let tracking = 0;
async function track(hash) {
  const run = ++tracking;
  $('hash').value = hash;
  txStatus.textContent = 'Submitted. Waiting for GenLayer consensus…';
  for (let attempt = 0; attempt < 120 && run === tracking; attempt++) {
    try {
      const receipt = await reader.getTransaction({ hash });
      if (run !== tracking) return;
      const state = receiptState(receipt || {});
      if (state.done) {
        txStatus.textContent = state.success ? 'Finalized · contract execution succeeded.'
          : state.status + ' · ' + (state.execution || 'successful execution could not be verified') + '.';
        if (state.success && $('lookup').checkValidity()) await readCase();
        return;
      }
      txStatus.textContent = state.status === 'ACCEPTED' ? 'Accepted · awaiting finality.' : state.status + ' · awaiting finality.';
    } catch {
      if (run !== tracking) return;
      txStatus.textContent = 'Receipt unavailable. Retrying…';
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (run === tracking) txStatus.textContent = 'Finality wait expired. Keep the hash and use Track finality to resume.';
}

async function wallet() {
  const session = await connect(provider);
  $('wallet').textContent = session.account.slice(0, 6) + '…' + session.account.slice(-4);
  return session;
}

$('wallet').addEventListener('click', async () => {
  try { await wallet(); txStatus.textContent = 'Wallet connected to Studionet.'; }
  catch (error) { txStatus.textContent = error.message; }
});
for (const event of ['accountsChanged', 'chainChanged']) provider?.on?.(event, () => {
  $('wallet').textContent = 'Connect wallet';
});
$('lookup').addEventListener('submit', (event) => { event.preventDefault(); void readCase(); });
$('lookup').addEventListener('input', () => {
  readVersion++;
  $('case').replaceChildren();
  $('read-status').textContent = '';
  $('handoff').hidden = true;
});
method.addEventListener('change', renderFields);
action.addEventListener('input', () => { $('handoff').hidden = true; });
$('studio').addEventListener('click', () => {
  const call = actionData();
  if (!call) return;
  const link = document.createElement('a');
  link.href = 'https://studio.genlayer.com/run-debug';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open Studio Run and Debug ↗';
  const instructions = document.createElement('p');
  instructions.textContent = 'Select the same deployed contract and the correct built-in account. Enter these arguments in order in Normal (Full Consensus) mode. Paste the resulting transaction hash below.';
  const payload = document.createElement('pre');
  payload.textContent = JSON.stringify(call, null, 2);
  $('handoff').replaceChildren(link, instructions, payload);
  $('handoff').hidden = false;
});
action.addEventListener('submit', async (event) => {
  event.preventDefault();
  const call = actionData();
  if (!call) return;
  $('sign').disabled = true;
  tracking++;
  txStatus.textContent = 'Awaiting wallet signature…';
  try {
    const { client } = await wallet();
    const hash = await client.writeContract({ ...call, args: encodeWriteArgs(call.functionName, call.args), leaderOnly: false });
    $('sign').disabled = false;
    void track(hash);
  } catch (error) {
    txStatus.textContent = 'Signature or submission failed. ' + error.message;
  } finally {
    $('sign').disabled = false;
  }
});
$('track').addEventListener('submit', (event) => {
  event.preventDefault();
  const hash = $('hash').value.trim();
  if (hashPattern.test(hash)) void track(hash);
});
renderFields();
if (addressPattern.test(deployment.address) && deployment.matchId) void readCase();
