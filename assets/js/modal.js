/* Общее модальное окно для карточек: проекты, опыт, курсы, витрина территорий.
 *
 * Любая карточка приводится к единому виду «case» (см. адаптеры внизу файла)
 * и открывается через openCase(). Благодаря этому материалы, благодарности
 * и разделы работают одинаково везде, как в PRO.HUB.
 */

/* ---------- Мелкие помощники ---------- */

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function field(label, value) {
  const wrap = el("div", "project-modal__fact");
  wrap.append(
    el("dt", null, label),
    el("dd", null, value || "Не указано")
  );
  return wrap;
}

const hasText = (value) => typeof value === "string" && value.trim() !== "";

/* Если картинка не нашлась — скрываем её, а не показываем «битую» иконку. */
function guardImage(img) {
  img.addEventListener("error", () => img.classList.add("is-missing"));
}

/* ---------- Окно ---------- */

const dialog = el("dialog", "project-modal");
dialog.setAttribute("aria-labelledby", "project-modal-title");

const panel = el("div", "project-modal__panel");
const content = el("div", "project-modal__content");
const closeButton = el("button", "project-modal__close", "Закрыть");

closeButton.type = "button";
closeButton.addEventListener("click", () => dialog.close());

panel.append(closeButton, content);
dialog.append(panel);
document.body.append(dialog);

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

/* Номер последней отрисовки. Асинхронные блоки (витрина, сертификаты)
   сверяются с ним, чтобы не дорисоваться в чужую карточку после перехода. */
let renderId = 0;

/* ---------- Сборка блоков ---------- */

function buildHero(c, parent) {
  const hero = el("header", "project-modal__hero");

  if (parent) {
    const back = el("button", "project-modal__back", `← ${parent.title}`);
    back.type = "button";
    back.addEventListener("click", () => openCase(parent));
    hero.append(back);
  }

  if (hasText(c.eyebrow)) {
    hero.append(el("p", "project-modal__eyebrow", c.eyebrow));
  }

  const title = el("h2", "project-modal__title", c.title);
  title.id = "project-modal-title";
  hero.append(title);

  if (hasText(c.subtitle)) {
    hero.append(el("p", "project-modal__subtitle", c.subtitle));
  }

  if (hasText(c.cover)) {
    const img = el("img", "project-modal__cover");
    img.src = c.cover;
    img.alt = `Обложка: ${c.title}`;
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    hero.append(img);
  }

  return hero;
}

function buildFacts(facts) {
  const list = (facts || []).filter((fact) => hasText(fact.value));
  if (!list.length) return null;

  const dl = el("dl", "project-modal__facts");
  dl.style.setProperty("--fact-cols", String(Math.min(list.length, 3)));
  for (const fact of list) dl.append(field(fact.label, fact.value));
  return dl;
}

function buildSections(sections) {
  return (sections || []).map((section, index) => {
    const heading = section.heading || "";
    const normalized = heading.toLowerCase();

    const isRole =
      normalized.includes("вклад") ||
      normalized.includes("роль") ||
      normalized.includes("участие");

    const isResult =
      normalized.includes("результат") ||
      normalized.includes("итог");

    let className = "project-modal__section";
    if (isRole) className += " project-modal__section--role";
    else if (isResult) className += " project-modal__section--result";

    const block = el("section", className);

    block.append(
      el("span", "project-modal__section-index", String(index + 1).padStart(2, "0")),
      el("h3", "project-modal__section-title", heading)
    );

    for (const paragraph of section.paragraphs || []) {
      block.append(el("p", null, paragraph));
    }

    if (section.items?.length) {
      const items = el("ul", "project-modal__list");
      for (const item of section.items) items.append(el("li", null, item));
      block.append(items);
    }

    return block;
  });
}

function buildGallery(c) {
  const images = (c.gallery || [])
    .map((item) => (typeof item === "string" ? { src: item } : item))
    .filter((item) => hasText(item.src));

  if (!images.length) return null;

  const block = el("section", "project-modal__gallery");
  block.append(el("h3", "project-modal__showcase-title", c.galleryTitle || "Галерея"));

  const grid = el("div", "project-modal__gallery-grid");

  for (const item of images) {
    const figure = el("figure", "project-modal__figure");
    const link = el("a");
    link.href = item.src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const img = el("img");
    img.src = item.src;
    img.alt = item.alt || item.caption || "";
    img.loading = "lazy";
    guardImage(img);

    link.append(img);
    figure.append(link);

    if (hasText(item.caption)) {
      figure.append(el("figcaption", null, item.caption));
    }
    grid.append(figure);
  }

  block.append(grid);
  return block;
}

