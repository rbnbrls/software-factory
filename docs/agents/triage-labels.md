# Triage labels

Engineering skills gebruiken vijf canonieke triagerollen. Omdat de tracker uit lokale Markdown bestaat, worden deze rollen als `Status:`-waarden in werkitems gebruikt, niet als externe labels. Dit triageveld staat los van de canonieke workflowstatus in de statusmap en de toekomstige workflow-frontmatter.

| Canonieke rol | Waarde | Betekenis |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Een maintainer moet het werk beoordelen. |
| `needs-info` | `needs-info` | Er is aanvullende informatie nodig. |
| `ready-for-agent` | `ready-for-agent` | De scope is voldoende duidelijk voor agentwerk. |
| `ready-for-human` | `ready-for-human` | Dit werk vraagt om menselijke uitvoering. |
| `wontfix` | `wontfix` | Dit werk wordt niet opgepakt. |

Wanneer een skill een triagerol noemt, gebruik dan exact de bijbehorende waarde. Voeg deze waarden niet als workflowstatusmappen toe; wijziging van canonieke workflowstatus volgt `factory/WORKFLOW.md`.
