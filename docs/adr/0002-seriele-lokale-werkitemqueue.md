# ADR 0002: Seriële lokale werkitemqueue

- Status: geaccepteerd
- Datum: 2026-11-22

## Context

Fase 1 moet een lokale werkitemketen uitvoerbaar maken zonder tracker, modelgateway, runnerprovider of voorbeeldapp. De queue moet werkitems na herstel kunnen hervatten, voorkomen dat twee uitvoeringen tegelijk dezelfde factorycontext wijzigen en steeds de actuele repositorycontext aan het volgende werkitem geven.

De projectregels vereisen dat mensen scope goedkeuren en resultaten accepteren. Checks, agentreview en menselijke acceptatie zijn aparte kwaliteitsstappen. Tegelijk moet de backlog incidenten en issues vóór planbaar werk behandelen, zonder dat de categorie onderdeel wordt van de blijvende identiteit.

## Besluit

1. De factory gebruikt een lokale TypeScript-CLI en providerneutrale runner-interface. Fase 1 voert een ingebouwde demonstratietaak uit; er zijn geen willekeurige shellcommando's of externe providerintegraties nodig.
2. Een werkitem heeft een persistent UUID. Categorie en prioriteit zijn afzonderlijke, wijzigbare eigenschappen.
3. De queue verwerkt globaal maximaal één werkitem tegelijk. De CLI kiest onder `ready/` het uitvoerbare werkitem met de laagste unieke prioriteit. Alle afhankelijkheden moeten `done` zijn; onbekende afhankelijkheden en cycli zijn validatiefouten. Als niets uitvoerbaar is, stopt de CLI met een uitleg.
4. Prioriteitsbanden zijn `incident` 0–100, `issue` 101–200 en `planbaar-werk` vanaf 201. Een lagere waarde komt eerder aan de beurt. Unieke tussenwaarden en herschikking zijn toegestaan zodat backlogomvang de band niet begrenst. De prioriteit moet bij de categorie passen; na een categoriewijziging krijgt het werkitem een waarde uit de nieuwe band. Een nummer komt opnieuw beschikbaar wanneer het werkitem is afgerond of de prioriteit verandert.
5. In fase 1 kent een mens prioriteiten toe. Een toekomstige product-owner-agent kan alle inhoudelijke werkitemvelden aanpassen en de backlog herschikken. Scopewijzigingen vereisen menselijke hergoedkeuring; menselijke acceptatie blijft menselijk. Statuswijzigingen verlopen via de workflowvalidator.
6. Geblokkeerde werkitems bezetten de globale actieve plek niet. De queue kan een ander uitvoerbaar werkitem verwerken; werk dat van een geblokkeerd item afhangt blijft wachten totdat dat item `done` is.
7. Claims/leases zijn globaal en binden een run aan de werkitemrevisie. Een verlopen lease leidt eerst tot verificatie. Een veilige hervatting gebruikt dezelfde run; anders wordt die als onderbroken vastgelegd voordat een nieuwe run start.
8. `done` vereist vastgelegde geslaagde deterministische checks, een afzonderlijke agentreview en menselijke beoordeling en acceptatie. In fase 1 wordt agentreview buiten de CLI uitgevoerd en als bewijs vastgelegd; de reviewer gebruikt een aparte read-only context.
9. Forgejo-labels voor categorieën en Telegram-notificaties voor menselijke hulp blijven latere integraties.

## Gevolgen

- De lokale queue kan offline worden uitgevoerd en hervat zonder een tweede statusbron.
- De prioriteit bepaalt queuevolgorde, terwijl de UUID onveranderd blijft bij herprioritering.
- Een geblokkeerd item vertraagt alleen items die ervan afhankelijk zijn.
- Fase 1 kan alle kwaliteitsgates afdwingen zonder agent- of trackerprovider in de CLI te integreren.
- Toolchainversies, exacte CLI-commando's, schemaformaat en lease-expiry worden bij implementatie vastgelegd; fysieke infrastructuurkeuzes blijven bij de omgeving waarin die infrastructuur nodig is.
