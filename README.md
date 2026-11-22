# Software Factory

Een zelf gehoste software factory die goedgekeurde Markdown-werkitems omzet in geteste code, pull requests, previews en gecontroleerde deployments. Mensen bepalen de scope en accepteren het resultaat; agents werken binnen expliciete grenzen.

Dit is de centrale factoryrepository. Applicaties die de factory bouwt krijgen een eigen repository met hun code, tests en minimale CI-ingang.

## Ontwerp

- Lokale Markdown-bestanden zijn de canonieke bron voor werkitems, status, beslissingen en workflowbeleid.
- Tickettrackers, orchestrators, git hosts, modelgateways en deploymentproviders zijn optionele, verwisselbare uitvoerders.
- De eerste uitvoerbare keten wordt lokaal opgebouwd voordat externe providers vereist zijn.
- De gekozen implementatiestack voor de factory is TypeScript. Concrete runtime-, framework- en dependencyversies worden bij de start van de implementatie vastgepind.
- De repositorystructuur volgt verantwoordelijkheden en afhankelijkheidsgrenzen; onderdelen worden toegevoegd wanneer hun rol nodig is.
- De TypeScript-structuur gebruikt de grenzen uit [course-video-manager](https://github.com/mattpocock/course-video-manager) als inspiratie: applicaties aan de rand, gedeelde domeinlogica in packages en machinegebonden integraties achter expliciete interfaces. De concrete monorepo-tooling wordt pas gekozen wanneer implementatiepackages nodig zijn.

## Repository-indeling

| Pad | Verantwoordelijkheid |
| --- | --- |
| `factory/` | Canonieke Markdown-workflow en werkitems. |
| `factory/work-items/` | Werkitems, geordend op status. |
| `docs/adr/` | Genummerde, blijvende architectuurbesluiten. |
| `AGENTS.md` | Korte instructies voor agents die in deze repository werken. |
| `GLOSSARY.md` | Projectbegrippen en hun afgesproken betekenis. |
| `software-factory-projectplan.md` | Vastgesteld projectontwerp en bouwplan. |

De bredere doelstructuur staat in hoofdstuk 10 van het projectplan. Die structuur wordt stapsgewijs aangevuld zodra de betreffende onderdelen worden gebouwd.

## Huidige fase

De repository bevat de documentatiebasis en een eerste lokale TypeScript-CLI. De Markdown-workflow zelf is nog niet geïmplementeerd; externe providers en infrastructuur zijn nog niet gekozen.

## Lokale TypeScript-CLI

De toolchain is gepind op Node.js `24.22.3` en de meegeleverde npm `11.19.1`. TypeScript `7.0.2` en `@types/node` `24.19.2` leveren typecontrole. Node voert TypeScript direct uit via native type stripping; de code gebruikt daarom alleen type-syntax die tijdens uitvoering kan worden verwijderd.

| Commando | Doel |
| --- | --- |
| `npm ci` | Installeert exact de dependencies uit de lockfile. |
| `npm run check` | Controleert de TypeScript-bron zonder build-output. |
| `npm test` | Controleert het publieke CLI-gedrag. |
| `npm run cli -- --help` | Start de lokale CLI en toont de gebruiksinstructie. |
| `npm run cli -- validate` | Valideert alle canonieke werkitems lokaal. |
| `npm run cli -- validate <bestand.md>` | Valideert een werkitem samen met de canonieke workflow. |

De exacte runtime staat in `.nvmrc`; het pakket en de package manager zijn vastgelegd in `package.json` en `package-lock.json`.

Zie [het projectplan](software-factory-projectplan.md) voor architectuur, bouwfases en acceptatiecriteria, en [de setupinstructies](project-setup.md) voor repositoryrichtlijnen.
