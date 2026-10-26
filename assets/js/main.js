/* Главный скрипт инициализации и обработчиков событий */

export function initDownloadCv() {
  const btn = document.getElementById("download-cv-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const originalTitle = document.title;
    // Оптимальное имя файла для сохранения браузером в PDF:
    document.title = "Резюме — Алексей Елманов";
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.title = originalTitle;
      },
      { once: true }
    );
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDownloadCv);
} else {
  initDownloadCv();
}
