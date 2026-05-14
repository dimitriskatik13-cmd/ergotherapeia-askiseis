# ΣΥΝΟΙΔΑ · Εργοθεραπευτικές Ασκήσεις

Στατική web εφαρμογή για εργοθεραπευτές. Βιβλιοθήκη εκτυπώσιμων ασκήσεων προγραφικής ετοιμότητας, οργανωμένων σε 10 ενότητες με βαθμιαία πρόοδο.

## Πώς δουλεύει

- **12 procedural generators** παράγουν SVG ασκήσεις on-the-fly με δικό μας αλγόριθμο (mulberry32 seeded PRNG).
- **51+ "recipes"** ορίζουν παραμέτρους ασκήσεων (generator, params, ηλικία, επίπεδο, οδηγία, στόχος).
- Κάθε άσκηση παράγει **άπειρες μοναδικές παραλλαγές** μέσω αλλαγής seed.
- **Εκτύπωση A4** μέσω `window.print()` + `@media print` — vector quality, καμία dependency.
- **Hash-based routing**, lazy-loaded recipes, in-memory search/filter index. GitHub Pages compatible.

## Τοπική ανάπτυξη

```bash
python3 -m http.server 8000
# άνοιξε http://localhost:8000
```

Δεν υπάρχει build step. Καμία dependency εκτός του Inter font από Google Fonts (CDN).

## Deployment (GitHub Pages)

1. Push σε νέο repo `ergotherapeia-askiseis`.
2. Settings → Pages → Deploy from branch → `main` / `/`.
3. Έτοιμο σε `https://<user>.github.io/ergotherapeia-askiseis/`.

## Σχετικά με τα πνευματικά δικαιώματα

Η εφαρμογή σχεδιάστηκε ως εργαλείο εργασίας για τους εργοθεραπευτές της ΣΥΝΟΙΔΑ.

**Όλο το περιεχόμενο της εφαρμογής είναι πρωτότυπο:**

- Οι αλγόριθμοι των generators γράφτηκαν εξ ολοκλήρου για αυτό το έργο.
- Τα γραφικά παράγονται προγραμματιστικά με τυχαία seeds — κάθε εκτύπωση είναι μοναδική.
- Οι ελληνικές οδηγίες, οι σημειώσεις θεραπευτή και οι στόχοι κάθε άσκησης είναι δικό μας copy.
- Η χρωματική παλέτα και η τυπογραφία ακολουθούν το brand της ΣΥΝΟΙΔΑ.

Η οργάνωση σε δέκα ενότητες (συντονισμός χεριού-ματιού → αναγνώριση φόρμας → γραμμικός έλεγχος → προσανατολισμός → χωρική οργάνωση → σύνθετη ιχνηλάτηση) ακολουθεί τη γενική μεθοδολογική κατεύθυνση που έχει διατυπωθεί στη βιβλιογραφία της αναπτυξιακής εργοθεραπείας — μεταξύ άλλων από τους Teodorescu & Addy στην προσέγγιση "Perceptuo-Motor". Αυτές οι κατηγορίες ασκήσεων (dotting, dot-to-dot, mazes, mirror drawing, pattern copying) αποτελούν κοινό τόπο της πρακτικής εργοθεραπείας και προϋπάρχουν συγκεκριμένων εκδόσεων.

**Καμία σελίδα, εικόνα ή κείμενο από τις εμπορικές εκδόσεις των ανωτέρω συγγραφέων ή από τον εκδοτικό οίκο LDA δεν αναπαράγεται εδώ.** Η εφαρμογή δεν αποτελεί παράγωγο έργο τους και δεν τις αντικαθιστά. Συνιστάται η χρήση της παράλληλα με τα αυθεντικά υλικά, όχι αντί αυτών.

## Σημείωση χρήσης

Οι ασκήσεις σχεδιάστηκαν ως υποστηρικτικό υλικό. Η επιλογή, η προσαρμογή και η αξιολόγηση πραγματοποιούνται πάντα από αδειούχο εργοθεραπευτή με βάση τις εξατομικευμένες ανάγκες του παιδιού.

## Δομή

```
ergotherapeia-askiseis/
├── index.html
├── css/             # base, components, views, print
├── js/
│   ├── main.js      # bootstrap & routes
│   ├── router.js    # hash router
│   ├── state.js     # localStorage favorites/recents
│   ├── i18n.js      # Greek normalization
│   ├── views/       # home, booklet, exercise, print, search, favorites, about
│   ├── components/  # exerciseCard
│   ├── generators/  # 12 SVG generators + registry + lib
│   └── data/        # booklets, skills, recipes/ (10 files)
└── assets/
```

## Έλεγχος εκτύπωσης

Στο dialog εκτύπωσης του browser:
- **Margins → None**
- **Background graphics → On**

Αλλιώς δεν τυπώνονται οι χρωματιστές λωρίδες του brand.

## ΣΥΝΟΙΔΑ

Κέντρα Ειδικών Θεραπειών — Αρτέμιδα · Σπάτα · Νέα Μάκρη · Μαραθώνας

[www.synoida.gr](https://www.synoida.gr) · [info@synoida.gr](mailto:info@synoida.gr)
