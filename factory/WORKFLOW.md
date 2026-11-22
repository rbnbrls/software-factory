# Factory-workflow

## Doel en gezaghebbende bron

Deze map bevat de canonieke, lokale workflow van de software factory. Werkitems en besluiten blijven bruikbaar zonder tickettracker, orchestrator, git host of netwerkverbinding. Externe provider-ID's zijn verwijzingen; zij vervangen de status in Markdown niet.

De statusmappen zijn bedoeld om werkitems vindbaar te maken. Het machineleesbare schema, toegestane statussen, overgangen, claim/lease en atomaire verplaatsingsregels worden in fase 1 vastgesteld voordat werkitems uitvoerbaar zijn.

## Mappen

- `work-items/ready/`: goedgekeurd en gereed voor uitvoering.
- `work-items/in-progress/`: momenteel toegewezen of in uitvoering.
- `work-items/blocked/`: wacht op een besluit, afhankelijkheid of herstel.
- `work-items/done/`: afgerond volgens de acceptatiecriteria.
- `decisions/`: werkitemgebonden scopebesluiten en verwijzingen naar architectuur-ADR's.
- `runs/`: runverslagen en artifactverwijzingen; verslagen zijn append-only.
- `tasks/`: herhaalbare taakdefinities, zoals Explore, Implement en Review.

## Workflowgates

De gedetailleerde statusmachine wordt in fase 1 uitgewerkt. De projectgrenzen staan al vast:

1. Een ingediend werkitem wordt onderzocht.
2. Een mens keurt scope en acceptatiecriteria goed voordat implementatie start.
3. Deterministische checks, agentreview en menselijke review zijn afzonderlijke kwaliteitsstappen.
4. Agents mergen niet zelfstandig. Integratie en productie vereisen de vastgelegde menselijke goedkeuring.
5. Na storing verifieert de workflow eerst externe effecten voordat een actie wordt herhaald.

Een run wacht niet op menselijke input. Vragen en resultaten worden bij het werkitem vastgelegd; een later besluit kan een nieuwe run starten.
