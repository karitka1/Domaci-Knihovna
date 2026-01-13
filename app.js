/*
  Domácí knihovna – app.js
  Tento skript řeší logiku aplikace:
  - práce s datovým modelem knihy + validace
  - ukládání a načítání knih z localStorage
  - filtrování, vyhledávání a řazení
  - vykreslení seznamu do HTML
  - obsluha událostí (uložení, úprava, smazání, filtry)
*/

// ===== Utils =====
// Pomocná funkce pro vytvoření unikátního ID (využívá crypto.randomUUID)
function makeId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

// ===== Model =====
// Třída Book reprezentuje jednu knihu a sjednocuje/čistí vstupní data
class Book {
  constructor(data) {
    this.id = data.id;
    this.title = data.title.trim();
    this.author = data.author.trim();
    this.genre = data.genre;
    this.status = data.status;
    this.rating = Number(data.rating);
    this.note = data.note.trim();
  }

  // Validace základních pravidel formuláře
  validate() {
    if (!this.title) return "Název je povinný.";
    if (!this.author) return "Autor je povinný.";
    if (this.rating < 0 || this.rating > 5) return "Hodnocení musí být 0–5.";
    return null;
  }
}

// ===== Repository =====
// Vrstva pro ukládání/načítání dat (localStorage)
class BookRepository {
  constructor() {
    this.key = "domaciKnihovna.books.v1";
  }

  load() {
    return JSON.parse(localStorage.getItem(this.key)) || [];
  }

  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  }
}

// ===== Service =====
// Aplikační logika knihovny (CRUD + listování s filtry)
class LibraryService {
  constructor(repo) {
    this.repo = repo;
    this.books = repo.load();
  }

  // Vrátí seznam knih podle vyhledávání / filtrů / řazení
  list(filters) {
    let out = [...this.books];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
      );
    }

    if (filters.status !== "all") {
      out = out.filter(b => b.status === filters.status);
    }

    if (filters.genre) {
      out = out.filter(b => b.genre === filters.genre);
    }

    if (filters.sortBy === "rating_desc") {
      out.sort((a, b) => b.rating - a.rating);
    } else {
      out.sort((a, b) => a[filters.sortBy].localeCompare(b[filters.sortBy], "cs"));
    }

    return out;
  }

  // Přidání nové knihy
  add(data) {
    const book = new Book({ ...data, id: makeId("book") });
    const err = book.validate();
    if (err) throw err;
    this.books.push(book);
    this.repo.save(this.books);
  }

  // Úprava existující knihy podle ID
  update(id, data) {
    const i = this.books.findIndex(b => b.id === id);
    if (i === -1) return;
    const book = new Book({ ...data, id });
    const err = book.validate();
    if (err) throw err;
    this.books[i] = book;
    this.repo.save(this.books);
  }

  // Smazání knihy podle ID
  remove(id) {
    this.books = this.books.filter(b => b.id !== id);
    this.repo.save(this.books);
  }

  // Získání konkrétní knihy podle ID (např. pro editaci)
  get(id) {
    return this.books.find(b => b.id === id);
  }
}

// ===== App =====
// Inicializace služby + načtení prvků z HTML (napojení na formulář a ovládání)
const service = new LibraryService(new BookRepository());

const form = document.getElementById("bookForm");
const list = document.getElementById("list");
const hint = document.getElementById("formHint");
const listHint = document.getElementById("listHint");

const bookId = document.getElementById("bookId");
const title = document.getElementById("title");
const author = document.getElementById("author");
const genre = document.getElementById("genre");
const status = document.getElementById("status");
const rating = document.getElementById("rating");
const note = document.getElementById("note");

const search = document.getElementById("search");
const filterStatus = document.getElementById("filterStatus");
const filterGenre = document.getElementById("filterGenre");
const sortBy = document.getElementById("sortBy");
const resetBtn = document.getElementById("resetBtn");

// Vyčištění formuláře a návrat do „výchozího režimu přidávání“
function clearForm() {
  bookId.value = "";
  form.reset();
  rating.value = 0;
  status.value = "wishlist";
}

// Vykreslení seznamu knih do HTML podle aktuálních filtrů
function render() {
  const books = service.list({
    search: search.value,
    status: filterStatus.value,
    genre: filterGenre.value,
    sortBy: sortBy.value
  });

  list.innerHTML = "";
  listHint.textContent = books.length
    ? `Počet knih: ${books.length}`
    : "Zatím tu nejsou žádné knihy.";

  books.forEach(b => {
    const div = document.createElement("div");

    // CSS třída podle stavu knihy (pro barevné odlišení)
    div.className = `item status-${b.status}`;

    const stavText =
      b.status === "done" ? "Dočteno" :
      b.status === "reading" ? "Čtu" : "Chci";

    // Vytvoření obsahu jedné položky + tlačítka Upravit / Smazat
    div.innerHTML = `
      <div>
        <h3>${b.title}</h3>
        <div class="meta">${b.author} • ${b.genre || "—"} • ${b.rating}/5</div>
        <span class="badge ${b.status}">${stavText}</span>
        ${b.note ? `<div class="note">„${b.note}“</div>` : ""}
      </div>
      <div class="actions">
        <button class="btn" data-edit="${b.id}">Upravit</button>
        <button class="btn danger" data-del="${b.id}">Smazat</button>
      </div>
    `;
    list.appendChild(div);
  });
}

// ===== Events =====
// Odeslání formuláře: přidání nebo úprava knihy (podle toho, jestli je vyplněné bookId)
form.addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    title: title.value,
    author: author.value,
    genre: genre.value,
    status: status.value,
    rating: rating.value,
    note: note.value
  };

  try {
    bookId.value ? service.update(bookId.value, data) : service.add(data);
    hint.textContent = bookId.value ? "Kniha upravena." : "Kniha přidána.";
    clearForm();
    render();
  } catch (err) {
    hint.textContent = err;
  }
});

// Tlačítko pro zrušení úpravy / vyčištění formuláře
resetBtn.addEventListener("click", clearForm);

// Klikání v seznamu: řeší editaci a mazání přes data atributy (event delegation)
list.addEventListener("click", e => {
  if (e.target.dataset.edit) {
    const b = service.get(e.target.dataset.edit);
    bookId.value = b.id;
    title.value = b.title;
    author.value = b.author;
    genre.value = b.genre;
    status.value = b.status;
    rating.value = b.rating;
    note.value = b.note;
  }

  if (e.target.dataset.del) {
    if (confirm("Opravdu smazat knihu?")) {
      service.remove(e.target.dataset.del);
      render();
    }
  }
});

// Při změně vyhledávání/filtrů/řazení se znovu překreslí seznam
[search, filterStatus, filterGenre, sortBy].forEach(el =>
  el.addEventListener("input", render)
);

// První vykreslení po načtení stránky
render();
