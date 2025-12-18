// ===== Utils =====
function makeId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

// ===== Model =====
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

  validate() {
    if (!this.title) return "Název je povinný.";
    if (!this.author) return "Autor je povinný.";
    if (this.rating < 0 || this.rating > 5) return "Hodnocení musí být 0–5.";
    return null;
  }
}

// ===== Repository =====
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
class LibraryService {
  constructor(repo) {
    this.repo = repo;
    this.books = repo.load();
  }

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

  add(data) {
    const book = new Book({ ...data, id: makeId("book") });
    const err = book.validate();
    if (err) throw err;
    this.books.push(book);
    this.repo.save(this.books);
  }

  update(id, data) {
    const i = this.books.findIndex(b => b.id === id);
    if (i === -1) return;
    const book = new Book({ ...data, id });
    const err = book.validate();
    if (err) throw err;
    this.books[i] = book;
    this.repo.save(this.books);
  }

  remove(id) {
    this.books = this.books.filter(b => b.id !== id);
    this.repo.save(this.books);
  }

  get(id) {
    return this.books.find(b => b.id === id);
  }
}

// ===== App =====
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

function clearForm() {
  bookId.value = "";
  form.reset();
  rating.value = 0;
  status.value = "wishlist";
}

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
    div.className = "item";

    const stavText =
      b.status === "done" ? "Dočteno" :
      b.status === "reading" ? "Čtu" : "Chci";

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

resetBtn.addEventListener("click", clearForm);

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

[search, filterStatus, filterGenre, sortBy].forEach(el =>
  el.addEventListener("input", render)
);

render();
