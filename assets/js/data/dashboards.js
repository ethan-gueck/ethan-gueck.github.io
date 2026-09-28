/**
 * Portfolio gallery content.
 * To add a dashboard: drop a .webp into assets/img/portfolio/ and add an entry here.
 * Order in this array is the order shown in the gallery.
 */
(function () {
  var IMG = 'assets/img/portfolio/';

window.Site = window.Site || {};
window.Site.dashboards = [
  { src: `${IMG}dashboard-027.webp`, title: 'Drop summary',
    caption: 'Aerial and buried drop footage distributions and total mileage by install type.' },
  { src: `${IMG}dashboard-029.webp`, title: 'Miles constructed factsheet',
    caption: 'Daily, weekly, and annual production required to meet the construction target, compared with recent rates.' },
  { src: `${IMG}dashboard-018.webp`, title: 'Fielding report',
    caption: 'Side-by-side vendor fielding production with trailing 60, 90, and 120 day weekly averages and progress to target.' },
  { src: `${IMG}dashboard-025.webp`, title: 'Vendor comparison',
    caption: 'Weekly poles fielded by vendor across the year, with share of total and pacing gauges.' },
  { src: `${IMG}dashboard-019.webp`, title: 'Days outstanding forecast',
    caption: 'Forecast of poles by aging bucket at a pole owner, driven by trailing NTP rates and submission volume.' },
  { src: `${IMG}dashboard-015.webp`, title: 'Response rate report',
    caption: 'Monthly pre-inspection letters responded to and average days to respond, with trailing averages.' },
  { src: `${IMG}dashboard-014.webp`, title: 'Pre-inspection response time',
    caption: 'Monthly average time to respond with the full distribution shown as a violin plot.' },
  { src: `${IMG}dashboard-011.webp`, title: 'Mileage overview',
    caption: 'Share of route miles pending release, available to construct, and constructed, by FSA and attachment type.' },
  { src: `${IMG}dashboard-028.webp`, title: 'Mileage constructed overview',
    caption: 'Weekly strand, conduit, and construction miles with trailing weekly averages.' },
  { src: `${IMG}dashboard-030.webp`, title: 'Construction by county',
    caption: 'Aerial and underground miles placed by county and contractor, with miles constructed over released.' },
  { src: `${IMG}dashboard-012.webp`, title: 'Pole attachment status map',
    caption: 'Network-wide map of pole status by disposition, filterable by owner, county, FSA, and planned attachment.' },
];
})();
