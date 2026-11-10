# MatchRef

MatchRef gives esports organizers and players a shared record when a result or penalty is disputed. The organizer locks the applicable rule, both players and an official match report before a player can file. Neither player can rewrite the rule or the report reference after registration. The organizer records a final disposition and rationale separately from the GenLayer recommendation.

## Try the demo

Open the [review desk](https://matchref.mohamedansaf222.chatgpt.site) and read `night-circuit-042` on GenLayer Studionet (61999). The demo uses a fictional tournament server crash, a rule that calls for a replay when neither team reached seven rounds, and a pinned report showing a crash at 6–4. The contract address and transaction evidence are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Use it for a match

1. Export the authoritative referee report or tournament server log as public UTF-8 text. Commit it to a GitHub repository. Use a raw URL containing the full commit SHA and calculate the exact bytes and lowercase SHA-256 with `wc -c report.txt` and `sha256sum report.txt`.
2. The organizer registers a unique match ID, the two player addresses, the exact rule, the report reference and both time windows.
3. Either player can file one dispute before the filing deadline. Include the requested remedy and cite lines from the report. The opposing player may respond once before the response deadline.
4. Any participant can request review after the response is filed or its window expires. Validators independently download the report and verify the HTTP result, byte length and SHA-256. They interpret the rule against the report and compare normalized recommendations through GenLayer consensus.
5. The organizer can adopt a conclusive recommendation, override it with a rationale, or close without action. Anyone can read the finalized case and the decision receipt.

The record treats the organizer-designated report as the source of truth for the case. A matching digest proves byte integrity. It cannot establish that a report was honest or complete. Player statements provide arguments and cannot independently prove disputed facts. Results are advisory and the app does not change tournament brackets or move funds. Keep sensitive data out of reports and filings because inputs are public. In a tournament, publish the contract address and official case IDs through the organizer's own channel.

## Consensus and finality

`GRANT` recommends the requested remedy, `UPHOLD` recommends retaining the recorded result, and `INCONCLUSIVE` indicates insufficient, contradictory or unverified material. Validators compare exact categorical outputs rather than generated prose. Disagreement can leave the transaction undetermined and the case open for another review request. Finalized transactions can carry execution errors. The app checks the execution result before reporting success. Review receipts are immutable after a successful review and hash the canonical case inputs.

## Run and test

Requires Node 20.19+ or 22.12+ and Python 3.10+.

```sh
npm ci
npm test
npm run dev
npm run build
```

The tests exercise contract rules with a mocked GenVM context and frontend wallet and receipt behavior with test doubles. For live writes, use the built-in Studio account via **Prepare Studio call**. The website makes direct finalized reads and tracks the resulting transaction hash. It also supports an injected EIP-1193 wallet path. See [DEPLOYMENT.md](DEPLOYMENT.md) for live verification scope.
