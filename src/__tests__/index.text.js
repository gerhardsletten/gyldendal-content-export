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
        '/Barneboeker/Apper/Eg-og-Pontus-gaar-for-gull',
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
test('news return correct', async(t) => {
  await testContentType(t, 'news')
})
test('article return correct', async(t) => {
  await testContentType(t, 'article')
})
test('textPage return correct', async(t) => {
  await testContentType(t, 'textPage')
})
test('faq return correct', async(t) => {
  const type = 'faq'
  const body = await getCase(t, type)
  body.pages.forEach(({pageDetails, content}) => {
    t.is(pageDetails.contentType, type)
    const hasFaqField = content.find((item) => !!item['question'])
    if (!hasFaqField) {
      console.log(`Type ${type} error content`, pageDetails.url, pageDetails.ezContentType)
    }
    t.truthy(hasFaqField)
  })
})
test('courseListPage should return zero content', async(t) => {
  await testCategoryType(t, 'courseListPage')
})
test('undervisningstips should return zero content', async(t) => {
  await testCategoryType(t, 'undervisningstips', 20)
})
test('authorsListPage should return zero content', async(t) => {
  await testCategoryType(t, 'authorsListPage')
})
test('articleListPage should return zero content', async(t) => {
  await testCategoryType(t, 'articleListPage')
})

async function getCase(t, type, limit = 300) {
  t.timeout(30000)
  const app = micro(service)
  const url = await listen(app)
  const { body: { urls } } = await got(`${url}/api/export/urls/${type}`, {
    responseType: 'json',
  })
  const usedUrls = urls.filter((item, i) => i < limit)
  console.log(`Type ${type}, found ${urls.length}, used ${usedUrls.length}`)
  try {
    const { body } = await got(`${url}/api/export/content`, {
      responseType: 'json',
      method: 'post',
      json: {
        urls: usedUrls
      },
    })
    console.log(`Type ${type}, got from ez ${body.pages.length}`)
    app.close()
    return body
  } catch (error) {
    console.log(`Error ${type}`, error.response.body)
    app.close()
  }
}

async function testContentType(t, type, limit) {
  const body = await getCase(t, type, limit)
  body.pages.forEach(({pageDetails, content}) => {
    t.is(pageDetails.contentType, type)
    const fields = content.map((item) => item.alias)
    const hasHeadline = fields.some(k => k === 'headline')
    const hasDate = fields.some(k => k === 'publishedDate')
    if (!hasHeadline) {
      console.log(`Type ${type} error content`, pageDetails.url, pageDetails.ezContentType)
    }
    if (!hasDate) {
      console.log(`Type ${type} error hasDate`, pageDetails.url, pageDetails.ezContentType)
    }
    t.truthy(hasHeadline)
    t.truthy(hasDate)
  })
}

async function testCategoryType(t, type, limit = 300) {
  const body = await getCase(t, type, limit)
  body.pages.forEach(({pageDetails, content}) => {
    t.is(pageDetails.contentType, type)
    if (content.length !== 0) {
      console.log(`Type ${type} error content`, pageDetails.url, pageDetails.ezContentType)
    }
    t.is(content.length, 0)
  })
}