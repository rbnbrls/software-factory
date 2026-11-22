# Domain docs

Deze repository heeft één domeincontext. Engineering skills volgen deze documenten bij verkenning en domeinwijzigingen.

## Lees vóór domeinwerk

- Lees `GLOSSARY.md` en gebruik de afgesproken termen in werkitems, voorstellen, code en documentatie.
- Lees relevante geaccepteerde ADR's in `docs/adr/` voordat je een bestaande technische keuze wijzigt. Benoem expliciet wanneer een voorstel een ADR tegenspreekt.
- Raadpleeg `software-factory-projectplan.md` voor vastgestelde scope, architectuur, acceptatiecriteria en veiligheidsgrenzen.

## Structuur

- `GLOSSARY.md` bevat de gedeelde projectbegrippen.
- `docs/adr/` bevat genummerde, repositorybrede architectuurbesluiten.
- `factory/decisions/` bevat werkitemgebonden scopebesluiten en verwijzingen naar architectuur-ADR's; zie `factory/WORKFLOW.md`.

Maak geen contextspecifieke glossaries of ADR-mappen aan zolang het project één domeincontext heeft. Voeg blijvende technische keuzes toe als genummerde ADR's volgens de bestaande repositoryconventie.
