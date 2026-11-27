# Parked plans

Decisions we've agreed on but haven't built yet. We're finishing the Stone Age first.

## Great minds (switched off for now: `GREAT_MINDS = false` in game.js)

- Great minds are not a Stone Age thing. Early on, a tribe gains research on its own and stays insulated.
- Later, peoples leak knowledge to each other through trade, and great minds push research forward.
- A great mind **masters a field the people already know**; they don't unlock it. For example, after agriculture is known, a farming genius dominates that field.
- While they live:
  - their own people get **+25% research** in that field
  - the rest of their **continent** gets **+10%**
- Continents are the standard ones: Europe, Asia (including the Middle East), Africa, North America, South America, Oceania.
- Sharing across a continent should depend on good trade relations. To be designed later.
- **World history:** only the dominant mind in a field, meaning the greatest living one anywhere, is remembered. Everyone else stays in their own people's history.

## World history: who counts as notable

- **Conquerors (Alexander level)** (built): within one lifetime, they break 3 peoples (capital taken or people destroyed), triple their people's land, and rule the greatest realm in the known world.
- **Empire founders** (built): only if their empire is the greatest realm in the world.
- **Nation founders**: not notable (removed).
- **Faith founders** (built, cosmetic): they appear in the place they really lived. They should **belong to whoever holds that land** and bring traits that matter while they live. The traits are still to be approved (see below); Muhammad will need special care.

## Proposed founder traits (awaiting approval)

| Founder | Faith | Trait | Effect while alive, for the people holding their homeland |
|---|---|---|---|
| Moses | Judaism | Lawgiver | +stability; laws and customs change more easily |
| Zarathustra | Zoroastrianism | Prophet of order | +stability; people lean devout |
| Mahavira | Jainism | Non-violence | much calmer people; −army strength |
| Siddhartha Gautama | Buddhism | Enlightened teacher | +contentment; faith spreads to neighbors |
| Confucius | Confucianism | Teacher of order | +stability; +research (scholars, officials) |
| Laozi | Taoism | Sage of the Way | +contentment; +harmony with the land (food) |
| Jesus of Nazareth | Christianity | Preacher of mercy | +commoners' mood; faith spreads widely |
| Muhammad | Islam | Prophet and war leader | **huge military boost**; faith spreads with conquest |
| Guru Nanak | Sikhism | Teacher of equality | +commoners; +martial spirit |
| Martin Luther | Protestantism | Reformer | +research (printing, literacy); church upheaval |

## Military (Stone Age core built; the rest later)

**The rule for the whole game: you can't be great at everything.** A war-focused people can terrorize a region for generations, but it pays in growth, knowledge and economy. Eventually it stagnates and crumbles.

