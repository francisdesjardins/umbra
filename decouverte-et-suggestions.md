# Découvertes et suggestions

Notes d'une passe sur le cœur de la bibliothèque (2026-08-23), gardées dans la branche plutôt que
dans un fil de conversation. Deux parties : ce qui a été trouvé **et corrigé** dans cette branche,
et ce qui reste **adressable** — chaque point avec son constat, son coût et une recommandation.

Sans accents dans le nom du fichier : git transporte l'UTF-8 sans problème, mais macOS normalise en
NFD et Windows s'en méfie, et un fichier qui change de nom selon la machine est un fichier que les
outils perdent.

Le fond de la conclusion : **le cœur ne manque d'aucun sous-système.** Ce qui a été trouvé, ce sont
des asymétries — un principe implémenté sur un chemin et pas sur ses frères. C'est un compliment
plutôt qu'un constat d'échec : sur une base moins soignée, la liste aurait parlé de fonctionnalités
absentes.

---

## Partie 1 — Corrigé dans cette branche

Quatre commits, un par constat. Détail complet dans le [CHANGELOG](CHANGELOG.md) à la date du jour.

| #   | Constat                                                                                                                                                                                                                                                                               | Commit                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | `onDismissRequest` ne répondait que pour la touche. Les trois chemins pointeur (`attachClickOutside` + le clic sur backdrop des trois bindings) appelaient `store.close` eux-mêmes, donc une surface contrôlée répondait correctement à Échap et se rouvrait au clic sur le backdrop. | `fix(core): route every dismissal through onDismissRequest`                          |
| 2   | Le registre typait le retour et laissait l'argument à `unknown` — dans le même appel. `ModalContract.payload` + `PayloadOf<TId>`.                                                                                                                                                     | `feat(core): a modal's contract declares the payload it opens with`                  |
| 3   | `open(id)` sur un identifiant non enregistré ne faisait rien, en silence. Il répond maintenant, et `subscribe` porte `register` / `unregister`.                                                                                                                                       | `feat(manager): register/unregister events, and an open that says whether it landed` |
| 4   | `portal: true` était `document.body`, en dur. `PortalTarget` accepte un getter.                                                                                                                                                                                                       | `feat(core): portal can name its host, not only document.body`                       |

Le point commun des quatre : **une décision qui existait à un seul endroit et qui devait exister à
tous.** Le cas le plus net est le premier — `canDismiss` était déjà « le prédicat que tout chemin de
fermeture partage », mais la _dernière étape_, celle que l'option remplace, vivait en privé dans
`attach-keydown.ts` et n'était atteignable que par les trois écouteurs de ce fichier.

---

## Partie 2 — Adressable

Classé par ce que ça coûte de ne rien faire, pas par difficulté.

### 2.1 Le budget documentaire est à zéro de marge — **résolu sur `main`**

Le constat était juste : `13 499 / 13 500`, et le test échouait au mot suivant. `main` a fait la
passe de taille recommandée, en plus grand — **12 149 mots**, environ 10 % de marge sur le total et
aucun fichier au-dessus de 87 % du sien. La norme est écrite dans `doc-budget.test.ts` et dans les
premières lignes du `CLAUDE.md` racine : viser 90 %, et dépenser la marge à écrire plutôt qu'à
faire tenir.

### 2.2 `onOpenRequest` reçoit encore `unknown` — la moitié réceptrice du point 2

`PayloadOf` type le côté **demandeur**. Le côté **receveur** ne narrowe pas, et c'est écrit comme une
décision dans le JSDoc et la matrice : c'est là qu'arrive un message venu d'ailleurs, et un paramètre
annoté d'une déclaration que personne ne vérifie à l'exécution se lit comme une garantie jamais
donnée.

L'argument tient. Mais il tient **moins bien pour un identifiant déclaré**, où les deux extrémités
appartiennent au projet — et `DataOf` est déjà cru côté réception sans que personne n'appelle ça
malhonnête.

**Ce que ça coûte de le fermer** : un cinquième paramètre de type sur `UseModalBaseOptions`, filé à
travers `templates/shared.ts`, `react/types.ts`, `solid/types.ts`, `vanilla/types.ts`, les quatre
types d'options de template et les surcharges enregistrées des trois bindings — une vingtaine de
déclarations, mécaniques, toutes attrapées par `type-check`.

**Le raccourci ne marche pas**, et ça vaut d'être noté pour que personne ne le retente : intersecter
la surcharge enregistrée avec un `onOpenRequest` plus étroit échoue sous `strictFunctionTypes`
(paramètre contravariant), et `Omit<UseModalOptions, 'onOpenRequest'>` aplatit l'union `ModalVariant`
et détruit l'exclusion mutuelle que `type-model.test.ts` épingle.

**Recommandation** — à faire si l'on veut la boucle fermée, en un commit dédié. Sinon, laisser tel
quel : l'état actuel est cohérent et documenté, pas un oubli.

### 2.3 Le bouton retour n'a pas de décision écrite — **porté dans la matrice**

Aucun `popstate`, aucun `history` dans `src/` ni dans le playground. Ce n'est probablement pas un
manque — la navigation appartient à l'application — mais **c'est le seul refus de la bibliothèque qui
n'est pas enregistré**. Les minuteries, les live regions, `aria-modal`, l'UI : tous ont leur ligne
dans la matrice avec leur `why`. Celui-ci n'a rien.

Par la règle du dépôt, c'est ça le défaut : un fait de compatibilité qui n'est nulle part est un fait
que la prochaine personne redécouvre.

**Fait** — `PLATFORM_ROWS` porte maintenant « the browser back button closes the front dialog » en
`no-by-design`, avec son `why` : la navigation appartient à l'application, et le câblage est
`push` à l'ouverture + `subscribe` + `dialogManager.close(id)` depuis son `popstate`.

### 2.4 Un identifiant = une instance — **porté dans la matrice**

`register` remplace l'entrée précédente et prévient (`Duplicate modal id`). Donc pas de N instances
d'un même modal — une confirmation par ligne de tableau, par exemple, demande N identifiants.

C'est cohérent avec un registre à clé chaîne et la ligne `id` de la matrice le dit
(« last-registration-wins »). Mais la matrice le formule comme une **conséquence**, pas comme une
limite que quelqu'un pourrait vouloir contourner.

**Fait** — la ligne `id` dit maintenant qu'un identifiant est une instance, qu'une confirmation par
ligne de tableau demande donc N identifiants dérivés de la clé de la ligne, et que la registration
déplacée est désormais rapportée par un `unregister` pour qu'un compteur d'arrivées reste juste.

### 2.5 Pas d'opération en masse

Pas de `closeAll()`, pas de `closeAllExcept(id)`. Un changement de route qui doit tout refermer
itère `lookup().getOpen()` et appelle `close` sur chacun.

Faisable en trois lignes, donc pas urgent. Mais c'est exactement la forme « écrit deux fois dans deux
projets » que le dépôt utilise comme test d'appartenance au cœur.

**Recommandation** — à trancher quand un deuxième consommateur l'écrit, pas avant. Noté ici pour que
le deuxième soit reconnu comme le deuxième.

### 2.6 Rien ne démontre encore les nouvelles surfaces

`open()` renvoie maintenant un booléen, `subscribe` porte deux événements de plus, `portal` accepte un
getter, `ModalContract` a un troisième champ — et le playground n'en montre aucun. La règle du
playground est claire là-dessus : un exemple non placé sur une page n'existe pas pour le lecteur.

**Recommandation** — deux cartes, pas plus : l'ouverture différée sur `/imperative` (elle rend le
problème du code-split visible), et le payload déclaré sur `/microfrontends` (`modal-registry.ts` y
déclare déjà 38 modals, aucun avec `payload` — la démo microfrontend est l'endroit où le champ a un
sens). L'hôte de portal a déjà sa story dans `/stories`.

---

## Partie 3 — Décisions prises, à rouvrir seulement avec un argument

Ce ne sont pas des tâches. Elles sont ici pour qu'on ne les redécouvre pas comme des oublis.

- **Aucune file d'attente d'ouverture.** Une ouverture retenue a besoin d'une expiration, et combien
  de temps un lien profond doit attendre une route est la question de l'application — la même raison
  qui fait que rien ici ne se ferme tout seul. Les événements rendent la version de dix lignes
  écrivable, et un test l'écrit.
- **`umbra/vanilla` garde `portal: boolean`.** Ce binding ne déplace jamais l'élément ; accepter un
  hôte qu'il ne pourrait qu'ignorer est précisément l'option silencieusement perdue que le typage
  existe pour empêcher.
- **La valeur de retour de `onDismissRequest` ne compte que pour la touche.** Rien n'est _prevented_
  sur un chemin pointeur, donc un clic refusé est simplement un dialogue laissé ouvert.
- **`requestOpen` est une signature générique unique, pas une paire de surcharges.** Une première
  surcharge qui échoue retombe sur la permissive : la vérification s'évaporerait exactement quand elle
  a tort. `requestOpenAndWait` garde sa paire pour le _retour_ et contraint le payload dans les deux
  moitiés — il y a une fixture pour ça, parce que c'est la seule façon dont ce point aurait pu être
  décoratif.

---

## Partie 4 — Environnement, pas bibliothèque

À enregistrer parce que ça mordra chaque session Claude Code sur le web, et que ça a failli me faire
rapporter trois faux échecs comme des faits.

**Constat.** `cdn.playwright.dev` est bloqué par la politique réseau de l'environnement
(`CONNECT tunnel failed, 403`), donc `yarn playwright install` échoue. Le conteneur fournit Chromium
build **1194** ; `@playwright/test` 1.62.1 en veut **1234**. Trois tests de visibilité du focus
échouent sur ce décalage — et ils échouent aussi sur `origin/main` sans aucune modification, ce que
j'ai vérifié en remisant tout le travail avant de l'affirmer.

**La CI, elle, est verte**, et pour la bonne raison : `ci.yml` exécute le job composant _dans_
`mcr.microsoft.com/playwright:v${version}-noble`, où le navigateur correspond par construction. Aucune
contradiction entre les deux, mais la formulation « échecs préexistants » est trompeuse et je l'ai
employée — ces échecs n'existent que face au mauvais binaire.

**Docker n'est pas la sortie ici** : le CLI est installé, le daemon non (pas de
`/var/run/docker.sock`). Je tourne déjà dans un conteneur, donc pas d'imbrication ni de conteneur
frère. En CI c'est GitHub qui démarre l'image _autour_ du job ; ici il n'y a personne pour le faire.

**Ce qui marche, mesuré.** `storage.googleapis.com` est autorisé et héberge exactement le build voulu :

```
storage.googleapis.com/chrome-for-testing-public/151.0.7922.34/linux64/chrome-linux64.zip → 200
```

Téléchargé et pointé par `executablePath`, la suite complète passe **377 / 377**.

**Recommandations, par ordre de coût :**

1. Autoriser `cdn.playwright.dev` dans la politique réseau de l'environnement — voir la
   [doc](https://code.claude.com/docs/en/claude-code-on-the-web). `yarn playwright install` redevient
   la réponse normale.
2. Un hook `SessionStart` qui installe le navigateur au démarrage du conteneur. Dépend de (1), sauf à
   passer par l'URL Chrome for Testing ci-dessus, qui elle passe déjà.
3. **Ne pas** épingler `@playwright/test` sur le build du conteneur : ce serait faire porter au projet
   un défaut du bac à sable, et la CI n'en a pas besoin.

---

## Ce qui n'est pas dans ce document

Le retard déclaré existant — dix cellules ouvertes dans la matrice de compatibilité. Il est généré
depuis les mêmes données que `API.md` et se lit avec **`yarn todo`**. Le recopier ici créerait la
deuxième source de vérité que la matrice a été écrite pour supprimer.
