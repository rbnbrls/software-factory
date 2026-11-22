Ik heb de repository-layout, `CLAUDE.md`, `CODING_STANDARDS.md` en de agentdocumentatie gelezen. De structuurregels zijn vooral **grenzen en afspraken**, geen universele mappenboom. Hieronder staat een instructie die een volgende agent op nieuwe projecten kan toepassen.

## Agent-instructie: organiseer een nieuwe repository

Gebruik de structuur van `mattpocock/course-video-manager` als leidraad. Neem de ontwerpregels over, maar kopieer geen mappen of tools die het project niet nodig heeft.

### 1. Breng eerst de vormen van het project in kaart

Bepaal vóór je bestanden aanmaakt:

- Is dit één applicatie, of zijn er meerdere apps, services of uitvoerbare programma’s?
- Welke domeinlogica en data zijn gedeeld?
- Welke onderdelen hebben toegang tot machinegebonden zaken, zoals filesystem, processen, browser, databaseverbindingen of deployment-credentials?
- Welke onderdelen moeten apart gebouwd, getest of gedeployed worden?

Kies de kleinst mogelijke structuur die deze grenzen duidelijk maakt. Maak geen package of map alleen omdat die in een voorbeeldrepo bestaat.

### 2. Maak grenzen expliciet in de layout

Voor een monorepo met meerdere deploybare of uitvoerbare onderdelen is `apps/` voor applicaties en `packages/` voor herbruikbare modules een bruikbare standaard. Geef ieder onderdeel één duidelijke verantwoordelijkheid.

- Plaats domeinlogica en databasecode in een domein- of core-module.
- Houd machinegebonden adapters en applicatie-integraties aan de rand, bij de app of service die ze gebruikt.
- Laat gedeelde, pure logica geen filesystem-, proces- of git-afhankelijkheid importeren.
- Injecteer machinegebonden functionaliteit via expliciete interfaces.
- Geef onderdelen met een eigen toolchain, build of deployment een eigen configuratie en gedocumenteerde commando’s.

Maak de grenzen controleerbaar met exports, dependency-regels, lintregels of scripts. Vertrouw niet alleen op mapnamen.

### 3. Zet documentatie op de plek waar agents die nodig hebben

Houd kerninstructies en standaarden vindbaar vanaf de repository-root. Leg domeintermen vast in `GLOSSARY.md`; gebruik die termen consequent in code, tests en documentatie.

Leg blijvende technische keuzes vast als genummerde ADR’s onder `docs/adr/`. Zet langere uitleg onder `docs/` en verwijs ernaar vanuit de beknopte root-instructies. Bij meerdere zelfstandige domeincontexten: geef iedere context een eigen glossary en ADR-locatie, met een rootbestand dat de contexten aanwijst.

Documenteer ontbrekende conventies pas wanneer ze nodig zijn; voeg geen lege documentstructuur toe als het project die nog niet gebruikt.

### 4. Houd configuratie en commando’s voorspelbaar

- Plaats gedeelde workspaceconfiguratie op de workspace-root.
- Geef de agent één duidelijke plek om de gebruikelijke commando’s te vinden.
- Beschrijf per commando wat het controleert en welke packages het wel of niet omvat.
- Houd secrets buiten versiebeheer; lever waar passend een `.env.example` met namen en toelichting, zonder echte waarden.
- Documenteer uitzonderingen voor packages met afwijkende build- of testvereisten.

### 5. Leg databasewijzigingen veilig vast

Als het project een database met schemawijzigingen heeft:

- Bewaar schema, migratieconfiguratie en versiebeheerste migraties bij de eigenaar van de database.
- Gebruik gegenereerde, geversioneerde migraties in plaats van directe schema-pushes naar gedeelde omgevingen.
- Maak migraties standaard compatibel met code die al draait; verwijder of hernoem velden via een gefaseerde wijziging.
- Documenteer welke omgevingen migraties uitvoeren en wie productie-migraties mag starten.

Pas deze regels alleen toe als het project een gedeelde of persistente database heeft.

### 6. Maak testen en kwaliteitscontroles schaalbaar

Definieer snelle lokale controles en een volledige CI-controle. Laat agents tijdens iteratie gerichte tests uitvoeren; laat CI de afgesproken volledige suite en structurele checks uitvoeren.

Controleer naast types en tests ook packagegrenzen, ongewenste imports en projectstandaarden. Voor UI-wijzigingen hoort een browsercontrole bij de verificatie als het project daarvoor een omgeving heeft. Documenteer speciale vereisten zoals containers of buildvolgorde.

### 7. Geef agents repository-specifieke instructies

Zet in `AGENTS.md`, `CLAUDE.md` of een vergelijkbaar bestand de regels die een agent nodig heeft voordat die aan het werk gaat:

- waar domein- en architectuurdocumenten staan;
- welke packages welke verantwoordelijkheid hebben;
- welke imports of afhankelijkheden verboden zijn;
- hoe relevante tests en checks draaien;
- hoe zichtbare UI-wijzigingen worden geverifieerd;
- welke werk-, commit-, PR- en migratieafspraken gelden.

Houd dit bestand beknopt en verwijs voor details naar documentatie. Laat de instructies aansluiten op bestaande tooling en repositorybeleid.

### 8. Laat structuur de workflows ondersteunen

Documenteer hoe werk wordt geïsoleerd, gecontroleerd en geïntegreerd: bijvoorbeeld branches of worktrees, vereiste CI-checks en PR-procedure. Beschrijf omgevingsspecifieke veiligheidsgrenzen, zoals voorkomen dat lokale of testprocessen een productiedatabase kunnen wijzigen.

Automatiseer regels waar dat haalbaar is. Een grens die belangrijk genoeg is om in agentinstructies te staan, is vaak ook belangrijk genoeg om door tooling te controleren.

**Kernregel:** organiseer rond verantwoordelijkheid en afhankelijkheidsgrenzen; documenteer de reden en controleer belangrijke grenzen automatisch. De concrete layout van `course-video-manager` is een voorbeeld van die aanpak, geen sjabloon dat elk project letterlijk moet kopiëren. [Repository-README](https://github.com/mattpocock/course-video-manager), [CLAUDE.md](https://github.com/mattpocock/course-video-manager/blob/main/CLAUDE.md), [CODING_STANDARDS.md](https://github.com/mattpocock/course-video-manager/blob/main/CODING_STANDARDS.md), [Domain Docs](https://github.com/mattpocock/course-video-manager/blob/main/docs/agents/domain.md), [Testing](https://github.com/mattpocock/course-video-manager/blob/main/docs/agents/testing.md).