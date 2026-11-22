# Begrippenlijst

| Begrip | Betekenis in dit project |
| --- | --- |
| Werkitem | Een concreet, canoniek Markdown-bestand met een persistent UUID, doel, categorie, prioriteit, status, acceptatiecriteria en besluiten; kan optioneel naar een tickettracker verwijzen. |
| Task | Een herhaalbaar soort werk, zoals Explore, Implement of Review. |
| Run | Eén uitvoering van een task, met begin, resultaat en einde. |
| Werkitemcategorie | De aard van het werkitem: incident, issue of planbaar werk. De categorie bepaalt de prioriteitsband en kan later als trackerlabel worden geprojecteerd. |
| Incident | Een werkitem voor een actuele storing of ernstige degradatie. |
| Issue | Een werkitem voor een gemelde bug of een verzoek zonder directe storing. |
| Planbaar werk | Een goedgekeurde bouw- of onderhoudstaak die geen incident of issue is. |
| Prioriteit | Een unieke, veranderbare rangorde voor open werkitems. Een lagere waarde komt eerder aan de beurt; de categorie bepaalt de band. |
| Product-owner-agent | Een toekomstige agentrol die de backlogprioriteiten beheert. Wijzigingen aan scope vereisen menselijke hergoedkeuring; menselijke acceptatie blijft bij een mens. |
| Trigger | Een gebeurtenis die een run kan voorstellen of starten na controle van de workflowregels. |
| Runner | De tijdelijke uitvoeromgeving van een run. |
| Tickettracker | Optionele interface voor werk, discussie en menselijke besluiten; niet de canonieke statusbron. |
| Orchestrator | Service die runs toewijst, start en volgt; bepaalt niet zelfstandig canonieke statusovergangen. |
| Git host | Provider voor code, branches, pull requests en reviews. |
| Providercontract | Intern, stabiel interfacecontract voor een servicecategorie, onafhankelijk van één provider. |
| Canonieke bron | De gezaghebbende opslag voor een bepaald gegeven. Voor workflowstatus zijn dat de lokale Markdown-bestanden. |
| Lease | Tijdelijke claim op werk of een resource, met eigenaar en vervaltijd, om dubbel werk te voorkomen. |
