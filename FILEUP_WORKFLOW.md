# Workflow FileUp pour l'Admin Dashboard

## Vue d'ensemble

Ce document explique comment utiliser les endpoints API pour créer et gérer des beats avec FileUp dans l'admin dashboard.

## Architecture

```
Admin Dashboard (Frontend)
    ↓
Backend API (NestJS)
    ↓
FileUp (stockage fichiers) + MongoDB (métadonnées)
```

### Données stockées

**MongoDB Beat:**
- `_id`, `artistId`, `title`, `bpm`, `key`, `genres`, `moods`
- `coverUrl` (downloadLink de FileUp)
- `status` (draft/published)
- `visibility` (public/unlisted)

**MongoDB Asset:**
- `_id`, `beatId`, `type` (preview/mp3/wav/stems/project)
- `storageKey` (downloadLink de FileUp)
- `durationSec`, `sizeBytes`

**FileUp:**
- Stocke les fichiers binaires (images, audio)
- Retourne un `downloadLink` permanent

## Workflow complet

### 1. Créer un beat (métadonnées uniquement)

**Endpoint:** `POST /beats`
**Auth:** Bearer token (admin ou seller)

```bash
curl -X POST https://beatmakerz-api.onrender.com/beats \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "artistId": "5138a8fa-def1-4330-b668-3efd949b8485",
    "title": "Summer Vibes",
    "bpm": 140,
    "key": "F#m",
    "genres": ["Trap", "Hip-Hop"],
    "moods": ["Energetic", "Dark"],
    "status": "draft",
    "visibility": "public"
  }'
```

**Réponse:**
```json
{
  "_id": "1263a760-ef4f-4160-b81d-e253394ld45b",
  "artistId": "5138a8fa-def1-4330-b668-3efd949b8485",
  "title": "Summer Vibes",
  "bpm": 140,
  "key": "F#m",
  "genres": ["Trap", "Hip-Hop"],
  "moods": ["Energetic", "Dark"],
  "coverUrl": null,
  "status": "draft",
  "visibility": "public",
  "createdAt": "2025-11-25T14:39:26.912Z"
}
```

### 2. Upload cover image

**Endpoint:** `POST /beats/:id/cover`
**Auth:** Bearer token (admin ou seller)

```bash
curl -X POST https://beatmakerz-api.onrender.com/beats/1263a760-ef4f-4160-b81d-e253394ld45b/cover \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/cover.jpg"
```

**Réponse:**
```json
{
  "coverUrl": "https://file-up.fr/d/abc123def456"
}
```

Le beat est automatiquement mis à jour avec `coverUrl`.

### 3. Upload preview audio

**Endpoint:** `POST /beats/:id/assets/preview`
**Auth:** Bearer token (admin ou seller)

```bash
curl -X POST https://beatmakerz-api.onrender.com/beats/1263a760-ef4f-4160-b81d-e253394ld45b/assets/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/preview.mp3" \
  -F "durationSec=45"
```

**Réponse:**
```json
{
  "_id": "asset-uuid-123",
  "beatId": "1263a760-ef4f-4160-b81d-e253394ld45b",
  "type": "preview",
  "storageKey": "https://file-up.fr/d/xyz789abc",
  "durationSec": 45,
  "sizeBytes": 1048576
}
```

### 4. Upload full tracks (MP3, WAV)

```bash
# MP3
curl -X POST https://beatmakerz-api.onrender.com/beats/1263a760-ef4f-4160-b81d-e253394ld45b/assets/mp3 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/full-track.mp3" \
  -F "durationSec=180"

# WAV
curl -X POST https://beatmakerz-api.onrender.com/beats/1263a760-ef4f-4160-b81d-e253394ld45b/assets/wav \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/full-track.wav" \
  -F "durationSec=180"
```

### 5. Upload stems (optionnel)

```bash
curl -X POST https://beatmakerz-api.onrender.com/beats/1263a760-ef4f-4160-b81d-e253394ld45b/assets/stems \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/stems.zip"
```

### 6. Publier le beat

**Endpoint:** `PUT /beats/:id`
**Auth:** Bearer token (admin ou seller)

```bash
curl -X PUT https://beatmakerz-api.onrender.com/beats/1263a760-ef4f-4160-b81d-e253394ld45b \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "published"
  }'
```

