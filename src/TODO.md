## STEPS

1. rebase on origin/master
2. typer les fonctions de formattage pour qu'on puisse différencier ce qui retourne un format de ce qui retourne une valeur formattée.
3. Généraliser condition qui force a passer en format scientifique
   ```
    if (
       10 ** STANDARD_MAX_SIGNIFICANT_DIGITS > n &&
       n >= 1 / 10 ** (STANDARD_MAX_SIGNIFICANT_DIGITS - 1)
   ) {
   ```
   devient une fonction d'appel.
4. Généraliser 1 seule fonction qui applique un format `applyFormat` (formatComposerNumber fait 2 choses
   en même temps et c'est pas hyper clair, ca serait mieux s'il avait une API semblabe a defaultFormatNumber)
5. Est-ce qu'on peut parser les formats pour gagner du temps
6. Ajouter une notion de maximum (< Infinity sinon ça crash). Si infinity : (x) => cell is TextCell.

## HOW TO

new branch
=> commit de typage
=> rebase
