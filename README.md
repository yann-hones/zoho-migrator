# Zoho Drive to SharePoint Migrator

Une interface web complète pour transférer des fichiers de Zoho Drive vers SharePoint de manière simple et efficace.

## Fonctionnalités

- **Interface utilisateur intuitive** : Interface React moderne et responsive
- **Navigation des fichiers** : Parcourez et sélectionnez les fichiers Zoho Drive
- **Transfert par lot** : Transférez plusieurs fichiers simultanément
- **Suivi de progression** : Barre de progression en temps réel
- **Gestion des dossiers** : Spécifiez le dossier de destination dans SharePoint
- **Support des gros fichiers** : Upload progressif pour les fichiers > 4MB

## Architecture

### Backend (Node.js/TypeScript/Express)
- **API REST** pour les opérations sur Zoho Drive et SharePoint
- **Services d'intégration** pour Zoho Drive et Microsoft Graph API
- **Service de transfert** avec gestion des erreurs et logs

### Frontend (React/TypeScript/Vite)
- **Interface moderne** avec design gradient
- **Sélection multiple** de fichiers
- **Feedback visuel** en temps réel
- **Gestion d'état** pour les transferts

## Prérequis

- Node.js 18+ et npm
- Compte Zoho Drive avec accès API
- Compte Microsoft 365 avec accès SharePoint

## Configuration

### 1. Zoho Drive API

1. Créez une application sur [Zoho API Console](https://api-console.zoho.com/)
2. Générez un Refresh Token avec les scopes:
   - `WorkDrive.files.READ`
   - `WorkDrive.files.CREATE`
3. Notez votre `Client ID`, `Client Secret`, et `Refresh Token`

### 2. SharePoint API (Microsoft Graph)

1. Enregistrez une application sur [Azure Portal](https://portal.azure.com/)
2. Configurez les permissions API:
   - `Sites.ReadWrite.All`
   - `Files.ReadWrite.All`
3. Créez un Client Secret
4. Notez votre `Tenant ID`, `Client ID`, et `Client Secret`

### 3. Variables d'environnement

Copiez `.env.example` vers `.env` et remplissez les valeurs:

```bash
cp .env.example .env
```

Editez `.env` avec vos credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Zoho Drive Configuration
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
ZOHO_API_DOMAIN=https://www.zohoapis.com

# SharePoint Configuration
SHAREPOINT_TENANT_ID=your_tenant_id
SHAREPOINT_CLIENT_ID=your_client_id
SHAREPOINT_CLIENT_SECRET=your_client_secret
SHAREPOINT_SITE_URL=https://yourtenant.sharepoint.com/sites/yoursite
```

## Installation

### Installation des dépendances

```bash
# Installer les dépendances du backend
npm install

# Installer les dépendances du frontend
cd client
npm install
cd ..
```

## Utilisation

### Développement

Lancez le serveur backend et le frontend simultanément:

```bash
npm run dev
```

Ou lancez-les séparément:

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

L'application sera accessible sur:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

### Production

```bash
# Build
npm run build

# Démarrer le serveur
npm start
```

## API Endpoints

### Zoho Drive

- `GET /api/zoho/files/:folderId?` - Liste les fichiers
- `GET /api/zoho/folders/:parentId?` - Liste les dossiers
- `GET /api/zoho/file/:fileId` - Détails d'un fichier
- `GET /api/zoho/download/:fileId` - Télécharge un fichier

### SharePoint

- `GET /api/sharepoint/files/*` - Liste les fichiers
- `POST /api/sharepoint/folder` - Crée un dossier

### Transfert

- `POST /api/transfer/file` - Transfère un fichier
- `POST /api/transfer/batch` - Transfère plusieurs fichiers
- `POST /api/transfer/folder` - Transfère un dossier complet
- `GET /api/transfer/status/:transferId` - Statut du transfert

## Structure du projet

```
zoho-migrator/
├── src/
│   └── server/
│       ├── index.ts              # Point d'entrée du serveur
│       ├── routes/
│       │   ├── zoho.ts          # Routes Zoho Drive
│       │   ├── sharepoint.ts    # Routes SharePoint
│       │   └── transfer.ts      # Routes de transfert
│       └── services/
│           ├── zoho.service.ts      # Service Zoho Drive
│           ├── sharepoint.service.ts # Service SharePoint
│           └── transfer.service.ts   # Service de transfert
├── client/
│   ├── src/
│   │   ├── App.tsx              # Composant principal
│   │   ├── main.tsx             # Point d'entrée React
│   │   ├── index.css            # Styles globaux
│   │   └── services/
│   │       └── api.ts           # Client API
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Sécurité

- Ne commitez jamais le fichier `.env` avec vos credentials
- Utilisez HTTPS en production
- Limitez les permissions des applications API au minimum nécessaire
- Validez toujours les entrées utilisateur
- Implémentez une authentification pour l'interface web en production

## Limitations

- Taille maximale de fichier: 50MB (configurable)
- Les transferts sont synchrones (futures versions supporteront l'asynchrone)
- Nécessite des credentials API valides pour fonctionner

## Dépannage

### Erreur d'authentification Zoho
- Vérifiez que votre Refresh Token est valide
- Assurez-vous que les scopes sont corrects
- Régénérez un nouveau Refresh Token si nécessaire

### Erreur d'authentification SharePoint
- Vérifiez les permissions de l'application Azure AD
- Assurez-vous que le Client Secret n'est pas expiré
- Vérifiez que l'URL du site SharePoint est correcte

### Fichiers non transférés
- Vérifiez les logs du serveur pour les erreurs détaillées
- Assurez-vous que vous avez les permissions nécessaires
- Vérifiez que les fichiers ne dépassent pas la taille maximale

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## Licence

MIT

## Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
