# Gyldendal content export

Microservice for å hente ut tilgjennelig innhold for eksport fra eZ Publish

## Hent en liste med url'er tilgjennelig for ekport

`GET /api/export/urls/:type`

* type - definerte kategorier eller `all` for alle
* org - filtrer på organisasjon: ga, gl, gu, common (query-param)
* debug - vise objekter istetefor en liste med url'er for debugging av hva som er tilgjennelig for eksport (query-param)

### Returnerer

```
{
  contentType: 'news',
  urls: [
    '/Barneboeker/Apper/Ballen',
    '/Barneboeker/Apper/Barbie-Nils-og-pistolproblemet'
  ]
}
```

## Hent ut innhold for en liste med url'er

`POST /api/export/content`

JSON-body:

```
{
  urls: [
    '/Barneboeker/Apper/Ballen',
    '/Barneboeker/Apper/Barbie-Nils-og-pistolproblemet'
  ],
  importDetails: {
    tags: ['Barnebøker'],
    destination: 123
  }
}
```

### Returnerer

```
{
  importDetails: {
    tags: ['Barnebøker'],
    destination: 123
  },
  pages: [{
    pageDetails: {
      contentType: 'page',
      id: '324345',
      url: 'https://www.gyldendal.no/Barneboeker/Apper/Ballen',
      path: '/Barneboeker/Apper/Ballen'
    },
    metaTags: {
      title: 'Lorem ipusm',
      description: 'Lorem ipusm'
    },
    content: [{
      alias: 'title',
      title: 'Lorem ipusm'
    }, {
      alias: 'intro',
      title: '<p>Lorem ipusm...</p>'
    }]
  }]
}
```
