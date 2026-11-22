# Factory-workflow

## Doel en gezaghebbende bron

Deze map bevat de canonieke, lokale workflow van de software factory. Werkitems en besluiten blijven bruikbaar zonder tickettracker, orchestrator, git host of netwerkverbinding. Externe provider-ID's zijn verwijzingen; zij vervangen de status in Markdown niet.

De statusmappen maken werkitems vindbaar. Het schema, de toegestane statussen, overgangen, globale claim/lease en atomaire verplaatsingsregels worden in fase 1 geïmplementeerd. Het werkitem blijft de canonieke bron; runs zijn afzonderlijke, append-only verslagen.

## Mappen

- `work-items/ready/`: scope en acceptatiecriteria zijn door een mens goedgekeurd; het item is klaar voor uitvoering.
- `work-items/in-progress/`: het enige werkitem dat de factory globaal actief uitvoert.
- `work-items/blocked/`: wacht op menselijke input, herstel of een afhankelijkheid; telt niet als actief en houdt de queue niet tegen.
- `work-items/done/`: alle vereiste kwaliteitsgates zijn geslaagd en een mens heeft het resultaat geaccepteerd.
- `decisions/`: werkitemgebonden scopebesluiten en verwijzingen naar architectuur-ADR's.
- `runs/`: append-only runverslagen en artifactverwijzingen.
- `tasks/`: herhaalbare taakdefinities, zoals Explore, Implement en Review.

## Identiteit, categorie en prioriteit

Elk werkitem heeft een persistent UUID. De categorie en prioriteit zijn aparte, veranderbare eigenschappen; prioriteit is geen identiteit of volgnummer.

De categorieën en prioriteitsbanden zijn:

| Categorie | Betekenis | Prioriteitsband |
| --- | --- | --- |
| `incident` | Actuele storing of ernstige degradatie. | 0–100 |
| `issue` | Gemelde bug of verzoek zonder directe storing. | 101–200 |
| `planbaar-werk` | Goedgekeurd bouw- of onderhoudswerk. | 201 en hoger |

Een lagere prioriteitswaarde komt eerder aan de beurt. Waarden zijn uniek onder open werkitems. Binnen een band mogen tussenwaarden worden gebruikt en de product-owner-agent mag prioriteiten herschikken; een waarde komt opnieuw beschikbaar als een werkitem is afgerond of de prioriteit ervan is gewijzigd. Een afgerond werkitem behoudt zijn UUID en historie.

De prioriteit moet binnen de band van de actuele categorie vallen. Een categoriewijziging vereist daarom een prioriteit in de nieuwe band voordat het werkitem weer uitvoerbaar is.

In fase 1 stelt een mens de prioriteit vast. Een toekomstige product-owner-agent mag alle inhoudelijke werkitemvelden wijzigen, inclusief categorie en prioriteit. Een wijziging aan doel of acceptatiecriteria vereist menselijke hergoedkeuring. De agent kan geen menselijke goedkeuring of acceptatie registreren en kan status alleen via gevalideerde workflowovergangen wijzigen.

De categorieën kunnen later als labels in Forgejo worden geprojecteerd. Telegram-notificaties voor verzoeken om menselijke hulp zijn eveneens toekomstig werk; ze zijn geen vereiste voor de lokale queue.

## Queue en afhankelijkheden

De CLI voert globaal maximaal één werkitem tegelijk uit. Hij kiest het werkitem in `ready/` met de laagste prioriteitswaarde waarvan alle opgegeven afhankelijkheden `done` zijn. Bij gelijke prioriteiten is de data ongeldig; waarden moeten uniek zijn. Geblokkeerde items en items met ontbrekende of niet-afgeronde afhankelijkheden worden overgeslagen. Onbekende afhankelijkheden en afhankelijkheidscycli zijn validatiefouten.

Als niets uitvoerbaar is, stopt de CLI en rapporteert welke items wachten en waarom. Een geblokkeerd werkitem houdt geen actieve plek bezet; het kan later worden hervat. Werkitems die ervan afhankelijk zijn blijven onbeschikbaar totdat de afhankelijkheid `done` is.

## Claims, runs en herstel

Een globale claim/lease voorkomt gelijktijdige uitvoering. Een claim legt de werkitemrevisie en run-identiteit vast. Een wijziging aan de scope tijdens een run blokkeert afronding; gewijzigde scope moet opnieuw door een mens worden goedgekeurd.

Een verlopen lease is op zichzelf geen reden om werk opnieuw uit te voeren. De CLI controleert eerst de runstatus. Als veilig hervatten mogelijk is, gaat dezelfde run verder. Anders wordt de run als onderbroken vastgelegd voordat een nieuwe run start. Elke uitvoeringspoging blijft in de append-only runhistorie staan.

## Kwaliteitsgates

Een werkitem kan pas naar `done/` nadat:

1. deterministische checks zijn geslaagd en hun resultaat is vastgelegd;
2. een agentreview in een eigen, read-only context is uitgevoerd en vastgelegd;
3. een mens de agentreview en het resultaat heeft beoordeeld en expliciet heeft geaccepteerd.

In fase 1 kan de agentreview buiten de CLI worden uitgevoerd; de CLI bewaakt de gate en bewaart het reviewverslag. Een reviewer wijzigt geen implementatiecode. Als checks of review herstel vereisen, blijft het werkitem in uitvoering en wordt herstel als een nieuwe run vastgelegd. Als menselijke input nodig is, eindigt de run en gaat het werkitem naar `blocked/`; de globale queue kan daarna een ander uitvoerbaar werkitem kiezen.

## Workflowgates

1. Een werkitem wordt pas uitvoerbaar nadat een mens scope en acceptatiecriteria heeft goedgekeurd.
2. Scope- of acceptatiecriteriumwijzigingen vereisen opnieuw menselijke goedkeuring.
3. Deterministische checks, agentreview en menselijke acceptatie zijn afzonderlijke kwaliteitsstappen.
4. Agents mergen niet zelfstandig. Integratie en productie vereisen de vastgelegde menselijke goedkeuring.
5. Na storing verifieert de workflow eerst externe effecten voordat een actie wordt herhaald.

Een run wacht niet op een menselijke reactie. Vragen en resultaten worden bij het werkitem vastgelegd; een later besluit kan een nieuwe run starten.
