import { el, field, openCase, projectToCase, hasDetails } from "./modal.js";

const list = document.getElementById("projects-list");

function card(project) {
  const li = el("li");
  const article = el("article", "project");

  const main = el("div", "project__main");
  const img = el("img", "project__cover");

  img.src = project.cover;
  img.alt = "";
  img.loading = "lazy";
  // Обложки может ещё не быть в репозитории: скрываем «битую» картинку.
  img.addEventListener("error", () => img.classList.add("is-missing"));

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

    if (hasDetails(project)) {
      link.href = "#details";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openCase(projectToCase(project));
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
