/**
 * Ethan's NN: how the flashcards (data/flashcards.js) become neuron tracks.
 *
 * Every flashcard is a neuron and every deck belongs to a track. Tracks are listed here in
 * the order they appear; a deck not named in any track gets a track of its own at the end,
 * so a new deck shows up without editing this file, unless it is in neuronExcludedDecks. `site` is the track's domain repo,
 * published at https://ethan-gueck.github.io/<site>/ (see Site.config.projects).
 *
 * requires maps a card to the cards it uses or builds on. Each pair is drawn as an edge
 * when both cards are in the same track, and listed in the neuron's popup either way.
 *
 * A neuron is filled once a topic in any domain repo lists its card id in `cards` (see
 * that topic's api.py); nothing here needs to change when a page is published.
 */
(function (Site) {
  Site.neuronTracks = [
    { name: 'Algebra', site: 'algebra', decks: ['Algebra I', 'Algebra II'] },
    { name: 'Geometry', site: 'geometry', decks: ['Geometry'] },
    { name: 'Trigonometry', site: 'trigonometry', decks: ['Trigonometry'] },
    { name: 'Calculus', site: 'calculus', decks: ['Calculus I', 'Calculus II'] },
    { name: 'Multivariable & Vector Calculus', site: 'vector-calculus', decks: ['Multivariable & Vector Calculus'] },
    { name: 'Linear Algebra', site: 'linear-algebra', decks: ['Linear Algebra'] },
    { name: 'Statistics & Probability', site: 'statistics', decks: ['Statistics & Probability'] },
    { name: 'Functions & Distributions', site: 'functions-distributions', decks: ['Probability Distributions'] },
    { name: 'Machine Learning', site: 'machine-learning', decks: ['Machine Learning'] },
    { name: 'Algorithms', site: 'algorithms', decks: ['Algorithms'] },
    { name: 'Optimization & Simulation', site: 'optimization', decks: ['Optimization & Simulation'] },
    { name: 'Finance', site: 'finance', decks: ['Finance', 'Finance Terms'] },
    { name: 'Physics & Natural Phenomena', site: 'physics', decks: ['Physics & Natural Phenomena'] },
    { name: 'Electrical Engineering', site: 'electrical-engineering', decks: ['Electrical Engineering', 'EE Symbols', 'EE Terms'] },
    { name: 'Acronyms', site: 'acronyms', decks: ['Acronyms'] },
  ];

  // Reference decks that stay flashcards only: no neurons and no track.
  Site.neuronExcludedDecks = ['Key Terms', 'Greek Alphabet'];

  // Short names for cards whose front is a drawing and whose back runs name and description together.
  Site.neuronTitles = {
    'SY.2': 'Potentiometer', 'SY.7': 'Fuse', 'SY.20': 'Zener Diode', 'SY.22': 'MOSFET (n-channel)',
  };

  Site.neuronRequires = {
    // Algebra
    'A1.2': ['A1.1'], 'A1.3': ['A1.2'], 'A1.4': ['A1.1'], 'A1.5': ['A1.4'], 'A1.6': ['A1.5'],
    'A1.7': ['A1.15'], 'A1.8': ['A1.5'], 'A1.9': ['A1.2'], 'A1.10': ['A1.9'], 'A1.11': ['A1.10', 'A1.3'],
    'A1.12': ['A1.11'], 'A1.13': ['A1.14'], 'A1.14': ['A1.1'], 'A1.15': ['A1.1'], 'A1.16': ['A1.15'],
    'A2.1': ['A1.16'], 'A2.2': ['A2.1', 'A1.12'], 'A2.3': ['A1.11'], 'A2.4': ['A1.10'],
    'A2.5': ['A2.4'], 'A2.6': ['A1.2'], 'A2.7': ['A2.6', 'A2.1'], 'A2.8': ['A2.7'],
    'A2.9': ['A1.5'], 'A2.10': ['A2.6'], 'A2.11': ['A2.9', 'A2.10'], 'A2.12': ['A1.9', 'S.8'],
    'A2.13': ['A1.8'], 'A2.14': ['A2.13'], 'A2.15': ['A1.12', 'G.6'],
    // Geometry
    'G.2': ['G.1'], 'G.3': ['G.2'], 'G.4': ['G.3'], 'G.5': ['G.2'], 'G.6': ['G.3', 'A1.4'], 'G.7': ['G.2'],
    'G.8': ['G.3'], 'G.9': ['G.8'], 'G.10': ['G.9', 'G.1'], 'G.11': ['G.8'], 'G.12': ['G.11'],
    'G.13': ['G.6', 'A2.2'],
    // Trigonometry
    'T.1': ['G.3', 'G.5'], 'T.2': ['G.9'], 'T.3': ['T.1', 'T.2', 'G.4'], 'T.4': ['T.3'], 'T.5': ['T.4'],
    'T.6': ['T.5'], 'T.7': ['T.1'], 'T.8': ['T.7', 'G.3'], 'T.9': ['T.3', 'A2.2'], 'T.10': ['T.9', 'A2.1'],
    'T.11': ['T.3'], 'T.12': ['T.8', 'LA.1'], 'T.13': ['T.5', 'A2.3', 'C2.13'],
    // Calculus
    'C1.1': ['A2.1'], 'C1.2': ['C1.1', 'A2.6'], 'C1.3': ['C1.1'], 'C1.4': ['C1.1', 'A1.4'], 'C1.5': ['C1.4'],
    'C1.6': ['C1.5'], 'C1.7': ['C1.6', 'A2.1'], 'C1.8': ['C1.7', 'C1.2', 'T.3'], 'C1.9': ['C1.7'],
    'C1.10': ['C1.9'], 'C1.11': ['C1.4', 'A1.5'], 'C1.12': ['C1.5', 'A1.11'], 'C1.13': ['C1.12'],
    'C1.14': ['C1.3', 'C1.4'], 'C1.15': ['C1.4', 'C1.1'], 'C1.16': ['C1.5'], 'C1.17': ['C1.16', 'A2.11'],
    'C1.18': ['C1.17', 'C1.14'], 'C1.19': ['C1.18', 'C1.7'], 'C1.20': ['C1.11', 'A1.11'],
    'C2.1': ['C1.19', 'C1.6'], 'C2.2': ['C1.19', 'T.4'], 'C2.3': ['C1.19', 'A2.4'], 'C2.4': ['C1.18'],
    'C2.5': ['C1.18'], 'C2.6': ['C2.5', 'G.12'], 'C2.7': ['C1.18', 'G.3'], 'C2.8': ['C1.18'], 'C2.9': ['C1.1'],
    'C2.10': ['C2.9', 'A2.10'], 'C2.11': ['C2.10'], 'C2.12': ['C2.11'], 'C2.13': ['C2.12', 'C1.8'],
    'C2.14': ['C1.7'], 'C2.15': ['C2.5', 'T.11'], 'C2.16': ['C1.19', 'A2.6'], 'C2.17': ['C2.16', 'C1.11'],
    'C2.18': ['C1.17'],
    // Multivariable & vector calculus
    'V.1': ['C1.4'], 'V.2': ['V.1', 'T.12'], 'V.3': ['V.1', 'C1.7'], 'V.4': ['V.1', 'LA.4'],
    'V.5': ['V.1', 'C1.12', 'LA.11'], 'V.6': ['C1.18'], 'V.7': ['V.6', 'V.4', 'T.11'], 'V.8': ['V.6'],
    'V.9': ['V.8', 'V.2'], 'V.10': ['V.1'], 'V.11': ['V.8', 'V.10'], 'V.12': ['V.10', 'V.6'],
    'V.13': ['V.10', 'V.11'], 'V.14': ['V.10', 'V.5'],
    // Linear algebra
    'LA.2': ['LA.1'], 'LA.3': ['LA.2'], 'LA.4': ['LA.1', 'A2.13'], 'LA.5': ['A1.8', 'A2.13'],
    'LA.6': ['LA.5', 'LA.2'], 'LA.7': ['LA.6', 'T.12'], 'LA.8': ['LA.7'], 'LA.9': ['LA.4', 'A2.14'],
    'LA.10': ['LA.9'], 'LA.11': ['LA.9', 'LA.7'], 'LA.12': ['LA.11'], 'LA.13': ['LA.12'], 'LA.14': ['A2.13'],
    'LA.15': ['LA.14'], 'LA.16': ['LA.14'], 'LA.17': ['LA.14', 'V.1'], 'LA.18': ['LA.12', 'A2.14'],
    // Statistics & probability
    'S.2': ['S.1'], 'S.3': ['S.1'], 'S.4': ['S.2'], 'S.6': ['S.5'], 'S.7': ['S.6'], 'S.8': ['S.5'],
    'S.9': ['S.5'], 'S.10': ['S.9', 'S.8', 'A2.12'], 'S.11': ['S.10', 'C1.2'], 'S.12': ['S.4', 'S.9'],
    'S.13': ['S.12'], 'S.14': ['S.13'], 'S.15': ['S.14'], 'S.16': ['S.15'], 'S.17': ['S.15'], 'S.18': ['S.2'],
    'S.19': ['S.18', 'A1.5', 'LA.7'], 'S.20': ['S.9', 'C1.18'], 'S.21': ['S.9', 'C1.12'],
    // Functions & distributions
    'F.1': ['A1.5'], 'F.2': ['A1.12'], 'F.3': ['A1.9'], 'F.4': ['A1.7'], 'F.5': ['A1.3'], 'F.6': ['A2.5'],
    'F.7': ['A2.6'], 'F.8': ['A2.6'], 'F.9': ['A2.7'], 'F.10': ['T.9'], 'F.11': ['T.9'], 'F.12': ['T.9'],
    'F.13': ['F.12', 'T.10'], 'F.14': ['F.7'], 'F.15': ['F.14'], 'F.16': ['F.1'], 'F.17': ['F.8', 'S.12'],
    'D.1': ['S.9'], 'D.2': ['D.1', 'S.10'], 'D.3': ['D.1'], 'D.4': ['D.2', 'S.11'], 'D.5': ['S.20'],
    'D.6': ['F.17', 'S.12'], 'D.7': ['D.6', 'S.16'], 'D.8': ['D.4', 'S.20'], 'D.9': ['D.8'], 'D.10': ['D.5'],
    'D.11': ['D.6', 'S.17'], 'D.12': ['D.6', 'F.9'], 'D.13': ['F.6'],
    // Machine learning
    'ML.2': ['ML.1'], 'ML.3': ['S.9', 'A2.7'], 'ML.4': ['ML.2'], 'ML.5': ['ML.4', 'LA.13'], 'ML.6': ['ML.4'],
    'ML.7': ['ML.2', 'F.14', 'S.21'], 'ML.8': ['ML.7'], 'ML.9': ['T.12'], 'ML.10': ['S.7'], 'ML.11': ['ML.3'],
    'ML.12': ['ML.11', 'ML.4'], 'ML.13': ['ML.2', 'O.11'], 'ML.14': ['ML.2', 'V.3'], 'ML.15': ['ML.3', 'ML.7'],
    'ML.16': ['ML.14', 'C1.13'], 'ML.17': ['ML.9'], 'ML.18': ['ML.17'], 'ML.19': ['LA.12', 'S.18'],
    'ML.20': ['ML.17', 'S.21', 'D.6'], 'ML.21': ['ML.8'], 'ML.22': ['ML.2'], 'ML.23': ['ML.21', 'ML.22'],
    // Algorithms
    'AL.1': ['S.19'], 'AL.2': ['ML.7'], 'AL.3': ['AL.1', 'ML.5'], 'AL.4': ['ML.9'], 'AL.5': ['ML.10'],
    'AL.6': ['ML.11'], 'AL.7': ['AL.6', 'ML.12'], 'AL.8': ['AL.6', 'ML.12'], 'AL.9': ['ML.13'],
    'AL.10': ['ML.14'], 'AL.11': ['AL.10'], 'AL.12': ['AL.10'], 'AL.13': ['AL.10'], 'AL.14': ['ML.17'],
    'AL.15': ['ML.9'], 'AL.16': ['ML.18'], 'AL.17': ['ML.20'], 'AL.18': ['ML.19'], 'AL.19': ['AL.18'],
    'AL.20': ['AL.6'], 'AL.21': ['AL.10', 'AL.18'], 'AL.22': ['S.6'], 'AL.23': ['LA.12'], 'AL.24': ['S.21'],
    'AL.26': ['O.12'], 'AL.27': ['AL.14', 'LA.9'], 'AL.28': ['AL.10'],
    // Optimization & simulation
    'O.2': ['O.1', 'A1.15'], 'O.3': ['O.2', 'LA.5'], 'O.4': ['O.2'], 'O.5': ['O.4'], 'O.6': ['O.4'],
    'O.7': ['O.2'], 'O.8': ['O.1'], 'O.9': ['O.8', 'C1.20', 'V.5'], 'O.10': ['O.1', 'V.2'], 'O.11': ['O.10', 'O.8'],
    'O.12': ['O.7'], 'O.13': ['O.6'], 'O.14': ['S.13', 'C1.17'], 'O.15': ['S.9'], 'O.16': ['O.15', 'O.14'],
    // Finance
    'FN.1': ['FT.1', 'A2.6'], 'FN.2': ['FN.1'], 'FN.3': ['FN.1', 'A2.8'], 'FN.4': ['FN.1'], 'FN.5': ['FN.4'],
    'FN.6': ['FN.4', 'A2.10'], 'FN.7': ['FN.6'], 'FN.8': ['FN.2'], 'FN.9': ['FN.1', 'A2.7'],
    'FN.10': ['FN.9', 'S.2'], 'FN.11': ['FN.10', 'S.18'], 'FN.12': ['FN.10'], 'FN.13': ['FN.11', 'S.19'],
    'FN.14': ['FN.4'], 'FN.15': ['FN.14', 'C1.4'], 'FN.16': ['FN.4'], 'FN.17': ['FT.3'],
    'FN.18': ['FN.17', 'FN.22', 'S.12'], 'FN.19': ['FN.10', 'S.12'], 'FN.21': ['S.9'], 'FN.22': ['FN.9', 'C2.16'],
    'FT.13': ['FN.14'], 'FT.18': ['FN.10'], 'FT.19': ['FN.18'], 'FT.10': ['FT.12'],
    // Physics
    'P.2': ['P.1', 'C1.4'], 'P.3': ['P.2'], 'P.4': ['P.3'], 'P.5': ['P.3'], 'P.6': ['P.3', 'T.2'],
    'P.7': ['P.3', 'T.9'], 'P.8': ['P.3'], 'P.9': ['P.8'], 'P.10': ['P.9'], 'P.11': ['P.10', 'P.3'],
    'P.12': ['P.1'], 'P.13': ['P.12'], 'P.14': ['P.12'], 'P.15': ['P.13', 'P.14'], 'P.16': ['P.14', 'P.10'],
    'P.17': ['P.12'], 'P.18': ['P.12'], 'P.19': ['P.13', 'V.14'], 'P.20': ['P.1'],
    // Electrical engineering
    'EE.1': ['P.20'], 'EE.2': ['EE.1'], 'EE.3': ['EE.2'], 'EE.4': ['EE.3'], 'EE.5': ['EE.2', 'LA.5'],
    'EE.6': ['EE.1'], 'EE.7': ['EE.6', 'C2.16'], 'EE.8': ['EE.1', 'T.9'], 'EE.9': ['EE.8', 'T.13'],
    'EE.10': ['EE.9'], 'EE.11': ['EE.9', 'EE.6'], 'EE.12': ['EE.11', 'EE.19'], 'EE.13': ['EE.2'],
    'EE.14': ['EE.1'], 'EE.15': ['EE.10'], 'EE.16': ['EE.1', 'V.10'], 'EE.18': ['EE.8'], 'EE.19': ['A2.7'],
    'EE.20': ['EE.18', 'T.13'], 'EE.21': ['EE.1'],
    'EE.22': ['SY.1', 'SY.3', 'SY.5', 'SY.8'], 'EE.23': ['SY.11', 'SY.12', 'SY.15', 'SY.14'],
    'EE.24': ['SY.18', 'SY.21', 'SY.23'], 'EE.25': ['SY.24', 'SY.25', 'SY.26'],
    'SY.2': ['SY.1'], 'SY.4': ['SY.3'], 'SY.19': ['SY.18'], 'SY.20': ['SY.18'], 'SY.22': ['SY.21'],
    'SY.27': ['SY.24', 'SY.26'], 'SY.28': ['SY.24', 'SY.25'],
    'ET.6': ['EE.9'], 'ET.7': ['ET.6'], 'ET.8': ['EE.1'], 'ET.13': ['ET.17'], 'ET.15': ['ET.14', 'SY.22'],
    'ET.12': ['EE.18'], 'ET.18': ['EE.20'], 'ET.16': ['SY.7'], 'ET.20': ['EE.1'],
    // Acronyms
    'AC.3': ['AC.2'], 'AC.4': ['AC.2'], 'AC.9': ['AC.7'], 'AC.22': ['AC.8'], 'AC.23': ['AC.7'],
    'AC.10': ['ML.14'], 'AC.16': ['LA.12'], 'AC.15': ['AC.16'],
  };
})(window.Site = window.Site || {});
