# ADR 0003: Node.js en native TypeScript voor de lokale CLI

- Status: geaccepteerd
- Datum: 2026-11-22

## Context

De eerste uitvoerbare factoryfunctie is een lokale TypeScript-CLI. De repository heeft geen bestaande package-toolchain. De CLI moet reproduceerbaar starten zonder een framework, transpiler-runner of serviceprovider.

## Besluit

- Gebruik Node.js `24.22.3` LTS met de meegeleverde npm `11.19.1`.
- Gebruik TypeScript `7.0.2` voor typecontrole en `@types/node` `24.19.2` voor Node-API-types.
- Voer de CLI-bron direct uit met Node's native TypeScript type stripping. Beperk broncode tot syntax die type stripping kan verwijderen; gebruik geen enums, parameter properties of andere syntax waarvoor codegeneratie nodig is.
- Laat de TypeScript-compiler de bron controleren zonder build-output te maken. De runtime en compilerinstellingen staan expliciet vast.
- Pin runtime- en packageversies in de repository en lockfile. Gebruik alleen npm; voeg geen extra package manager of framework toe.

## Gevolgen

- Een schone checkout kan dependencies installeren en de CLI starten met de gedocumenteerde npm-commando's.
- Node.js `24.12.0` of nieuwer is nodig voor stabiele native TypeScript-uitvoering; de repository pin is `24.22.3`.
- Type stripping voert geen typecontrole uit; daarom blijft een expliciet TypeScript-controlecommando onderdeel van de ontwikkeltoolchain.
- Een toekomstige wijziging van Node.js, npm of TypeScript vereist een bewuste update van de pins en lockfile.
