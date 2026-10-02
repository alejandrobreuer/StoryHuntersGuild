-- ═══════════════════════════════════════════════════════════════════════════
-- Story Hunters Guild — seed game owners from Reference/juegos-por-dueno.xlsx
-- ═══════════════════════════════════════════════════════════════════════════
-- Owner assignments filled in by hand in the exported spreadsheet (via the
-- admin Games page's "Exportar por dueño" button), applied back here.
-- Game names below are matched exactly as stored in shg_games.name
-- (including stray leading/trailing spaces) since they came straight from
-- that same export.

insert into shg_game_owners (name)
values
  ('Alejandro Breuer'),
  ('Delfina Breuer'),
  ('Dolores Breuer'),
  ('Emilio Alposta'),
  ('Francisco Breuer'),
  ('Lucas Cariddi'),
  ('Santiago Breuer')
on conflict (name) do nothing;

update shg_games g
set owner_id = o.id
from (values
  (' Carcassonne', 'Emilio Alposta'),
  (' Dungeon Academy ', 'Emilio Alposta'),
  (' Kingdomino ', 'Alejandro Breuer'),
  (' Leaders of Euphoria', 'Alejandro Breuer'),
  (' Welcome to the Dungeon', 'Alejandro Breuer'),
  ('5-Minute Mystery  *', 'Alejandro Breuer'),
  ('7 Wonders', 'Emilio Alposta'),
  ('7 Wonders Duel', 'Dolores Breuer'),
  ('Azul', 'Delfina Breuer'),
  ('BANG!', 'Alejandro Breuer'),
  ('Bargain Quest', 'Alejandro Breuer'),
  ('Betrayal at House on the Hill', 'Alejandro Breuer'),
  ('Brass: Birmingham', 'Alejandro Breuer'),
  ('Casting Shadows', 'Lucas Cariddi'),
  ('Catan', 'Alejandro Breuer'),
  ('Command of Nature', 'Alejandro Breuer'),
  ('Disney Villainous: The Worst Takes It All', 'Alejandro Breuer'),
  ('Dungeons & Drinks', 'Santiago Breuer'),
  ('Ecos: First Continent', 'Alejandro Breuer'),
  ('Everdell', 'Alejandro Breuer'),
  ('Exploding Kittens', 'Alejandro Breuer'),
  ('Feed the Kraken', 'Alejandro Breuer'),
  ('Flip 7', 'Santiago Breuer'),
  ('Ghost Blitz', 'Emilio Alposta'),
  ('God of War: The Card Game ', 'Alejandro Breuer'),
  ('Happy Little Dinosaurs', 'Emilio Alposta'),
  ('Here to Slay', 'Alejandro Breuer'),
  ('Hive', 'Delfina Breuer'),
  ('KiénParaKé', 'Emilio Alposta'),
  ('King of Tokyo duel', 'Alejandro Breuer'),
  ('King of Tokyo: Dark Edition', 'Alejandro Breuer'),
  ('Liar''s UNO', 'Alejandro Breuer'),
  ('Middara: Act 1', 'Alejandro Breuer'),
  ('Munchkin', 'Francisco Breuer'),
  ('Paleo', 'Emilio Alposta'),
  ('Pistas Cruzadas', 'Alejandro Breuer'),
  ('Rivals of Catan', 'Dolores Breuer'),
  ('SCOUT', 'Alejandro Breuer'),
  ('Scythe', 'Alejandro Breuer'),
  ('Spirit Island', 'Delfina Breuer'),
  ('Splendor', 'Alejandro Breuer'),
  ('Star Wars Villainous: Power of the Dark Side', 'Alejandro Breuer'),
  ('Star Wars: Imperial Assault', 'Alejandro Breuer'),
  ('Terraforming Mars ', 'Alejandro Breuer'),
  ('The Lord of the Rings: The Fellowship of the Ring – Trick-Taking Game ', 'Lucas Cariddi'),
  ('The Mandalorian: Adventures', 'Alejandro Breuer'),
  ('The Mind', 'Delfina Breuer'),
  ('Ticket to Ride: Marklin', 'Alejandro Breuer'),
  ('Tiny Epic Crimes', 'Alejandro Breuer'),
  ('Tiny Epic Dungeons', 'Alejandro Breuer'),
  ('Tiny Epic Galaxies', 'Alejandro Breuer'),
  ('Tiny Epic Mechs', 'Emilio Alposta'),
  ('Tiny Epic Tactics ', 'Lucas Cariddi'),
  ('Trio', 'Alejandro Breuer'),
  ('Twisted Cryptids ', 'Lucas Cariddi'),
  ('UNO', 'Alejandro Breuer')
) as m(game_name, owner_name)
join shg_game_owners o on o.name = m.owner_name
where g.name = m.game_name;
