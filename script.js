const SITE_NAME = "Shreya Punjabi";

let portfolioPromise;

// --------------------------------------------------
// Shared helpers
// --------------------------------------------------

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function projectURL(id) {
  return `project.html?id=${encodeURIComponent(id)}`;
}

function categoryURL(id) {
  return `projects.html?category=${encodeURIComponent(id)}`;
}

function createLink(text, href, className) {
  const link = createElement("a", className, text);
  link.href = href;
  return link;
}

function createImage(src, alt, lazy = true) {
  const image = document.createElement("img");

  image.alt = alt;
  image.decoding = "async";

  if (lazy) {
    image.loading = "lazy";
  }

  image.addEventListener("error", () => {
    const placeholder = createElement(
      "div",
      "image-placeholder",
      "Image coming soon"
    );

    image.replaceWith(placeholder);
  }, { once: true });

  image.src = src;

  return image;
}

// --------------------------------------------------
// Load and validate project data
// --------------------------------------------------

async function getPortfolio() {
  if (!portfolioPromise) {
    portfolioPromise = fetch("projects.json")
      .then(response => {
        if (!response.ok) {
          throw new Error(
            `Failed to load projects.json: ${response.status}`
          );
        }

        return response.json();
      })
      .then(data => {
        if (
          !Array.isArray(data.categories) ||
          !Array.isArray(data.projects)
        ) {
          throw new Error(
            "projects.json needs categories and projects arrays."
          );
        }

        const categoryIds = new Set();
        const projectIds = new Set();

        for (const category of data.categories) {
          if (
            !category.id ||
            !category.name ||
            categoryIds.has(category.id)
          ) {
            throw new Error(
              "Every category needs a unique id and a name."
            );
          }

          categoryIds.add(category.id);
        }

        for (const project of data.projects) {
          if (
            !project.id ||
            !project.name ||
            projectIds.has(project.id)
          ) {
            throw new Error(
              "Every project needs a unique id and a name."
            );
          }

          if (!categoryIds.has(project.category)) {
            throw new Error(
              `Unknown category on project "${project.id}".`
            );
          }

          if (
            project.uses !== undefined &&
            !Array.isArray(project.uses)
          ) {
            throw new Error(
              `"uses" must be an array on "${project.id}".`
            );
          }

          projectIds.add(project.id);
        }

        for (const project of data.projects) {
          for (const id of project.uses || []) {
            if (!projectIds.has(id) || id === project.id) {
              throw new Error(
                `Invalid project reference "${id}" on "${project.id}".`
              );
            }
          }
        }

        return data;
      });
  }

  return portfolioPromise;
}

// --------------------------------------------------
// Shared header
// --------------------------------------------------

