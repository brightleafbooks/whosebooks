import {
  collection,
  onSnapshot,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const booksGrid = document.getElementById("books-grid") || document.querySelector(".books-grid");
const coverClasses = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderBook(book, index) {
  const title = escapeHtml(book.title || "Untitled Book");
  const author = escapeHtml(book.author || "Unknown Author");
  const genre = escapeHtml(book.genre || "Books");
  const rating = escapeHtml(book.rating || "4.0");
  const description = escapeHtml(book.description || "");
  const imageUrl = book.imageUrl ? escapeHtml(book.imageUrl) : "";
  const coverClass = coverClasses[index % coverClasses.length];
  const imageMarkup = imageUrl
    ? `<img src="${imageUrl}" alt="${title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1;">`
    : `<div class="book-cover-bg" style="font-size:4rem">📚</div>`;

  return `
    <div class="book-item reveal reveal-delay-${(index % 4) + 1}" title="${description}">
      <div class="book-thumb ${coverClass}">
        ${imageMarkup}
        <span class="book-genre-pill">${genre}</span>
        <div class="book-thumb-overlay">Quick View</div>
      </div>
      <div class="book-meta-title">${title}</div>
      <div class="book-meta-author">${author}</div>
      <div class="book-meta-bottom">
        <span class="book-rating">★ ${rating}</span>
        <span class="book-price">${book.featured ? "Featured" : ""}</span>
      </div>
    </div>
  `;
}

function renderBooks(snapshot) {
  if (!booksGrid) return;
  const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  if (!books.length) {
    booksGrid.innerHTML = "";
    return;
  }
  booksGrid.innerHTML = books.map(renderBook).join("");
}

if (booksGrid) {
  const booksQuery = query(collection(db, "books"), orderBy("createdAt", "desc"));
  onSnapshot(booksQuery, renderBooks, error => {
    console.error("Unable to load books from Firestore:", error);
  });
}
