import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { CalldataAddress, TransactionHashVariant } from 'genlayer-js/types';

export const finalizedState = TransactionHashVariant.LATEST_FINAL;

export function encodeWriteArgs(method, args) {
  if (method !== 'register_match') return args;
  const asAddress = (value) => new CalldataAddress(
    Uint8Array.from(value.slice(2).match(/../g), (byte) => parseInt(byte, 16)),
  );
  return [args[0], asAddress(args[1]), asAddress(args[2]), ...args.slice(3)];
}

export const reader = createClient({ chain: studionet });
export const addressPattern = /^0x[0-9a-f]{40}$/i;
export const hashPattern = /^0x[0-9a-f]{64}$/i;

export function receiptState(receipt) {
  const status = receipt.statusName || receipt.status || 'PENDING';
  if (['CANCELED', 'UNDETERMINED'].includes(status)) return { status, done: true, success: false };
  if (status !== 'FINALIZED') return { status, done: false, success: false };
  const execution = receipt.txExecutionResultName
    || receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  return {
    status, done: true,
    success: ['SUCCESS', 'FINISHED_WITH_RETURN'].includes(execution),
    execution,
  };
}

export async function connect(provider) {
  if (!provider) throw new Error('No injected wallet found. Use Prepare Studio call to sign with the built-in account.');
  const [account] = await provider.request({ method: 'eth_requestAccounts' });
  if (!addressPattern.test(account || '')) throw new Error('The wallet returned no account.');
  const chainId = '0x' + studionet.id.toString(16);
  if (await provider.request({ method: 'eth_chainId' }) !== chainId) {
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId, chainName: studionet.name, nativeCurrency: studionet.nativeCurrency,
          rpcUrls: studionet.rpcUrls.default.http }],
      });
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    }
  }
  return { account, client: createClient({ chain: studionet, provider, account }) };
}