async function loadHeader() {
  const placeholder = document.getElementById("site-header");
  if (!placeholder) return;

  try {
    const response = await fetch("header.html");

    if (!response.ok) {
      throw new Error(
        `Failed to load header.html: ${response.status}`
      );
    }

    const template = document.createElement("template");
    template.innerHTML = await response.text();

    const header = template.content.querySelector("header");

    if (!header) {
      throw new Error("header.html needs a header element.");
    }

    const currentPage =
      window.location.pathname.split("/").pop() || "index.html";

    const activePage =
      currentPage === "project.html"
        ? "projects.html"
        : currentPage;

    header.querySelectorAll("nav a").forEach(link => {
      const active =
        link.getAttribute("href") === activePage;

      link.classList.toggle("active", active);

      if (active) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    header.id = "site-header";
    placeholder.replaceWith(header);
  } catch (error) {
    console.error(error);

    placeholder.append(
      createLink(
        "Shreya Punjabi · Projects",
        "projects.html",
        "container header-fallback"
      )
    );
  }
}

// --------------------------------------------------
// Reusable project cards
// --------------------------------------------------

function createProjectCard(project, categories) {
  const card = createLink(
    "",
    projectURL(project.id),
    "project-card"
  );

  const imageWrap = createElement(
    "div",
    "project-image-wrap"
  );

  if (project.heroImage) {
    imageWrap.append(
      createImage(project.heroImage, project.name)
    );
  } else {
    imageWrap.append(
      createElement(
        "div",
        "image-placeholder",
        "Image coming soon"
      )
    );
  }

  const content = createElement("div", "project-content");

  const category = categories.find(
    item => item.id === project.category
  );

  if (category) {
    content.append(
      createElement("p", "eyebrow", category.name)
    );
  }

  content.append(
    createElement("h3", "", project.name),
    createElement("p", "", project.shortDescription || "")
  );

  card.append(imageWrap, content);

  return card;
}

// --------------------------------------------------
// Projects page
// --------------------------------------------------

async function loadProjectsPage() {
  const list = document.getElementById("projects-list");
  if (!list) return;

  try {
    const data = await getPortfolio();

    const selectedId = new URLSearchParams(
      window.location.search
    ).get("category");

    const selectedCategory = data.categories.find(
      category => category.id === selectedId
    );

    let categoryNav = document.getElementById("category-nav");

    if (!categoryNav) {
      categoryNav = document.createElement("nav");
      categoryNav.id = "category-nav";
      categoryNav.className = "category-nav";
      categoryNav.setAttribute("aria-label", "Project categories");

      list.before(categoryNav);
    }
    const allLink = createLink(
      "All",
      "projects.html",
      "category-link"
    );

    if (!selectedId) {
      allLink.classList.add("active");
      allLink.setAttribute("aria-current", "page");
    }

    categoryNav.replaceChildren(allLink);

    for (const category of data.categories) {
      const link = createLink(
        category.name,
        categoryURL(category.id),
        "category-link"
      );

      if (category.id === selectedId) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }

      categoryNav.append(link);
    }

    list.replaceChildren();

    if (selectedId && !selectedCategory) {
      document.getElementById("projects-heading")
        .textContent = "Category not found";

      list.append(
        createLink(
          "View all projects",
          "projects.html",
          "back-link"
        )
      );

      return;
    }

    const heading = selectedCategory
      ? selectedCategory.name
      : "Projects";

    document.getElementById("projects-heading")
      .textContent = heading;

    document.title = `${heading} | ${SITE_NAME}`;

    const visibleCategories = selectedCategory
      ? [selectedCategory]
      : data.categories;

    for (const category of visibleCategories) {
      const projects = data.projects.filter(
        project => project.category === category.id
      );

      const section = createElement(
        "section",
        "category-section"
      );

      const title = createElement("h2");
      title.append(
        createLink(
          category.name,
          categoryURL(category.id)
        )
      );

      section.append(title);

      if (category.description) {
        section.append(
          createElement(
            "p",
            "section-description",
            category.description
          )
        );
      }

      const cards = createElement("div", "projects-list");

      for (const project of projects) {
        cards.append(
          createProjectCard(project, data.categories)
        );
      }

      if (projects.length === 0) {
        cards.append(
          createElement(
            "p",
            "empty-state",
            "Projects coming soon."
          )
        );
      }

      section.append(cards);
      list.append(section);
    }
  } catch (error) {
    console.error(error);

    list.replaceChildren(
      createElement(
        "p",
        "empty-state",
        "Could not load projects. Check projects.json and run the website through a local server."
      )
    );
  }
}

// --------------------------------------------------
// Individual project page
// --------------------------------------------------

function fillTextSection(sectionId, contentId, value) {
  const hasContent =
    typeof value === "string" && value.trim().length > 0;

  document.getElementById(sectionId).hidden = !hasContent;
  document.getElementById(contentId).textContent =
    hasContent ? value : "";
}

function renderRelatedProjects(
  sectionId,
  containerId,
  projects,
  categories
) {
  document.getElementById(sectionId).hidden =
    projects.length === 0;

  const container = document.getElementById(containerId);
  container.replaceChildren();

  for (const project of projects) {
    container.append(
      createProjectCard(project, categories)
    );
  }
}

async function loadProjectDetailPage() {
  const detail = document.getElementById("project-detail");
  if (!detail) return;

  const status = document.getElementById("project-status");
  const breadcrumbs =
    document.getElementById("project-breadcrumbs");

  breadcrumbs.replaceChildren(
    createLink("Projects", "projects.html")
  );

  try {
    const data = await getPortfolio();
    const params = new URLSearchParams(window.location.search);

    // Also accept links from the previous site structure.
    const id = params.get("id") || params.get("slug");

    const project = data.projects.find(
      item => item.id === id
    );

    if (!project) {
      document.title = `Project not found | ${SITE_NAME}`;
      status.textContent =
        "Project not found. Use the Projects link above to browse the portfolio.";
      return;
    }

    const category = data.categories.find(
      item => item.id === project.category
    );

    breadcrumbs.append(
      createElement("span", "breadcrumb-separator", "›"),
      createLink(
        category.name,
        categoryURL(category.id)
      ),
      createElement("span", "breadcrumb-separator", "›")
    );

    const currentCrumb = createElement(
      "span",
      "",
      project.name
    );

    currentCrumb.setAttribute("aria-current", "page");
    breadcrumbs.append(currentCrumb);

    document.title = `${project.name} | ${SITE_NAME}`;

    document.getElementById("project-category")
      .textContent = category.name;

    document.getElementById("project-title")
      .textContent = project.name;

    document.getElementById("project-short-description")
      .textContent = project.shortDescription || "";

    const hero = document.getElementById(
      "project-hero-wrap"
    );

    hero.replaceChildren();
    hero.hidden = !project.heroImage;

    if (project.heroImage) {
      hero.append(
        createImage(project.heroImage, project.name, false)
      );
    }

    hero.closest(".project-hero").classList.toggle(
      "text-only",
      !project.heroImage
    );

    fillTextSection(
      "overview-section",
      "project-overview",
      project.overview
    );

    fillTextSection(
      "process-section",
      "project-process",
      project.process
    );

    const tools = Array.isArray(project.tools)
      ? project.tools
      : [];

    document.getElementById("tools-section").hidden =
      tools.length === 0;

    const toolList = document.getElementById("project-tools");
    toolList.replaceChildren();

    for (const tool of tools) {
      toolList.append(
        createElement("span", "tool-pill", tool)
      );
    }

    const gallery = Array.isArray(project.gallery)
  ? project.gallery.filter(item =>
      typeof item === "string"
        ? item.trim().length > 0
        : item && typeof item.src === "string" && item.src.trim()
    )
  : [];

document.getElementById("gallery-section").hidden =
  gallery.length === 0;


  
const galleryEl = document.getElementById("project-gallery");
galleryEl.replaceChildren();

gallery.forEach((item, index) => {
  // Older image-path-only entries still work.
  const media = typeof item === "string"
    ? { type: "image", src: item }
    : item;

  const figure = createElement("figure", "gallery-item");

  if (media.type === "video") {
    const video = document.createElement("video");

    video.src = media.src;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.setAttribute(
      "aria-label",
      media.caption || `${project.name} — video ${index + 1}`
    );

    if (media.poster) {
      video.poster = media.poster;
    }

    figure.append(video);
  } else {
    figure.append(
      createImage(
        media.src,
        media.alt ?? `${project.name} — image ${index + 1}`
      )
    );
  }

  if (media.caption) {
    figure.append(
      createElement("figcaption", "", media.caption)
    );
  }

  galleryEl.append(figure);
});

    // Forward links: projects listed in this project's uses.
    const usesIds = [...new Set(project.uses || [])];

    const uses = usesIds.map(usedId =>
      data.projects.find(item => item.id === usedId)
    );

    // Reverse links: projects that reference this project.
    const usedIn = data.projects.filter(item =>
      (item.uses || []).includes(project.id)
    );

    renderRelatedProjects(
      "uses-section",
      "project-uses",
      uses,
      data.categories
    );

    renderRelatedProjects(
      "used-in-section",
      "project-used-in",
      usedIn,
      data.categories
    );

    status.hidden = true;
    detail.hidden = false;
  } catch (error) {
    console.error(error);

    status.textContent =
      "Could not load this project. Check projects.json and run the website through a local server.";
  }
}

loadHeader();
loadProjectsPage();
loadProjectDetailPage();