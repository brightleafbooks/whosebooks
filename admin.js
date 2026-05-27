import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { loginAdmin, logoutAdmin, watchAdminAuth } from "./auth.js";
import { previewImageFile, uploadImageToImgBB } from "./imgbb.js";

let books = [];
let selectedBookId = "";
let unsubscribeBooks = null;
let selectedCoverPreviewUrl = "";

const booksRef = collection(db, "books");
const booksQuery = query(booksRef, orderBy("createdAt", "desc"));

function show(message, type = "success") {
  if (typeof window.showToast === "function") {
    window.showToast(message, type);
  } else {
    console[type === "error" ? "error" : "log"](message);
  }
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, nextValue = "") {
  const el = document.getElementById(id);
  if (el) el.value = nextValue;
}

function checkedCategories() {
  return Array.from(document.querySelectorAll('input[name="book-cat"]:checked')).map(input => input.value);
}

function setCheckedCategories(genre = "") {
  const values = String(genre).split(",").map(item => item.trim());
  document.querySelectorAll('input[name="book-cat"]').forEach(input => {
    input.checked = values.includes(input.value);
  });
}

function setUploadState(isUploading, message = "") {
  const saveBtn = document.getElementById("book-save-btn");
  const status = document.getElementById("book-cover-upload-status");
  if (saveBtn) {
    saveBtn.disabled = isUploading;
    saveBtn.textContent = isUploading ? "Uploading Image..." : (selectedBookId ? "Save Book Changes" : "Add Book to Website");
  }
  if (status) status.textContent = message;
}

function ensureCoverPreviewUI() {
  const fileInput = document.getElementById("book-cover-file");
  if (!fileInput || document.getElementById("book-cover-preview")) return;

  const preview = document.createElement("img");
  preview.id = "book-cover-preview";
  preview.alt = "Selected cover preview";
  preview.style.cssText = "display:none;width:92px;height:138px;object-fit:cover;margin-top:0.75rem;border:1px solid var(--border2);background:var(--bg);";

  const status = document.createElement("div");
  status.id = "book-cover-upload-status";
  status.style.cssText = "margin-top:0.5rem;font-size:0.72rem;color:var(--text3);";

  fileInput.insertAdjacentElement("afterend", status);
  status.insertAdjacentElement("afterend", preview);
}

function showCoverPreview(src) {
  const preview = document.getElementById("book-cover-preview");
  if (!preview) return;
  if (src) {
    preview.src = src;
    preview.style.display = "block";
  } else {
    preview.removeAttribute("src");
    preview.style.display = "none";
  }
}

async function previewSelectedCover() {
  const fileInput = document.getElementById("book-cover-file");
  const file = fileInput?.files?.[0];
  selectedCoverPreviewUrl = "";
  if (!file) {
    showCoverPreview(value("book-cover"));
    setUploadState(false, "");
    return;
  }

  try {
    selectedCoverPreviewUrl = await previewImageFile(file);
    showCoverPreview(selectedCoverPreviewUrl);
    setUploadState(false, "Image selected. It will upload to ImgBB when you save.");
  } catch (err) {
    showCoverPreview("");
    setUploadState(false, err.message);
    show(err.message, "error");
  }
}

async function getCoverImageUrl() {
  const fileInput = document.getElementById("book-cover-file");
  const file = fileInput?.files?.[0];
  if (!file) return value("book-cover");

  setUploadState(true, "Uploading cover image to ImgBB...");
  try {
    const imageUrl = await uploadImageToImgBB(file);
    setValue("book-cover", imageUrl);
    setUploadState(false, "Image uploaded successfully.");
    return imageUrl;
  } catch (err) {
    setUploadState(false, "Image upload failed.");
    throw err;
  }
}

function bookPayload(imageUrl) {
  const categories = checkedCategories();
  return {
    title: value("book-panel-title"),
    author: value("book-panel-author") || "WhoseBooks",
    genre: categories.join(", ") || "Books",
    description: value("book-panel-desc"),
    rating: value("book-rating") || "4.0",
    imageUrl: imageUrl || "",
    featured: true
  };
}

function renderBookList(filter = "") {
  const list = document.getElementById("books-table");
  if (!list) return;
  const queryText = filter.toLowerCase();
  const visibleBooks = books.filter(book =>
    (book.title || "").toLowerCase().includes(queryText) ||
    (book.author || "").toLowerCase().includes(queryText) ||
    (book.genre || "").toLowerCase().includes(queryText)
  );

  list.innerHTML = visibleBooks.map(book => `
    <button class="compact-item ${book.id === selectedBookId ? "active" : ""}" type="button" onclick="editBook('${book.id}')">
      <div class="compact-item-title">${book.title || "Untitled Book"}</div>
      <div class="compact-item-meta">${book.genre || "Books"} · ${book.rating || "4.0"} ★</div>
    </button>
  `).join("");
}

function renderDashboardBooksFromFirestore() {
  const tbody = document.getElementById("dashboard-books");
  if (!tbody) return;
  tbody.innerHTML = books.slice(0, 4).map(book => `
    <tr>
      <td><div style="display:flex;gap:0.75rem;align-items:center"><div class="book-thumb-cell">${book.imageUrl ? "🖼️" : "📘"}</div><div><div style="color:var(--text);font-weight:400">${book.title || "Untitled Book"}</div><div style="font-size:0.7rem;color:var(--text3)">${book.author || ""}</div></div></div></td>
      <td>-</td>
      <td>${book.rating || "4.0"} ★</td>
      <td>${book.featured ? '<span class="badge badge-purple">Featured</span>' : '<span class="badge badge-green">Active</span>'}</td>
      <td><div style="display:flex;gap:0.4rem"><button class="btn btn-secondary btn-sm" onclick="editBookFromDashboard('${book.id}')">Edit</button><button class="btn btn-danger btn-sm" onclick="deleteBook('${book.id}')">Delete</button></div></td>
    </tr>
  `).join("");
}

