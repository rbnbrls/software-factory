# ADR 0004: JSON-frontmatter voor werkitems

- Status: geaccepteerd
- Datum: 2026-11-22

## Context

De lokale CLI moet de machineleesbare werkitemvelden offline valideren. De repository gebruikt Node.js zonder runtime-dependencies voor de CLI. Een extra YAML-parser zou een package en een tweede interpretatielaag toevoegen.

## Besluit

Werkitems bewaren hun machineleesbare metadata als een JSON-object tussen Markdown-frontmatterdelimiters (`---`). `factory/schemas/work-item.schema.json` definieert het objectcontract. De CLI leest de frontmatter met `JSON.parse` en valideert de velden tegen het contract.

## Gevolgen

- De CLI kan metadata parsen zonder extra runtime-package of netwerkverbinding.
- De frontmatter is geldige JSON en daarmee ook een subset van YAML-frontmatter.
- Bewerking blijft expliciet en voorspelbaar; arrays en strings volgen JSON-escapingregels.
- Het JSON Schema en de CLI-validatie moeten samen worden bijgewerkt wanneer het contract verandert.
