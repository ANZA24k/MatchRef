# Studionet deployment

- Network is GenLayer Studionet (61999).
- Contract is [0x50344339E3Bf5BCEf7413Cd5A095151AaB6493Fd](https://explorer-studio.genlayer.com/address/0x50344339E3Bf5BCEf7413Cd5A095151AaB6493Fd).
- Deployment transaction is `0xd3d41f89cc38d7fa84bc082ddfdb0f303b8c99ba4518110b8354d525a7fac0da`.
- Demo case ID is `night-circuit-042`. Its pinned source is the [fictional tournament report](https://raw.githubusercontent.com/ANZA24k/MatchRef/2cdf89ea04aad58a7644dcc9906dd3ea667f72d6/evidence/demo-report.txt).
- Live signing uses GenLayer Studio's built-in accounts in Normal (Full Consensus) mode. The injected wallet flow is covered by a mocked provider test. A live MetaMask signature was not verified.

## Reproduce

Open [Studio](https://studio.genlayer.com/contracts), add `contracts/match_ref.py` as a new file and deploy from Run and Debug with no constructor arguments. Create or select two more built-in test accounts for the players. Register a new match ID with a pinned report, then switch accounts for filing and responding. Return to the organizer account for review and closure. Use the same deployment address and case ID on the website and paste the Studio transaction hash to track finality.
