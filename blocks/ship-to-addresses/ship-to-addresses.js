import { getSelectedAccount } from '../../scripts/scripts.js';

export default async function decorate(block) {
  const account = getSelectedAccount();
  if (account) {
    console.log(account);
    const resp = await fetch(`/accounts/${account.accountId}.json?sheet=ship-to`);
    const json = await resp.json();
    const addresses = json.data;
    block.innerText = JSON.stringify(addresses);
  }
}
