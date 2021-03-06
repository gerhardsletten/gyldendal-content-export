const neatCsv = require('neat-csv')
const camelCase = require('camelcase')
const got = require('got')
const strip = require('striptags')
const pMap = require('p-map')
const strShorten = require('str_shorten')

const DATA_SHEET = process.env.DATA_SHEET
const EZ_CONTENT_URL = process.env.EZ_CONTENT_URL
const EZ_CONTENT_SECRET = process.env.EZ_CONTENT_SECRET
const DOMAIN = process.env.EZ_CONTENT_DOMAIN

const validCategories = [
  'news', // Ok
  'article', // Ok
  'articleListPage', // OK
  'textPage', // Ok
  'authorsListPage', // Ok
  'undervisningstips', // OK
  'courseListPage', // Ok
  'course', // Ok
  'event', // Ok
  'faq', // Ok?? 
  // Disabled
  // 'global',
  // 'navigation',
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
function fixDescription(str) {
  if (!str) {
    return ''
  }
  return strShorten(strip(str.replace(/&nbsp;/g, ' ').replace(/\s\s+/g, ' ')), 157)
}


function normalizeEzMeta({contentClass, fields}) {
  if (['article'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: fixDescription(getField(fields, 'intro')),
      thumbnail: getField(fields, 'image')
    }
  }
  if (['link'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'name'),
      description: fixDescription(getField(fields, 'description'))
    }
  }
  if (['folder'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'name'),
      description: fixDescription(getField(fields, 'description'))
    }
  }
  if (['html'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: ''
    }
  }
  if (['guux_article'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: fixDescription(getField(fields, 'intro')),
      thumbnail: getField(fields, 'image')
    }
  }
  if (['guux_tabs'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: fixDescription(getField(fields, 'intro')),
    }
  }
  if (['guux_task'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'name'),
      description: fixDescription(getField(fields, 'intro')),
    }
  }
  if (['guux_course'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: fixDescription(getField(fields, 'body')),
    }
  }
  if (['event'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: fixDescription(getField(fields, 'short_text')),
    }
  }
  if (['guux_single_page'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: fixDescription(getField(fields, 'text')),
      thumbnail: getField(fields, 'image')
    }
  }
  if (['guux_course_calendar'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'title'),
      description: '',
      thumbnail: getField(fields, 'image')
    }
  }
  if (['guux_skolestudio'].some((item) => item === contentClass)) {
    return {
      title: getField(fields, 'name'),
      description: ''
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

async function getEZData(ids) {
  // Split ids in groups for faster fetch, because ez is slow..
  const idGroups = chuckedArray(ids, 5)
  const mapper = async ids => {
    const { body } = await got(EZ_CONTENT_URL, {
      responseType: 'json',
      method: 'post',
      headers: {
        Authorization: EZ_CONTENT_SECRET,
        'User-Agent': 'curl'
      },
      json: {
        ids
      },
    })
    if (body.data) {
      const filtered = body.data.filter(Boolean).filter(({fields}) => !!fields).map(normalizeEz)
      if (filtered.length) {
        return filtered
      }
    }
    return null
  }
  const data = await pMap(idGroups, mapper, {concurrency: 6})
  const valid = data.filter(Boolean)
  const combined = valid.flat(1)
  return combined
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
    .map(({ nodeId, objectId, category, newDestination, url, name, ...rest }) => {
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
        name,
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
