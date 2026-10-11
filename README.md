# EV Trip

Application mobile en français pour préparer un voyage électrique : écran unique, carte interactive, chronologie synchronisée, exclusion de stations, vue compacte, enregistrement local et export PNG complet. Interface claire et sombre, adaptée à l’iPhone.

## Démarrer

Node.js 22 ou supérieur (24 recommandé).

```sh
npm ci
npm run dev
```

Ouvrir le port 3000 sur votre ordinateur. Pour un serveur de production : `npm run build`, puis `npm start`. Les étapes de validation sont `npm test`, `npm run typecheck` et `npm run test:e2e` (après `npx playwright install chromium`). La CI teste aussi la compilation et le parcours mobile.

## Accéder à l’application

### Vercel — recommandé

1. Connecter votre compte GitHub à [Vercel](https://vercel.com/new).
2. Importer `mathieubaumlin/evtrip`, framework **Next.js** ; conserver les commandes par défaut.
3. Déployer. Vercel fournira l’adresse HTTPS de l’application ; vous pouvez ajouter votre propre domaine.
4. Sur iPhone, ouvrir cette adresse dans Safari, puis **Partager → Sur l’écran d’accueil**. L’application s’ouvre alors dans une fenêtre autonome.

Pas de clé API nécessaire pour la version initiale. Le dépôt GitHub héberge le code ; il ne crée pas automatiquement une application publique. GitHub Pages ne convient pas à cette version, car le calcul utilise une route serveur Next.js.

### Autres options

- **Netlify** : importer le dépôt comme application Next.js avec son adaptateur serveur ; vérifier le délai maximal des fonctions pour le mode réel.
- **Serveur Node/VPS** : `npm ci && npm run build && npm start`, derrière un reverse proxy HTTPS. Utiliser un gestionnaire de processus et Node 24.
- **Application native iOS ultérieure** : une adaptation Capacitor est possible, mais nécessite une configuration native, macOS/Xcode et un compte Apple pour la distribution App Store. Cette version est une application web installable.

## Deux modes, clairement séparés

- **Démonstration** : trajet fixe Sauverny → Nice, tracé et stations fictifs explicitement signalés. Le moteur recalcule réellement les batteries, les durées, les coûts et les arrêts à partir de ce jeu de démonstration. Les champs d’adresses sont désactivés dans ce mode.
- **Trajet réel, expérimental** : adresses géocodées par Photon, itinéraire routier OSRM, bornes issues d’OpenStreetMap via Overpass. Choisir ce mode dans « Modifier ». La première adresse retournée est affichée après le calcul : vérifier qu’elle correspond à votre intention.

Le moteur estime la consommation avec une valeur constante par véhicule et une courbe de recharge simplifiée. Il choisit des bornes CCS d’au moins 40 kW dont la puissance est renseignée, à moins de 8 km à vol d’oiseau du trajet. Il maintient une réserve minimale et recalcule les arrêts après exclusion. Les détours sont approximatifs (distance à vol d’oiseau, vitesse supposée de 40 km/h) et ne sont pas intégrés au tracé routier principal. Le service refuse les trajets de plus de 1 500 km. Une absence de borne compatible atteignable produit une erreur explicite, jamais des bornes inventées en mode réel.

**Limites à connaître avant un voyage** : données OSM potentiellement incomplètes ou anciennes ; disponibilité inconnue, tarifs saisis par l’utilisateur, capacité/consommation des véhicules indicatives ; pas de météo, relief, trafic, préconditionnement, attente aux bornes ou frais de session. Vérifier la compatibilité, l’accès et l’état de chaque borne dans l’application de son opérateur. Le coût affiché est celui des recharges en route, hors énergie initiale et péages. Le moteur est un outil de préparation expérimental, pas une garantie d’autonomie ni un système de navigation.

Les services publics gratuits n’ont pas de garantie de disponibilité et ne conviennent pas à un volume commercial. Pour un lancement public, ajouter une limitation des requêtes et migrer vers des services autorisant votre volume : géocodage/routage sous contrat ou auto-hébergés, fournisseur de bornes avec disponibilités et tarifs, modèles de véhicules et courbes fiables. Les URL serveur peuvent être configurées avec les variables de `.env.example` (endpoints compatibles Photon, OSRM et Overpass). Ne jamais exposer de clé secrète via `NEXT_PUBLIC_`.

## Partage et confidentialité

Le bouton « Partager mon trajet » génère un PNG de 880 pixels de large avec toutes les étapes, indépendamment du défilement. Le schéma vectoriel exporté évite les problèmes d’export des tuiles de carte. Sur les navigateurs compatibles, l’image est envoyée à la feuille de partage native. Safari peut exiger une seconde pression sur « Partager le PNG » après génération pour conserver l’autorisation d’ouverture du partage ; le téléchargement reste disponible. À vérifier sur un iPhone physique avant une publication commerciale.

Pas de compte ni de collecte GPS. Le dernier trajet sauvegardé reste dans le stockage local de l’appareil. En mode réel, les adresses sont transmises à Photon et les coordonnées à OSRM/Overpass ; les tuiles proviennent d’OpenStreetMap. Le PNG contient les lieux saisis et les informations du voyage, aucun secret ni position GPS collectée. Avant de partager, vérifier les lieux personnels présents dans le récapitulatif. L’installation sur l’écran d’accueil ne garantit pas le fonctionnement hors ligne : aucun cache de trajet hors ligne n’est implémenté.

## Stack

Next.js App Router, React, TypeScript, CSS responsive, MapLibre GL, Lucide et html-to-image. Vitest pour les invariants du moteur ; Playwright pour le parcours mobile et l’export. Aucun service de base de données nécessaire pour cette première version.
