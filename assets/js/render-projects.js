
const list = document.getElementById("projects-list");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function field(label, value) {
  const wrap = el("div", "project-modal__fact");
  wrap.append(
    el("dt", null, label),
    el("dd", null, value || "Не указано")
  );
  return wrap;
}

// Создаём общее модальное окно.
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


async function loadCertificates(block) {
  try {
    const response = await fetch("files/prohub/certificates/");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const page = new DOMParser().parseFromString(html, "text/html");

    const files = [...page.querySelectorAll("a[href]")]
      .map((link) => decodeURIComponent(link.getAttribute("href")))
      .filter((href) => href.toLowerCase().endsWith(".pdf"));

    if (!files.length) return;

    const section = el("section", "project-modal__section");

    section.append(
      el("span", "project-modal__materials-index", "↗"),
      el("h3", "project-modal__section-title", "Благодарности")
    );

    const list = el("ul", "project-modal__list");

    for (const file of files) {
      const item = el("li");
      const link = el(
        "a",
        null,
        file.replace(/\.pdf$/i, "").replaceAll("_", " ")
      );

      link.href =
        `files/prohub/certificates/${encodeURIComponent(file)}`;
      link.download = file;

      item.append(link);
      list.append(item);
    }

    section.append(list);
    block.append(section);
  } catch (error) {
    console.error("Не удалось загрузить благодарности:", error);
  }
};


function openProject(project) {
  content.replaceChildren();

  // Шапка кейса
  const hero = el("header", "project-modal__hero");

  hero.append(
    el("p", "project-modal__eyebrow", "Проектный кейс")
  );

  const title = el("h2", "project-modal__title", project.title);
  title.id = "project-modal-title";
  hero.append(title);

  if (project.details?.subtitle) {
    hero.append(
      el("p", "project-modal__subtitle", project.details.subtitle)
    );
  }

  if (project.cover) {
    const img = el("img", "project-modal__cover");
    img.src = project.cover;
    img.alt = `Обложка проекта «${project.title}»`;
    img.loading = "lazy";
    hero.append(img);
  }

  content.append(hero);

  // Ключевые факты
  const facts = el("dl", "project-modal__facts");

  facts.append(
    field("Задача", project.task),
    field("Что сделано", project.done),
    field("Результат", project.result)
  );

  content.append(facts);

  // Основные разделы
  const sections = project.details?.sections || [];

  for (const [index, section] of sections.entries()) {
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

    if (isRole) {
      className += " project-modal__section--role";
    } else if (isResult) {
      className += " project-modal__section--result";
    }

    const block = el("section", className);

    block.append(
      el("span", "project-modal__section-index",
        String(index + 1).padStart(2, "0")
      ),
      el("h3", "project-modal__section-title", heading)
    );

    for (const paragraph of section.paragraphs || []) {
      block.append(el("p", null, paragraph));
    }

    if (section.items?.length) {
      const items = el("ul", "project-modal__list");

      for (const item of section.items) {
        items.append(el("li", null, item));
      }

      block.append(items);
    }

    content.append(block);
  }

  // Материалы проекта
  if (project.details?.materials?.length) {
    const block = el("section", "project-modal__section");
    block.append(
      el("span", "project-modal__materials-index", "↗"),
      el("h3", "project-modal__section-title", "Материалы проекта")
    );

    const items = el("ul", "project-modal__list");

    for (const material of project.details.materials) {
      const item = el("li");
      const link = el("a", null, material.label);

      link.href = material.url;
      if (material.url.toLowerCase().endsWith(".pdf")) {
        link.download = "";
      }
      item.append(link);
      items.append(item);
    }

    block.append(items);
    content.append(block);
  }

  dialog.showModal();
  loadCertificates(content);
}

function card(project) {
  const li = el("li");
  const article = el("article", "project");

  const main = el("div", "project__main");
  const img = el("img", "project__cover");

  img.src = project.cover;
  img.alt = "";
  img.loading = "lazy";

  const tags = el("ul", "tags");

  for (const tag of project.tags || []) {
    tags.append(el("li", "tag", tag));
  }

  main.append(
    img,
    el("h3", "project__title", project.title),
    el("p", "project__summary", project.summary),
    tags
  );

  const body = el("div", "project__body");
  const facts = el("dl", "project__facts");

  facts.append(
    field("Задача", project.task),
    field("Что сделано", project.done),
    field("Результат", project.result)
  );

  body.append(facts);

  if (project.link?.href) {
    const link = el(
      "a",
      "project__link",
      `${project.link.label || "Подробнее"} →`
    );

    link.href = project.link.href;

    if (project.details) {
      link.href = "#details";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openProject(project);
      });
    } else if (/^https?:\/\//i.test(link.href)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }

    body.append(link);
  }

  article.append(main, body);
  li.append(article);
  return li;
}

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

async function init() {
  if (!list) {
    console.error('Не найден элемент с id="projects-list".');
    return;
  }

  try {
    const response = await fetch("data/projects.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const projects = await response.json();
    list.replaceChildren(...projects.map(card));
  } catch (error) {
    console.error("Не удалось загрузить проекты:", error);
    list.replaceChildren(
      el(
        "li",
        "projects__error",
        "Проекты не загрузились. Проверь JSON и запусти локальный сервер."
      )
    );
  }
}

init();
