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

Er is nog geen applicatiecode of package-toolchain. Verzin daarom geen build-, test- of lintcommando's. Documenteer de gekozen commando's hier en in `README.md` zodra de TypeScript-toolchain wordt vastgelegd.
