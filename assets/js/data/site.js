/**
 * Contact details, used everywhere a link has data-link="email|linkedin|github"
 * and by the call-to-action shown at the end of every tab. Edit links here only.
 */
(function (Site) {
  Site.config = {
    name: 'Ethan Gueck',
    email: 'e.gueck1@gmail.com',
    github: 'https://github.com/ethan-gueck',
    // Paste the full profile URL, e.g. https://www.linkedin.com/in/your-handle/
    // Until then, LinkedIn links open a LinkedIn search for Ethan's name.
    linkedin: '',
    // Ethan's NN reads each track's domain site (https://ethan-gueck.github.io/<site>/, see
    // data/neurons.js) for its api/v1/manifest.json. When this page is served from localhost,
    // only the sites listed in projectsLocal are read, from the local preview servers.
    projects: 'https://ethan-gueck.github.io/',
    projectsLocal: { algebra: 'http://localhost:8001/' },
  };
})(window.Site = window.Site || {});
