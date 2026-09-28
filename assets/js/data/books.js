/**
 * Book list shown from Field notes (Fun and Games tab).
 * Add entries below; the popup shows "Coming soon" for any empty list.
 *   books:  { title: '', author: '', note: '' }   // note is optional
 *   quotes: { text: '', source: '' }
 */
(function (Site) {
  Site.books = {
    books: [
      // { title: 'Book title', author: 'Author name', note: 'Why it stuck with me' },
    ],
    quotes: [
      // { text: 'Quote text', source: 'Author, Book' },
    ],
  };
})(window.Site = window.Site || {});
