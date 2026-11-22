# Issue tracker: lokale factory-work-items

De canonieke tracker voor dit repository is de lokale Markdown-workflow onder `factory/`. Werkitems staan in `factory/work-items/` en worden per status bewaard in `ready/`, `in-progress/`, `blocked/` of `done/`. Status en workflowregels volgen `factory/WORKFLOW.md`; de projectgrenzen staan in `software-factory-projectplan.md`.

Een werkitem is één concreet Markdown-bestand met stabiele identiteit, doel, status, eigenaar, afhankelijkheden, acceptatiecriteria, risicogrens, besluiten, providerreferenties en runhistorie. Het schema en de toegestane overgangen worden in fase 1 vastgesteld. Verzin daarom geen alternatieve frontmattervelden of statusovergangen voordat dat schema bestaat.

## Wanneer een skill werk publiceert

Maak of wijzig een werkitem in `factory/work-items/` volgens `factory/WORKFLOW.md` en de README in de relevante statusmap. Een werkitem wordt niet uitvoerbaar door alleen een bestand aan te maken: menselijke goedkeuring van scope en acceptatiecriteria blijft vereist.

## Wanneer een skill een werkitem ophaalt

Lees het opgegeven werkitempad of zoek op de stabiele werkitem-ID onder `factory/work-items/`. Raadpleeg relevante besluiten in `factory/decisions/` en runverslagen in `factory/runs/`.

## Status en externe services

Werk de canonieke status uitsluitend bij in de lokale Markdown-workflow en volg de gecontroleerde overgangsregels zodra fase 1 die vastlegt. Externe trackers zijn optionele projecties en mogen geen tweede, niet-gereconcilieerde statusbron worden. Deze repository gebruikt geen `.scratch/`-issueboom.