/* Список ссылок: «Материалы проекта», «Благодарности» и т. п. */
function buildLinkSection(title, links) {
  const block = el("section", "project-modal__section");
  block.append(
    el("span", "project-modal__materials-index", "↗"),
    el("h3", "project-modal__section-title", title)
  );

  const list = el("ul", "project-modal__list");

  for (const material of links) {
    const item = el("li");
    const link = el("a", null, material.label);

    link.href = material.url;

     if (/^https?:\/\//i.test(material.url) || material.url.toLowerCase().endsWith(".pdf")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    item.append(link);
    list.append(item);
  }

  block.append(list);
  return block;
}

const validLinks = (links) =>
  (links || []).filter((link) => hasText(link.label) && hasText(link.url));

/* ---------- Витрина внутри карточки ---------- */

const showcaseCache = new Map();

function loadShowcaseItems(showcase) {
  if (Array.isArray(showcase.items)) return Promise.resolve(showcase.items);

  if (!showcaseCache.has(showcase.source)) {
    const request = fetch(showcase.source)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .catch((error) => {
        showcaseCache.delete(showcase.source);
        throw error;
      });
    showcaseCache.set(showcase.source, request);
  }
  return showcaseCache.get(showcase.source);
}

function showcaseCard(item, parent) {
  const li = el("li");
  const article = el("article", "showcase__card");

  if (hasText(item.cover)) {
    const img = el("img", "showcase__cover");
    img.src = item.cover;
    img.alt = "";
    img.loading = "lazy";
    guardImage(img);
    article.append(img);
  }

  const body = el("div", "showcase__body");

  const heading = el("h4", "showcase__title");
  const open = el("button", "showcase__open", item.title);
  open.type = "button";
  open.addEventListener("click", () => openCase(showcaseItemToCase(item), parent));
  heading.append(open);
  body.append(heading);

  if (hasText(item.location)) {
    body.append(el("p", "showcase__meta", item.location));
  }
  if (hasText(item.summary)) {
    body.append(el("p", "showcase__summary", item.summary));
  }
  if (item.tags?.length) {
    const tags = el("ul", "tags");
    for (const tag of item.tags) tags.append(el("li", "tag", tag));
    body.append(tags);
  }

  article.append(body);
  li.append(article);
  return li;
}

function pluralProjects(n) {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n} проект`;
  if (rem10 >= 2 && rem10 <= 4 && (rem100 < 10 || rem100 >= 20)) return `${n} проекта`;
  return `${n} проектов`;
}

function buildShowcase(c, id) {
  const block = el("section", "project-modal__showcase");
  const heading = el("h3", "project-modal__showcase-title");
  const headingText = el("span", null, c.showcase.title || "Проекты");
  const countBadge = el("span", "showcase__count-badge");
  countBadge.hidden = true;
  heading.append(headingText, countBadge);
  block.append(heading);

  if (hasText(c.showcase.intro)) {
    block.append(el("p", "project-modal__showcase-intro", c.showcase.intro));
  }

  const status = el("p", "showcase__status", "Загружаю проекты…");
  const grid = el("ul", "showcase");
  block.append(status, grid);

  loadShowcaseItems(c.showcase)
    .then((items) => {
      if (id !== renderId) return;

      if (!items.length) {
        status.textContent = "Проекты скоро появятся.";
        return;
      }
      status.remove();
      countBadge.textContent = pluralProjects(items.length);
      countBadge.hidden = false;
      grid.replaceChildren(...items.map((item) => showcaseCard(item, c)));
    })
    .catch((error) => {
      console.error("Не удалось загрузить витрину:", error);
      if (id !== renderId) return;
      status.textContent = "Витрина не загрузилась. Проверь JSON и запусти локальный сервер.";
    });

  return block;
}

/* ---------- Благодарности из папки (только для локального сервера) ---------- */

async function loadCertificates(dir, id) {
  try {
    const base = dir.endsWith("/") ? dir : `${dir}/`;
    const response = await fetch(base);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const page = new DOMParser().parseFromString(html, "text/html");

    const files = [...page.querySelectorAll("a[href]")]
      .map((link) => decodeURIComponent(link.getAttribute("href")).split("/").pop())
      .filter((name) => name.toLowerCase().endsWith(".pdf"));

    if (!files.length || id !== renderId) return;

    content.append(
      buildLinkSection(
        "Благодарности",
        files.map((file) => ({
          label: file.replace(/\.pdf$/i, "").replaceAll("_", " "),
          url: `${base}${encodeURIComponent(file)}`
        }))
      )
    );
  } catch (error) {
    console.error("Не удалось загрузить благодарности:", error);
  }
}

/* ---------- Открыть карточку ---------- */

export function openCase(c, parent = null) {
  const id = ++renderId;
  content.replaceChildren();

  content.append(buildHero(c, parent));

  const facts = buildFacts(c.facts);
  if (facts) content.append(facts);

  if (c.showcase) content.append(buildShowcase(c, id));

  content.append(...buildSections(c.sections));

  const gallery = buildGallery(c);
  if (gallery) content.append(gallery);

  const materials = validLinks(c.materials);
  if (materials.length) {
    content.append(buildLinkSection(c.materialsTitle || "Материалы", materials));
  }

  const thanks = validLinks(c.thanks);
  if (thanks.length) {
    content.append(buildLinkSection("Благодарности", thanks));
  }

  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;

  // Запасной вариант без перечисления файлов в JSON; работает только там,
  // где сервер отдаёт список папки. Явный список thanks всегда в приоритете.
  if (c.certificatesDir && !thanks.length) {
    loadCertificates(c.certificatesDir, id);
  }
}

/* ---------- Адаптеры: данные карточки → единый вид «case» ---------- */

/* Есть ли что показывать в модалке. Если нет, ссылку «Подробнее» не рисуем. */
export function hasDetails(item) {
  const d = item.details;
  if (!d) return false;
  return Boolean(
    d.showcase ||
    d.sections?.length ||
    d.facts?.length ||
    d.gallery?.length ||
    validLinks(d.materials).length ||
    validLinks(d.thanks).length ||
    d.certificatesDir
  );
}

/* Проект из data/projects.json */
export function projectToCase(project) {
  const d = project.details || {};

  return {
    eyebrow: d.eyebrow || "Проектный кейс",
    title: project.title,
    subtitle: d.subtitle,
    cover: project.cover,
    facts: d.facts || [
      { label: "Задача", value: project.task },
      { label: "Что сделано", value: project.done },
      { label: "Результат", value: project.result }
    ],
    showcase: d.showcase,
    sections: d.sections,
    gallery: d.gallery,
    galleryTitle: d.galleryTitle,
    materials: d.materials,
    materialsTitle: d.materialsTitle || "Материалы проекта",
    thanks: d.thanks,
    certificatesDir: d.certificatesDir
  };
}

/* Место работы или курс из data/experience.json и data/training.json */
export function entryToCase(entry, eyebrow) {
  const d = entry.details || {};

  return {
    eyebrow: d.eyebrow || eyebrow,
    title: entry.title,
    subtitle: d.subtitle || [entry.subtitle, entry.period].filter(hasText).join(" · "),
    cover: entry.cover || d.cover,
    facts: d.facts || [],
    sections: d.sections,
    gallery: d.gallery,
    galleryTitle: d.galleryTitle,
    materials: d.materials,
    materialsTitle: d.materialsTitle || "Материалы",
    thanks: d.thanks,
    certificatesDir: d.certificatesDir
  };
}

/* Карточка витрины из data/territories.json */
export function showcaseItemToCase(item) {
  const sections = [];

  if (item.responsibilities?.length) {
    sections.push({ heading: "Моя роль", items: item.responsibilities });
  }
  if (item.process?.length) {
    sections.push({ heading: "Процесс работы", items: item.process });
  }
  sections.push(...(item.sections || []));

  return {
    eyebrow: item.eyebrow || "Территориальный проект",
    title: item.title,
    subtitle: item.summary,
    cover: item.cover,
    facts: [
      { label: "Локация", value: item.location },
      { label: "Задача", value: item.task },
      { label: "Результат", value: item.result }
    ],
    sections,
    gallery: item.gallery,
    galleryTitle: item.galleryTitle || "Визуализации",
    materials: item.materials,
    materialsTitle: item.materialsTitle || "Материалы проекта",
    thanks: item.thanks,
    certificatesDir: item.certificatesDir
  };
}
