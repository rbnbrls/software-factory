# Ready-werkitems

Deze map bevat werkitems met goedgekeurde scope die klaar zijn voor uitvoering. Elk werkitem heeft JSON-frontmatter met een persistent UUID, categorie, prioriteit, workflowstatus, triagestatus, scopegoedkeuring, afhankelijkheden, acceptatiecriteria en runverwijzingen. De CLI controleert deze velden en kiest later het laagst geprioriteerde item waarvan alle afhankelijkheden `done` zijn.
