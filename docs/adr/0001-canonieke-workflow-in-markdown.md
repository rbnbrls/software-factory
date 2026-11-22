# ADR 0001: Canonieke workflow in Markdown

- Status: geaccepteerd
- Datum: 2026-11-22

## Context

De factory moet werk kunnen specificeren, begrijpen en hervatten zonder afhankelijk te zijn van een tickettracker, orchestrator, git host of netwerkverbinding. Externe providers kunnen wisselen en mogen geen eigen, niet-gereconcilieerde workflowstatus afdwingen.

## Besluit

Lokale, versieerbare Markdown-bestanden zijn de canonieke bron voor werkitems, workflowstatus, beleidsregels en menselijke besluiten. Providerobjecten en externe IDs zijn aanvullende verwijzingen en uitvoeringsmetadata. Een tickettracker is optioneel en projecteert de Markdown-werkitems.

De mappen onder `factory/work-items/` weerspiegelen de status voor leesbaarheid; frontmatter wordt de machineleesbare statusbron wanneer het schema in fase 1 wordt vastgesteld. Statuswijziging en verplaatsing moeten dan één gecontroleerde mutatie vormen.

## Gevolgen

- De workflow blijft lokaal bruikbaar zonder externe providercredentials.
- Statusovergangen, schema en validatie moeten in fase 1 worden vastgelegd.
- Adapters moeten synchronisatie, conflicten, idempotentie en herstel expliciet behandelen.
- Deze repository bewaart providerkeuzes als configureerbare invulling van interne contracten, niet als workflowvereiste.
