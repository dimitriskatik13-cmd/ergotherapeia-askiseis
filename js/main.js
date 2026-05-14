// Entry point — registers routes, starts router.

import { route, start } from "./router.js";
import { renderHome } from "./views/home.js";
import { renderBooklet } from "./views/booklet.js";
import { renderExercise } from "./views/exercise.js";
import { renderPrint } from "./views/print.js";
import { renderSearch } from "./views/search.js";
import { renderFavorites } from "./views/favorites.js";
import { renderAbout } from "./views/about.js";

route("/", renderHome);
route("/search", renderSearch);
route("/favorites", renderFavorites);
route("/about", renderAbout);
route("/booklet/:id", renderBooklet);
route("/exercise/:id", renderExercise);
route("/print/:id", renderPrint);

start();
