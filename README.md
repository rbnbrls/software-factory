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

De repository wordt voorbereid voor fase 0 en fase 1. Deze basis bevat documentatie en mappen voor de Markdown-workflow. Applicatiecode, packageconfiguratie, providerkeuzes en installatieconfiguratie zijn nog niet toegevoegd.

Zie [het projectplan](software-factory-projectplan.md) voor architectuur, bouwfases en acceptatiecriteria, en [de setupinstructies](project-setup.md) voor repositoryrichtlijnen.