Built (Stone Age):
- Power = warriors × warrior level. The level is an exchange rate: a level-9 warrior is worth 9 level-1 hunters, and dies taking them down. Base levels: fields 0.8, hunters 1, trained 2, warrior upbringing 3. Later: professionals 4–5, Spartan training about 6.
- Level multipliers: gear (stone 1, spears and bows up to 1.2, then each age's arms), fed (hungry 0.6 to well fed 1.1), training grounds (up to 1.2), martial spirit (0.9–1.2), war weariness, the chief's skill.
- Odds follow the power ratio: equal is 50/50, 2:1 about 85%. Outnumbering more than 5:1 always keeps at least a 20% chance.
- Losses follow the exchange rate: the winner loses roughly the fallen enemy's power ÷ the winner's level, rolled between half and all of it.
- The commander decides retreats. Each chief rolls nerve (how readily he pulls back), hold (how long he fights on when losing) and judgment (how well he reads the odds). He may pull back after the first clash even when he could have won.
- Wars become possible once hunting lands meet (claimed land plus scout range), not only borders.
- Quality comes from:
  - how warriors are raised (a custom): hunters' skills, every hand in the fields, trained warriors, a warrior upbringing
  - being fed: hungry ×0.7, well fed ×1.05
  - martial spirit
  - training grounds
  - war weariness
  - the war chief (ordinary in the Stone Age: ±15%)
  - plus the existing government, culture, tools, funding and stability
- War-focus costs:
  - how warriors are raised changes growth and research: a warrior upbringing gives ×0.82 growth and ×0.88 research
  - a warrior share above 15% also cuts growth and research
- Battles per quarter: campaign seasons (winter rarely, summer up to 3 per war); a band is ready again after a season or two.
- War chiefs keep a win/loss record for later.

To do (later ages):
- Expand the strength ratio (agreed to revisit).
- Legendary figures: generals and rulers roll attributes (tactics, ferocity, logistics, charisma; administration, diplomacy, ambition). The rare brilliant roll becomes a terror. They're remembered only by record:
  - undefeated in the field: 10+ wins at a 75%+ rate
  - giant-slayer: 3+ wins against an army twice their size or the greatest realm
  - scourge: 5+ settlements sacked or raided, or great tribute taken, from much bigger peoples
  - defender: threw back a much larger invader
  - conqueror: the Alexander-level bar
- **Tactics (later ages):** the leader decides how much of the army's quality gets used. A poor general blunders often: ambushed, outflanked or caught in bad ground, his army fights at half strength or worse. A brilliant one lands masterstrokes for double strength or more. A great general with a great army is your Alexander. Stone Age chiefs stay simple.
- When they die, their people's power drops.
- Organized armies and military buildings (barracks, armories) in later ages.
- Expand the customs that shape a military.

## Survival period (built)

- The first ~400 years are about surviving. About 2,000 tribes start out, spread over all livable land: thickest on fertile lowlands and plains, thin in forest and steppe, rare in deserts, tundra and mountains. No two start closer than 5 map units.
- Hard years (about 10% a year per tribe, 1–3 seasons): drought, brutal winters (cold lands), sickness (worst in big villages), failed hunts. Stores, warmth, health, healers, water and a food surplus soften them.
- AI tribes roll a hidden competence; about 30% are poorly led and suffer far more in hard years.
- A tribe collapses if it falls below 45% of its peak for 6 years, or under 12 families. About 70% of its families survive and scatter:
  - They split into 2–4 bands (one if only a handful are left), each heading a different way.
  - Each band joins the best people it finds in its direction within about 60 units, as a minority people.
  - A band with no one in its direction is lost on the road.
  - If refugees reach you, you're told.
- Temperament toward outsiders, rolled per AI people:
  - about 50% keep to themselves (relations drift toward −15)
  - about 30% are wary (no pull either way)
  - about 20% are friendly (with another friendly people, relations drift toward +60 at about 2 a year; with a wary people or you, toward +35 at about 1 a year)
  - It shows in the World tab.

## Scarcity wars (built)

- A tribe short of land or food is more willing to fight its neighbors:
  - crowded land (hemmed in by neighbors)
  - hunger
  - a drought, or the game leaving its lands
- The shorter it is, the less hostile relations need to be, the worse odds it will accept, and the likelier it is to strike. It still needs its lands (or hunting grounds) to touch the target's.
- Scarcity also sours relations between touching neighbors: they compete for the same land.
- When a tribe attacks you out of need, the declaration says why.

## Merge requests (built)

- A small tribe (under 40 families) in real trouble can ask a nearby neighbor to take it in. Real trouble means it has shrunk below 75% of its peak, gone hungry for a year, or is losing a war.
- It only asks:
  - a people with "Warm" relations or better (above +20)
  - within about 15 map units
  - not at war with it
  - bigger than itself
  - not struggling too (the player is always a candidate)
- Only the struggling tribe can ask. It asks about 30% of years while it struggles, and waits 10 years after asking.
- AI peoples accept more readily the warmer their relations are. You get a popup and take them in or refuse.
- On joining, its villages become the other people's and its families live on as a people of their own among them, under that nation's policy for minority peoples.
- Merging is jumping to another ship before yours sinks; collapsing is swimming away. A tribe asks to join only while it can still choose, and only a friendly neighbor. In a 100-year test, about 46 tribes joined neighbors and 185 fell apart.

## Engineering notes for a world of thousands

- Diplomacy is kept only for pairs of peoples who have dealt with each other, and each people keeps a list of them. Loops run over a people's contacts, not the whole world.
- **First contact is by distance now, not region.** Regions are huge: Lower Egypt alone starts with about 30 tribes. Under the old rule, a tribe knew everyone in its own and neighboring regions, about 230 others by 3350 BCE. Now a people meets those living within walking distance: about 8 map units (roughly 180 km), plus twice its scouts' sight, never across open water on foot. Sailing adds 12 units, and the navigation age meets the whole world as before. At the start you meet your 3 nearest neighbors; about a third of tribes start alone.
- Saves go to IndexedDB, compressed. Browser local storage is too small for a world this size.
- Measured on a desktop browser with 2,000 tribes (a phone will be slower):
  - about 250 ms per turn at the start
  - about 730 ms per turn by 3200 BCE (1,750 tribes, 6,200 villages, 306,000 families)
  - memory steady around 100–250 MB
  - the save is about 13 MB before compression
- What's left is mostly each tribe's own yearly work. It grows with the number of villages.

Results of a 400-year test (3600 to 3200 BCE):
- 264 of 2,000 tribes collapsed (13%), most of them early.
- No wars: tribes keep their villages close together, so after 400 years neighbors are still about 7.5 units apart and their lands don't touch. There's no scarcity yet.
- No merges: no pair of peoples gets above +16 relations (see the open question above).

## Ancient cultures (built)

- 23 real cultures start in their real homelands in 3600 BCE, at their real size: people ÷ 4 = families, rolled inside the historical range. Khvalynsk is left out because it was already gone. AI only.
- Their real big sites are towns and cities (Uruk is a city); the rest of their people live in towns and villages across the homeland. Ordinary tribes don't start inside their homelands, and they keep clear of your start.
- They start as settled peoples with chiefs and warriors, and with their real know-how: farmers know the whole Stone Age; foragers (Botai, Jōmon, Jeulmun, Chinchorro, Dapenkeng) lack farming and a few other things; Maykop knows bronze; Uruk gains the wheel (3500) and writing (3300).
- **They hold their homeland:** the land is already full, with room for about 25% more people. They don't found villages beyond it until history frees them (a rise, a spread or a unification lifts the limit by half). Their heirs inherit a full land too. Ordinary tribes are unaffected.
- **Real pressures, real timing.** Each culture has its real history as stages at the real dates:
  - long squeezes (drought, cooling, worn-out land, lost trade, plague) shrink the homeland's capacity and hit everyone living in that region, you included
  - breakups into named successor peoples: each settlement goes with the successor whose heartland is nearest, and some people flee as refugees in several directions
  - changes into what came next (Daxi → Qujialing, Susa → Proto-Elamite state, Amri → Indus civilization)
  - Upper Egypt's war to rule the whole Nile (3250), then the Kingdom of Egypt (3150): this can reach you if you start in Lower Egypt
  - spreads (Yamnaya across the steppe, Dapenkeng to the islands, new Indus cities)
  - how hard a squeeze hits is rolled, and breakups and endings are chances (likelier if already weakened), so cultures usually go the way they really did, and sometimes hold together or linger on
- A culture that drops below 15% of its peak falls apart and scatters.
- **They don't play by the normal rules.** They don't research, hold elder talks, develop fields, change laws or government, upgrade towns, drift in their customs or switch faiths. What they know, their age and their government come only from their history:
  - starting governments: Uruk a temple state (theocracy); the farming cultures chiefdoms; the foragers tribal councils
  - Bronze Age at the real time: Maykop from the start; Uruk 3300 (writing); Yamnaya 3300; Egypt 3150 and Elam 3100 (kingdoms, writing); Indus 2600; Oxus 2300; Mumun 1500; Yayoi 900
  - the Sumerian city-states start as kingdoms
- Their heirs (the peoples they break into) follow history too: no research or policy changes. They have no stages of their own yet, so they stay as they are until their next chapters are written (for example Akkad conquering Sumer, Longshan to Erlitou, Corded Ware to Bell Beaker).
- **Watching them:** world history records every rise and fall. You get a popup when it happens to a culture you've met, or when a regional squeeze reaches you. They're marked 🏛️ in the World tab, with a short real-history note, and labeled on the map. Successors show as "Heirs of …".
- Speed: about 280 ms per turn at the start; about 800 ms by 3350 BCE (desktop).

## Births, deaths and leaving (built)

- Every settlement has births and everyday deaths, counted per real year (no longer tied to the calendar's pacing, which used to cut growth to a third after 3000 BCE).
  - Births: 5% a year (about 50 per 1,000), nudged by the tribe's fertility (food, homes, water, comforts, healers, midwives, room, mood): about 5% at a typical fertility of 1.2, about 5.5% for a well-developed tribe. Small villages +2.5%. A warrior upbringing costs about 5% of births. Hungry peoples have half the children.
  - Everyday deaths: 4.7% a year (about 47 per 1,000): many children are born and many die young. Towns +6%, cities +15% (sickness spreads where people crowd); the old cultures' towns count as countryside, since each stands for a stretch of farmland. Healers cut deaths up to 6%; a nation's health spending cuts them too.
  - Ages: medicine and clean water cut deaths first (Industrial ×0.7, Modern ×0.4, Information ×0.3); births fall later (Industrial ×0.92, Modern ×0.6, Information ×0.45).
- Leaving: about 0.15% of families a year leave to live among a neighbor they know (within about 25 units, chosen by relations), arriving as a minority people. More leave when the people are unhappy (up to 2.5×), crowded (up to 3×) or hungry (3×); a law restricting migration cuts it to 30%. With no one nearby they're lost. The old cultures lose a quarter as many.
- The Nation tab shows last year's births, deaths, losses to hard times (by cause), leavers and newcomers.

## Busts (built)

- **Sickness that spreads:** outbreaks start more often in bigger, more crowded places (up to village-size crowds; towns and cities far more), kill 4–10% a season for 2–4 seasons, and jump to settlements within about 4 units, likelier the bigger they are. Healers and clean living (tribes) or health spending (nations) hold it back, and so does medicine in later ages. Survivors are immune for 15–35 years.
- **Regional droughts:** about 5 a year worldwide, centered wherever people live (dry lands more often), 8–22 units across, lasting 2–6 years. Everyone inside loses people each season (up to about 1.2%), softened by food stores; farmers' harvests fail.
- **Failed harvests:** farming peoples (by how much they depend on farming) have a bad harvest about 10% of years (3% dire) and always in a drought. The next year costs about 0.6% a season (1.5% when dire); two bad years running double it (famine). Storage pits, smokehouses and granaries soften it.
- You get a popup when one reaches you (at most one of each kind every two years), and a line in your history.
- The old cultures: a land emptied by hard times fills back up (more children survive while below what the homeland holds); their ordinary years feed them; they keep their villages rather than found new ones until a rise frees them.

Measured over 400 years (3600 to 3200 BCE):
- The whole world grew about 22% (610,000 to 742,000 families), about 0.05% a year: the real long-run pace.
- The old cultures, about three quarters of the world's people, hold roughly steady between their historical pressures.
- Ordinary tribes shake out first, then boom: flat for the first century while about 20% of them fall, then about 0.5% a year as the survivors spread into empty land (53,000 to 244,000 families). That matches early farmers expanding into open country.
- 406 of 2,000 tribes fell, almost all in the first 250 years; 80 joined neighbors.
- Turn time: about 270 ms at the start, about 710 ms by 3200 BCE (desktop).

## Births: quality of life, women's work and schooling (built)

- A better life raises births: in a tribe through its fertility (food, homes, water, comforts, healers); in a nation through food, wages, welfare and health spending, and homes (×0.9 to ×1.1).
- **The trade-off of women's work** (the custom "Men's and women's work"): more hands at work means more output and fewer children.
  - separate roles: output ×1, births ×1 (the most children)
  - side by side (from farming on): food, materials, gold and research +5%, births ×0.98 (farm women still raised large families)
  - equal standing (from Ideology on): output +15%, births ×0.7
- Schooling lowers births: up to −40% as the people's education rises (from an education level of 30 to 90).
- Together a modern, educated people with equal standing has about 60% fewer children (that's a little more than the 40% first proposed, to match real modern birthrates).
- The fixed drop in births by age is gone.

## Health advances (built)

- New research, not needed to enter a new age:

| Age | Advance | Effect |
|---|---|---|
| Bronze | Drains and Sanitation | the extra deaths of towns and cities ×0.6 |
| Bronze | Physicians | everyday deaths ×0.97 |
| Classical | Hippocratic Medicine | everyday deaths ×0.96 |
| Classical | Baths and Sewers | towns and cities ×0.7; sickness spreads ×0.85 |
| Medieval | Hospitals | outbreaks ×0.8; deaths ×0.98 |
| Medieval | Quarantine | sickness spreads ×0.5 |
| Renaissance | Anatomy | deaths ×0.97 |
| Renaissance | Inoculation | smallpox ×0.5 |
| Industrial | Vaccination | smallpox ×0.15; deaths ×0.97 |
| Industrial | Germ Theory and Clean Water | deaths ×0.85; outbreaks ×0.7; spread ×0.7; towns and cities ×0.5 |
| Industrial | Antiseptic Surgery | deaths ×0.96 |
| Industrial | Medicine (existing) | deaths ×0.92 |
| Modern | Antibiotics | deaths ×0.75; outbreaks ×0.5 |
| Modern | Mass Vaccination | deaths ×0.85; outbreaks ×0.7; smallpox ×0.05 |
| Information | Modern Medicine | deaths ×0.85; outbreaks ×0.6 |

- With everything, everyday deaths fall to about a third and outbreaks to about an eighth. The fixed drop in deaths by age is gone: a people that lags in medicine keeps dying like the old world.
- The Indus civilization gets drains and Egypt gets physicians with their history.

## Historical diseases (built)

- Real pandemics at their real times and places: the Plague of Athens (430 BCE), the Antonine Plague (165), the Plague of Cyprian (249), the Plague of Justinian (541, returning until 750), the Black Death (1338 in Central Asia, returning until 1720), cholera (1817, returning until 1923), the Third Plague (1855), the Spanish flu (1918), HIV (1981, slow) and COVID-19 (2020).
- Smallpox reaches the Americas with the first contact between an American people and one from across the ocean, kills about half of those it reaches, and returns every 30 years.
- Each strikes whoever lives in its homeland then (if no one does, the nearest people within three times the distance), spreads to neighbors and jumps along contacts (more along trade and war), and kills about its real share where it reaches, softened by health advances. Survivors are immune for a while.
- World history records each outbreak; you get a popup when one reaches your people, and the "Last year" card names it.

## Death causes and research dangers (built)

- Everyday deaths have causes, per 1,000 people a year in a typical early tribe:
  - childhood illness about 31: always the largest. Herb Lore and Midwifery each cut it 7%; healers, clean water and good food lower it; hot, wet farmland adds fevers (+15%); towns and cities add more
  - accidents about 4–5: more hunters means more accidents; tools lower it; mountains and tundra +30%; mines +2; factories +2 (+1 after germ theory)
  - skirmishes and raids: near zero when isolated; about 3 more for each hostile neighbor whose land touches yours (up to 3), or at war; firearms ×1.3, rifles ×1.6; a warrior upbringing ×1.3
  - old age about 9
  - medicine cuts childhood illness fully and accidents and old age partly
- Outbreaks need herds, crowds and contact: a tribe without herds ×0.3, without farming ×0.6, with few contacts down to ×0.3. Foragers almost never see one; farming villages and well-connected peoples see the most.
- Research that brings dangers: Animal Husbandry (outbreaks more often), Agriculture (crowd sickness, fevers), Mining (accidents), Sailing, the Wheel, Navigation, Railroad and Flight (sickness travels farther and faster), Gunpowder and Rifling (deadlier fighting), Steam (factory accidents; slums breed sickness until Germ Theory). You get a popup when you gain one.
- The "Last year" card lists deaths by cause.
- Observed: every tribe farms by 3525 BCE (agriculture comes too easily through the elders' talks). Since sickness now rarely reaches small tribes, tribes grow faster: about 56,000 to 344,000 families by 3250 BCE.

## Farming spreads slowly; foragers live differently (built)

- Agriculture can only arise on its own in the real farming homelands: the Levant, Mesopotamia, Anatolia, Persia, Lower Egypt, the Indus, the North China Plain, the Loess Plateau, Jiangnan, New Guinea, Central Mexico, Peru, Bolivia, Ethiopia, Mali and the Midwest.
- Everywhere else a people can take it up only from farmers it knows (the ancient cultures count), on land that can be farmed (fertile lowlands, plains, forest, jungle or steppe, below 58° latitude): about a 0.5% chance a year per farming contact, roughly the real pace of a kilometer a year. You get a popup when your elders can discuss it; until then it's locked ("No farmers we know of yet").
- Fixed: every people started with Agriculture preset as its research, and the research chooser always picked it first, so all tribes farmed within 75 years.
- Foragers:
  - births ×0.82 (mothers on the move space their children further apart)
  - childhood illness ×0.85 (fewer crowd sicknesses)
  - their hunting lands feed only so many: about 0.1 people per km² (12 families per map square of food-average land) across their camps plus about 25 km of range; births fall as they approach that (×1.1 at low density down to ×0.6 when full)
- Measured over 350 years: foragers fill their land (a typical tribe from 30 to about 60 families) and level off around 70% of what it feeds; about 170 farming tribes (the homelands plus about 30 that learned from neighbors in 200 years) grow and spread at about 0.5% a year; the whole world grows about 0.05% a year.

## Long test: 3600 to 2500 BCE (1,100 years)

Ran cleanly: no errors, no crash, memory steady (about 200–260 MB), save about 17 MB.

Fixed along the way:
- Broken ("not a number") populations when attacking an undefended place: infinite odds now count as certain; a safety net repairs any bad number at the end of each turn.
- Would-be settlers who couldn't find room were deleted instead of staying home (this was shrinking Egypt and the rising cultures).
- Forager camps split only when full, and new camps barely widen their hunting land; risen old cultures grow their towns and only send settlers out when full. Settlements at 3000 BCE fell from about 14,000 to 6,700.
- AI economies are worked out once a turn; hot lookups use number keys. Turn time at 3000 BCE fell from about 2.2 s to 0.8 s.

What the world did:
- History played out: Michelsberg and Chasséen broke up (3500); Repin became the Yamnaya (3300), who raided their neighbors; Egypt united (3150) and took the Delta tribes; Uruk faded into Jemdet Nasr and Susa became Elam (3100); Cucuteni–Trypillia broke apart (3100); Sumer split into city-states (2900); Funnelbeaker gave way to Corded Ware (2800); the Indus cities rose (2600). Some went differently: Yangshao and Maykop held together against the odds.
- Farming spread slowly: about 175 farming tribes at 3500 BCE, about 210 by 2500 BCE.
- Tribes filled their land and leveled off around 300,000 families by 2800 BCE; the whole world stayed around 700,000–850,000 families.
- Wars began around 3200 BCE as farmers and growing tribes met: usually 10–20 under way at once; about 430 battles by 2500 BCE. About 400 of 2,000 tribes fell (most in the first 300 years); 71 joined neighbors.
- By 2500 BCE most peoples are in the Bronze Age and about 56 in the Classical Age.
- Turn time still grows with settlements: about 0.8 s at 3000 BCE, 1.7 s at 2500 BCE (desktop; a phone would be slower). This is the main thing left to work on.
- Repetitive history: when a tribe loses several villages in a row, each one is recorded as "took X, capital of …" because the capital moves each time.

## Speed on phones (built)

Measured with the CPU slowed 4× to stand in for a mid-range phone:
- 3600 BCE: about 0.4 s a turn
- 2500 BCE (about 1,500 peoples, 10,800 settlements): about 2.3 s a turn, down from about 6 s, with no long freezes

What changed:
- **Level of detail.** A faraway people you've never met, at peace, and not one of the old cultures or their heirs, is updated every fifth turn in one five-quarter step. Turns rotate through the seasons. Rates are scaled to the step; losses compound so a big step never takes more than everything; hard years count only the seasons they last; big steps use the year's average harvest. Anyone you know, anyone at war, and the old cultures update every turn. Checked against a run without it: the world's population matches; somewhat more tribes fall early (about 17% more by 3500 BCE) and tribes total about 7% less.
- Borders of quiet peoples grow every fifth turn, by five turns' worth.
- Which peoples' lands touch is worked out once a year (and whenever you build or found); each people looks for new contacts once a year, a quarter of them each season.
- New villages only check the land corridors of peoples living nearby (this caused an 8-second freeze).
- Territory counts are worked out once for everyone.
- Autosave at most once a minute, when the phone is idle; always when you leave or switch apps.