Le beat est maintenant visible publiquement sur `/beats` et dans le catalogue frontend.

## Endpoints disponibles

### Beats

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/beats` | ❌ | Liste publique des beats publiés |
| GET | `/beats/:id` | ❌ | Détail d'un beat publié |
| POST | `/beats` | ✅ Admin/Seller | Créer un beat |
| PUT | `/beats/:id` | ✅ Admin/Seller | Mettre à jour un beat |
| DELETE | `/beats/:id` | ✅ Admin | Supprimer un beat |
| POST | `/beats/:id/cover` | ✅ Admin/Seller | Upload cover image |
| POST | `/beats/:id/assets/:type` | ✅ Admin/Seller | Upload asset (preview/mp3/wav/stems/project) |

### Types d'assets disponibles

- `preview` - Extrait audio (30-60s)
- `mp3` - Fichier complet MP3
- `wav` - Fichier complet WAV (haute qualité)
- `stems` - Stems séparés (ZIP)
- `project` - Fichier projet DAW (optionnel)

## Frontend Dashboard

### Page "Ajouter un beat"

```typescript
// 1. Créer le beat
const createBeat = async (data: BeatFormData) => {
  const response = await AuthService.authenticatedFetch('/beats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      artistId: currentUser.artistId,
      title: data.title,
      bpm: data.bpm,
      key: data.key,
      genres: data.genres,
      moods: data.moods,
    }),
  });
  const beat = await response.json();
  return beat._id;
};

// 2. Upload cover
const uploadCover = async (beatId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await AuthService.authenticatedFetch(`/beats/${beatId}/cover`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

// 3. Upload preview
const uploadPreview = async (beatId: string, file: File, duration: number) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('durationSec', duration.toString());

  const response = await AuthService.authenticatedFetch(`/beats/${beatId}/assets/preview`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

// 4. Publier
const publishBeat = async (beatId: string) => {
  const response = await AuthService.authenticatedFetch(`/beats/${beatId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'published' }),
  });
  return response.json();
};
```

### Exemple de formulaire complet

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();

  try {
    // 1. Créer le beat
    const beatId = await createBeat(formData);

    // 2. Upload fichiers en parallèle
    await Promise.all([
      coverFile && uploadCover(beatId, coverFile),
      previewFile && uploadPreview(beatId, previewFile, previewDuration),
      mp3File && uploadFullTrack(beatId, 'mp3', mp3File, trackDuration),
      wavFile && uploadFullTrack(beatId, 'wav', wavFile, trackDuration),
    ]);

    // 3. Publier si demandé
    if (shouldPublish) {
      await publishBeat(beatId);
    }

    alert('Beat créé avec succès !');
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la création du beat');
  }
};
```

## Configuration requise

### Backend (Render)

Variables d'environnement:
```
FILEUP_API_KEY=votre_clé_api_fileup
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
FRONTEND_URL=https://www.beatmakerz.fr
```

### Frontend (Vercel)

Variables d'environnement:
```
NEXT_PUBLIC_API_URL=https://beatmakerz-api.onrender.com
```

## Notes importantes

1. **Ordre des opérations:** Créer le beat AVANT d'uploader les fichiers
2. **Authentification:** Tous les endpoints d'upload requièrent un Bearer token valide
3. **FileUp:** Les fichiers sont stockés de manière permanente, les URLs ne changent jamais
4. **MongoDB:** Les `storageKey` et `coverUrl` contiennent les downloadLinks FileUp
5. **Types MIME:** FileUp accepte tous les types de fichiers (images, audio, ZIP)
6. **Taille max:** Pas de limite documentée, mais recommandé < 100MB par fichier

## Dépannage

### Erreur 401 Unauthorized
- Vérifier que le Bearer token est valide
- Vérifier que l'utilisateur a le rôle `admin` ou `seller`

### Erreur 404 Beat not found
- Vérifier que l'ID du beat existe dans MongoDB
- Utiliser l'`_id` retourné par POST /beats

### FileUp upload échoue
- Vérifier que `FILEUP_API_KEY` est configuré sur Render
- Tester le health check: `GET /health` → doit retourner `fileup.status: "healthy"`

### Assets ne s'affichent pas
- Vérifier que `storageKey` contient bien une URL FileUp valide
- Tester l'URL dans le navigateur pour confirmer l'accès
