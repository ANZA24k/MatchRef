# Studionet deployment

- Network is GenLayer Studionet (61999).
- Contract is [0x50344339E3Bf5BCEf7413Cd5A095151AaB6493Fd](https://explorer-studio.genlayer.com/address/0x50344339E3Bf5BCEf7413Cd5A095151AaB6493Fd).
- Deployment transaction is `0xd3d41f89cc38d7fa84bc082ddfdb0f303b8c99ba4518110b8354d525a7fac0da`.
- Demo case ID is `night-circuit-042`. Its pinned source is the [fictional tournament report](https://raw.githubusercontent.com/ANZA24k/MatchRef/2cdf89ea04aad58a7644dcc9906dd3ea667f72d6/evidence/demo-report.txt).
- Live signing uses GenLayer Studio's built-in accounts in Normal (Full Consensus) mode. The injected wallet flow is covered by a mocked provider test. A live MetaMask signature was not verified.

## Reproduce

Open [Studio](https://studio.genlayer.com/contracts), add `contracts/match_ref.py` as a new file and deploy from Run and Debug with no constructor arguments. Create or select two more built-in test accounts for the players. Register a new match ID with a pinned report, then switch accounts for filing and responding. Return to the organizer account for review and closure. Use the same deployment address and case ID on the website and paste the Studio transaction hash to track finality.

## Full-consensus demo receipts

| Step | Studionet transaction |
| --- | --- |
| Deploy | [0xd3d4…c0da](https://explorer-studio.genlayer.com/tx/0xd3d41f89cc38d7fa84bc082ddfdb0f303b8c99ba4518110b8354d525a7fac0da) |
| Register | [0x5bd4…3087](https://explorer-studio.genlayer.com/tx/0x5bd40579f1925e456c24d67b2326f2597f987ccd17ca86f5e599ee1bd6373087) |
| File | [0xce24…2acc](https://explorer-studio.genlayer.com/tx/0xce246b8d84bfd0c0ef2f3b96166cd199158deb11e815abc6037884185cc22acc) |
| Respond | [0x4674…7306](https://explorer-studio.genlayer.com/tx/0x4674bf3cbeda46bf417905866b1103d7a472ff31594df2099d9c81645b1b7306) |
| Review | [0x8b6c…6e37](https://explorer-studio.genlayer.com/tx/0x8b6c234307c24621e4c15c169d6a1ea3d54311b66e2f3b691c1a0ea6e0c46e37) |
| Close | [0xbaff…e76f](https://explorer-studio.genlayer.com/tx/0xbaffe5005ef7550710a52095bd3c70f719ae914e6a92ad79b823ebdb977ce76f) |

The review returned `GRANT` and verified the report digest and length. Receipt SHA-256 is `4433836478e0554d5080cb0b8eebf231f39f967f2d6c680b6bfb35b2e9d8b040`. The organizer adopted the replay recommendation and closed the case.

The hosted review desk requires owner access. The repository and Studionet explorer links are public. External reviewers can run the review desk locally with `npm ci && npm run dev`.