function startBooksListener() {
  if (unsubscribeBooks) return;
  unsubscribeBooks = onSnapshot(booksQuery, snapshot => {
    books = snapshot.docs.map(bookDoc => ({ id: bookDoc.id, ...bookDoc.data() }));
    renderBookList(value("book-search"));
    renderDashboardBooksFromFirestore();
    const stat = document.getElementById("stat-books");
    if (stat) stat.textContent = books.length.toLocaleString();
  }, error => {
    show(`Could not load books: ${error.message}`, "error");
  });
}

function stopBooksListener() {
  if (unsubscribeBooks) {
    unsubscribeBooks();
    unsubscribeBooks = null;
  }
}

window.doLogin = async function doLogin() {
  const email = value("admin-email-input");
  const password = value("password-input");
  const error = document.getElementById("login-error");
  if (!email || !password) {
    if (error) {
      error.textContent = "Enter your admin email and password.";
      error.style.display = "block";
    }
    return;
  }
  try {
    await loginAdmin(email, password);
  } catch (err) {
    if (error) {
      error.textContent = err.message;
      error.style.display = "block";
    }
  }
};

window.doLogout = async function doLogout() {
  await logoutAdmin();
};

window.renderBooks = renderBookList;
window.filterBooks = function filterBooks() {
  renderBookList(value("book-search"));
};

window.clearBookPanel = function clearBookPanel() {
  selectedBookId = "";
  setValue("book-panel-title");
  setValue("book-panel-author");
  setValue("book-panel-desc");
  setValue("book-cover");
  setValue("book-inside");
  setValue("book-samples");
  setValue("book-pdf");
  setValue("book-panel-price");
  setValue("book-panel-instamojo");
  setValue("book-age");
  setValue("book-amazon");
  document.querySelectorAll('input[name="book-cat"]').forEach(input => input.checked = false);
  const fileInput = document.getElementById("book-cover-file");
  if (fileInput) fileInput.value = "";
  selectedCoverPreviewUrl = "";
  showCoverPreview("");
  setUploadState(false, "");
  const title = document.getElementById("book-editor-title");
  const saveBtn = document.getElementById("book-save-btn");
  const deleteBtn = document.getElementById("book-delete-btn");
  if (title) title.textContent = "Add a New Book";
  if (saveBtn) saveBtn.textContent = "Add Book to Website";
  if (deleteBtn) deleteBtn.style.display = "none";
  renderBookList(value("book-search"));
};

window.editBook = function editBook(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book) return;
  selectedBookId = book.id;
  setValue("book-panel-title", book.title || "");
  setValue("book-panel-author", book.author || "");
  setValue("book-panel-desc", book.description || "");
  setValue("book-cover", book.imageUrl || "");
  selectedCoverPreviewUrl = "";
  showCoverPreview(book.imageUrl || "");
  const fileInput = document.getElementById("book-cover-file");
  if (fileInput) fileInput.value = "";
  setUploadState(false, "");
  setCheckedCategories(book.genre || "");
  const title = document.getElementById("book-editor-title");
  const saveBtn = document.getElementById("book-save-btn");
  const deleteBtn = document.getElementById("book-delete-btn");
  if (title) title.textContent = "Edit Book";
  if (saveBtn) saveBtn.textContent = "Save Book Changes";
  if (deleteBtn) deleteBtn.style.display = "inline-flex";
  renderBookList(value("book-search"));
};

window.editBookFromDashboard = function editBookFromDashboard(bookId) {
  if (typeof window.switchSection === "function") window.switchSection("books");
  window.editBook(bookId);
};

window.saveBookPanel = async function saveBookPanel() {
  const title = value("book-panel-title");
  if (!title) {
    show("Title is required", "error");
    return;
  }

  try {
    if (selectedBookId) {
      const imageUrl = await getCoverImageUrl();
      await updateDoc(doc(db, "books", selectedBookId), bookPayload(imageUrl));
      show("Book updated successfully");
    } else {
      const imageUrl = await getCoverImageUrl();
      await addDoc(booksRef, {
        ...bookPayload(imageUrl),
        createdAt: serverTimestamp()
      });
      show("Book added successfully");
    }
    window.clearBookPanel();
  } catch (err) {
    show(`Could not save book: ${err.message}`, "error");
  }
};

window.deleteBook = async function deleteBook(bookId) {
  const book = books.find(item => item.id === bookId);
  if (!book || !confirm(`Delete "${book.title}"?`)) return;
  try {
    await deleteDoc(doc(db, "books", book.id));
    show("Book deleted");
    window.clearBookPanel();
  } catch (err) {
    show(`Could not delete book: ${err.message}`, "error");
  }
};

window.deleteSelectedBook = function deleteSelectedBook() {
  if (selectedBookId) window.deleteBook(selectedBookId);
};

watchAdminAuth(
  () => {
    ensureCoverPreviewUI();
    document.getElementById("book-cover-file")?.addEventListener("change", previewSelectedCover);
    document.getElementById("book-cover")?.addEventListener("input", () => {
      if (!document.getElementById("book-cover-file")?.files?.[0]) showCoverPreview(value("book-cover"));
    });
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("admin").style.display = "flex";
    document.getElementById("login-error").style.display = "none";
    startBooksListener();
  },
  () => {
    stopBooksListener();
    document.getElementById("admin").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    setValue("password-input");
  }
);
