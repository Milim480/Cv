/* Опыт работы и повышение квалификации.
 * Карточки открываются в той же модалке, что и проекты, и могут
 * содержать материалы и благодарности (details.materials / details.thanks).
 */
import { el, openCase, entryToCase, hasDetails } from "./modal.js";

async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function entryCard(entry, eyebrow) {
  const li = el("li");
  const article = el("article", "entry");

  const meta = [entry.period, entry.location].filter(Boolean).join(" · ");
  if (meta) {
    article.append(el("p", "entry__period", meta));
  }

  article.append(el("h3", "entry__title", entry.title));

  if (entry.subtitle) {
    article.append(el("p", "entry__subtitle", entry.subtitle));
  }
  if (entry.summary) {
    article.append(el("p", "entry__summary", entry.summary));
  }

  if (entry.highlights?.length) {
    const list = el("ul", "entry__highlights");
    for (const item of entry.highlights) list.append(el("li", null, item));
    article.append(list);
  }

  if (entry.tags?.length || entry.confidential) {
    const tags = el("ul", "tags");

    // Пометка о конфиденциальности: "confidential": true или своя подпись, например "NDA"
    if (entry.confidential) {
      const label = typeof entry.confidential === "string" ? entry.confidential : "Конфиденциально";
      const nda = el("li", "tag tag--nda", label);
      nda.title = "Детали проекта не раскрываются по условиям договора";
      tags.append(nda);
    }

    for (const tag of entry.tags || []) tags.append(el("li", "tag", tag));
    article.append(tags);
  }

  // Подтверждение (сертификат) видно прямо на карточке; ссылка появляется, когда указан url.
  if (entry.certificate?.url) {
    const cert = el("a", "entry__cert", `${entry.certificate.label || "Сертификат"} ↗`);
    cert.href = entry.certificate.url;
    cert.target = "_blank";
    cert.rel = "noopener noreferrer";
    article.append(cert);
  }

  if (hasDetails(entry)) {
    const more = el("button", "entry__link", "Подробнее →");
    more.type = "button";
    more.addEventListener("click", () => openCase(entryToCase(entry, eyebrow)));
    article.append(more);
  }

  li.append(article);
  return li;
}

function mount(listId, items, eyebrow) {
  const list = document.getElementById(listId);
  if (!list) return;

  // Раздел без карточек не показываем, чтобы на странице не было пустых блоков.
  if (!items.length) {
    list.closest("section").hidden = true;
    return;
  }
  list.replaceChildren(...items.map((item) => entryCard(item, eyebrow)));
}

function showError(listId, message) {
  const list = document.getElementById(listId);
  if (list) list.replaceChildren(el("li", "projects__error", message));
}

async function init() {
  try {
    const experience = await loadJson("data/experience.json");

    mount("experience-list", experience.filter((e) => e.group === "specialty"), "Опыт по специальности");
    mount("other-experience-list", experience.filter((e) => e.group !== "specialty"), "Опыт работы");
  } catch (error) {
    console.error("Не удалось загрузить опыт:", error);
    const message = "Опыт не загрузился. Проверь JSON и запусти локальный сервер.";
    showError("experience-list", message);
    showError("other-experience-list", message);
  }

  try {
    const training = await loadJson("data/training.json");
    mount("training-list", training, "Повышение квалификации");
  } catch (error) {
    console.error("Не удалось загрузить курсы:", error);
    showError("training-list", "Курсы не загрузились. Проверь JSON и запусти локальный сервер.");
  }
}

init();
