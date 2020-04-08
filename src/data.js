const neatCsv = require('neat-csv')
const camelCase = require('camelcase')
const got = require('got')
const strip = require('striptags')

const DATA_SHEET = process.env.DATA_SHEET
const EZ_CONTENT_URL = process.env.EZ_CONTENT_URL
const EZ_CONTENT_SECRET = process.env.EZ_CONTENT_SECRET
const DOMAIN = process.env.EZ_CONTENT_DOMAIN

const validCategories = [
  'news',
  'article',
  'articleListPage',
  // 'navigation',
  'textPage',
  'authorsListPage',
  'undervisningstips',
  'courseListPage',
  'course',
  'event',
  'faq',
  //'global'
]

const glOrg = [
  'Barneboeker',
  'Forfattere',
  // 'Hva-skjer',
  // 'Kundeservice',
  'Om-Gyldendal',
  // 'Personvern',
  // 'Presse',
  'Sakprosa',
  'Skjoennlitteratur',
]
const guOrg = ['Barnehage', 'grs', 'vgs']
const gaOrg = ['Faglitteratur', 'Forfatter-i-Gyldendal-Akademisk']

function getOrg(str) {
  if (glOrg.some((item) => item === str)) {
    return 'gl'
  }
  if (guOrg.some((item) => item === str)) {
    return 'gu'
  }
  if (gaOrg.some((item) => item === str)) {
    return 'ga'
  }
  return 'common'
}

function getField(fields, name) {
  const found = fields && fields.find((item) => item.name === name)
  return found ? found.value : ''
}
function striptags(str) {
  return strip(str)
}

function normalizeEzMeta({contentClass, fields}) {
  if (['article'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: striptags(getField(fields, 'intro')),
      thumbnail: getField(fields, 'image')
    }
  }
  if (['link'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'name'),
      description: striptags(getField(fields, 'description'))
    }
  }
  if (['folder'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'name'),
      description: striptags(getField(fields, 'description'))
    }
  }
  if (['html'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title')
    }
  }
  if (['guux_article'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: striptags(getField(fields, 'intro')),
      thumbnail: getField(fields, 'image')
    }
  }
  if (['guux_tabs'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: striptags(getField(fields, 'intro')),
    }
  }
  
  return {

  }
}

function normalizeFields(fields) {
  return fields.map(({name, type, value}) => {
    if (type === 'ezimage') {
      return {
        name,
        type,
        value: `${DOMAIN}${value}`
      }
    }
    return {
      name,
      type,
      value
    }
  })
}

function normalizeEz(item) {
  const fields = normalizeFields(item.fields)
  return {
    ...item,
    fields,
    meta: normalizeEzMeta({...item, fields})
  }
}

function chuckedArray(arr, chunkSize) {
  return Array(Math.ceil(arr.length/chunkSize)).fill().map(function(_,i){
      return arr.slice(i*chunkSize,i*chunkSize+chunkSize);
  })
}
Object.defineProperty(Array.prototype, 'chunk', {
  
})

async function getEZData(ids) {
  // Split ids in groups for faster fetch, because ez is slow..
  const idGroups = chuckedArray(ids, 10)
  let fetched = []
  for await (const idGroup of idGroups) {
    const { body } = await got(EZ_CONTENT_URL, {
      responseType: 'json',
      method: 'post',
      headers: {
        Authorization: EZ_CONTENT_SECRET,
        'User-Agent': 'curl'
      },
      json: {
        ids: idGroup
      },
    })
    if (body.data) {
      fetched = fetched.concat(body.data.map(normalizeEz))
    }
  }
  return fetched
}

function getMetaTags(page) {
  if (!page) {
    return {}
  }
  const {title, description, thumbnail} = page.meta
  return {
    title,
    contentLanguage: 'no-bokmaal',
    author: 'Gyldendal Norsk Forlag',
    copyright: 'Gyldendal Norsk Forlag',
    description,
    thumbnail,
    openGraphTitle: title,
    openGraphDescription: description,
    openGraphType: 'article',
    openGraphImage: thumbnail
  }
}

async function getData() {
  const { body } = await got(DATA_SHEET)
  const raw = await neatCsv(body, {
    separator: ',',
    mapHeaders: ({ header }) => camelCase(header),
  })
  const data = raw
    .map(({ nodeId, objectId, category, newDestination, url, ...rest }) => {
      const tags = []
      Object.keys(rest)
        .filter((name) => name.indexOf('tag') !== -1)
        .forEach((tag) => {
          if (rest[tag]) {
            tags.push(rest[tag])
          }
        })
      const urls = url.split('/')
      return {
        nodeId,
        objectId,
        category: camelCase(category),
        newDestination: newDestination.toLowerCase(),
        url: `/${url}`,
        urlFull: `${DOMAIN}/${url}`,
        org: getOrg(urls[0]),
        tags,
      }
    })
    .filter(({ category }) => validCategories.some((cat) => cat === category))
  return data
}

module.exports = {
  getData,
  getEZData,
  getMetaTags
}
