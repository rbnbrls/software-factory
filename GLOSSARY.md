# Begrippenlijst

| Begrip | Betekenis in dit project |
| --- | --- |
| Werkitem | Een concreet, canoniek Markdown-bestand met doel, status, acceptatiecriteria en besluiten; kan optioneel naar een tickettracker verwijzen. |
| Task | Een herhaalbaar soort werk, zoals Explore, Implement of Review. |
| Run | Eén uitvoering van een task, met begin, resultaat en einde. |
| Trigger | Een gebeurtenis die een run kan voorstellen of starten na controle van de workflowregels. |
| Runner | De tijdelijke uitvoeromgeving van een run. |
| Tickettracker | Optionele interface voor werk, discussie en menselijke besluiten; niet de canonieke statusbron. |
| Orchestrator | Service die runs toewijst, start en volgt; bepaalt niet zelfstandig canonieke statusovergangen. |
| Git host | Provider voor code, branches, pull requests en reviews. |
| Providercontract | Intern, stabiel interfacecontract voor een servicecategorie, onafhankelijk van één provider. |
| Canonieke bron | De gezaghebbende opslag voor een bepaald gegeven. Voor workflowstatus zijn dat de lokale Markdown-bestanden. |
| Lease | Tijdelijke claim op werk of een resource, met eigenaar en vervaltijd, om dubbel werk te voorkomen. |
