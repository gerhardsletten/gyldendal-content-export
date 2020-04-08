require('dotenv').config()
const test = require('ava')
const listen = require('test-listen')
const micro = require('micro')
const got = require('got')

const service = require('..')
const strings = require('../strings')

test('Can answer on GET', async(t) => {
  const app = micro(service)
  const url = await listen(app)
  try {
    await got(url, {
      responseType: 'json',
    })
  } catch (error) {
    t.is(typeof error.response.body, 'object')
    t.is(error.response.body.error, strings.notFound)
  }
  app.close()
})
test('getUrls fail if type is missing', async(t) => {
  const app = micro(service)
  const url = await listen(app)
  try {
    await got(`${url}/api/export/urls/`, {
      responseType: 'json',
    })
  } catch (error) {
    t.is(typeof error.response.body, 'object')
    t.is(error.response.body.error, strings.typeMissing)
  }
  app.close()
})
test('getUrls return a contentType and a list of urls', async(t) => {
  const app = micro(service)
  const url = await listen(app)
  const type = 'news'
  const { body } = await got(`${url}/api/export/urls/${type}?debug=1`, {
    responseType: 'json',
  })
  t.is(typeof body, 'object')
  t.is(body.contentType, type)
  t.truthy(body.urls.length)
  app.close()
})
test('getUrls can handle a org params', async(t) => {
  const app = micro(service)
  const url = await listen(app)
  const type = 'news'
  const org = 'gu'
  const { body } = await got(
    `${url}/api/export/urls/${type}?org=${org}&debug=1`,
    {
      responseType: 'json',
    }
  )
  const notOrg = body.urls.filter((item) => org !== item.org)
  t.is(notOrg.length, 0)
  app.close()
})
test('getContent fail if urls is missing', async(t) => {
  const app = micro(service)
  const url = await listen(app)
  try {
     await got(`${url}/api/export/content`, {
      responseType: 'json',
      method: 'post',
      json: {
        
      }
    })
  } catch (error) {
    t.is(typeof error.response.body, 'object')
    t.is(error.response.body.error, strings.urlsMissing)
  }
  app.close()
})
test('getContent can return a list of pages', async(t) => {
  const app = micro(service)
  const url = await listen(app)
  const tags = ['Barnebøker']
  const destination = 123
  const { body } = await got(`${url}/api/export/content`, {
    responseType: 'json',
    method: 'post',
    json: {
      urls: [
        '/Barneboeker/Apper/Ballen',
        '/Barneboeker/Apper/Barbie-Nils-og-pistolproblemet',
      ],
      importDetails: {
        tags,
        destination
      },
    },
  })
  t.is(typeof body, 'object')
  t.is(typeof body.importDetails, 'object')
  t.deepEqual(tags, body.importDetails.tags)
  t.is(body.importDetails.destination, destination)
  t.is(typeof body.pages, 'object')
  const [page] = body.pages
  t.truthy(page.content.length)
  t.is(typeof page.content[0].alias, 'string')
  t.is(typeof page.content[0].value, 'string')
  t.is(typeof page.metaTags, 'object')
  t.is(typeof page.metaTags.title, 'string')
  app.close()
})
