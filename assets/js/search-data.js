// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-games",
          title: "games",
          description: "Serious games I design, to teach and to study how people learn, think and decide.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/games/";
          },
        },{id: "nav-library",
          title: "Library",
          description: "The papers I have read for my PhD. Each paper becomes a grid of its paragraphs, coloured by its theories, frameworks, concepts, experiments, people, what matters for my work, ideas to build and gaps.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/phd/";
          },
        },{id: "nav-cv",
          title: "cv",
          description: "Education, research, teaching and awards. The full CV is also available as a PDF.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "projects-let-39-s-look-at-papers-through-my-eyes",
          title: 'Let&amp;#39;s look at papers through my eyes',
          description: "How I read for my PhD on collaborative embodied learning of mathematics in virtual reality. Every paper becomes a bar as long as its pages, marked with its theories, experiments, what matters for my work and ideas for my thesis.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_phd/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%7A%66%61%6C%6C%61%68%31%30%38%37%34@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/zahrafalla", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/zahra-fallah95", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
