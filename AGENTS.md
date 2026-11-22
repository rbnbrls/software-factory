# Repository-instructies

## Context

- Lees `README.md`, `software-factory-projectplan.md` en `GLOSSARY.md` voor je projectwerk uitvoert.
- Leg blijvende technische keuzes vast als genummerde ADR's in `docs/adr/`.
- Volg `project-setup.md` voor repositorystructuur en architectuurgrenzen.
- De canonieke workflowstatus en werkitems horen in `factory/`; externe services mogen geen tweede, niet-gereconcilieerde statusbron worden.

## Grenzen

- Voeg geen providerimplementatie of package toe voordat die nodig is voor een gekozen fase.
- Houd domeinlogica onafhankelijk van filesystem-, proces-, git- en provider-API's; injecteer machinegebonden functionaliteit via expliciete interfaces.
- Houd secrets buiten versiebeheer. Voorbeeldconfiguraties mogen alleen placeholders bevatten.
- Respecteer de acceptatiecriteria en veiligheidsgrenzen uit het projectplan. Coding-agents krijgen geen Proxmox-beheer- of productiecredentials.

## Tooling

De lokale CLI gebruikt Node.js `24.22.3`, npm `11.19.1`, TypeScript `7.0.2` en `@types/node` `24.19.2`. De runtime staat in `.nvmrc`; dependencies zijn exact gepind en vastgelegd in `package-lock.json`.

Gebruik de commando's uit `README.md`: `npm ci` installeert dependencies, `npm run check` voert TypeScript-typecontrole uit, `npm test` voert CLI-gedragstests uit en `npm run cli -- --help` start de CLI. Voeg geen framework, linttool of providerpackage toe voordat een gekozen fase die nodig heeft.

## Agent skills

### Issue tracker

Lokale Markdown-werkitems in `factory/work-items/` zijn de canonieke tracker. Zie `docs/agents/issue-tracker.md`.

### Triage labels

Gebruik de vijf standaard triagerollen zoals vastgelegd in `docs/agents/triage-labels.md`.

### Domain docs

Dit is een single-context repository met `GLOSSARY.md` en root-ADR's in `docs/adr/`. Zie `docs/agents/domain.md`.
