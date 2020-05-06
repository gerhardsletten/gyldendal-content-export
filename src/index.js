const { json, send } = require('micro')
const { router, get, post } = require('micro-fork')
const query = require('micro-query')
const { getData, getEZData, getMetaTags } = require('./data')
const strings = require('./strings')
const {
  normalize,
  LISTING_PAGES
} = require('./normalizeFields')

async function getUrls(req, res) {
  try {
    const { org, debug } = query(req)
    const { type } = req.params
    if (!type) {
      throw new Error(strings.typeMissing)
    }
    const data = await getData()
    const urls = data
      .filter(({ category }) => type === 'all' ? true : category === type)
      .filter((item) => (org ? org === item.org : true))
      .map((item) => (debug ? item : item.url))
    send(res, 200, {
      contentType: type,
      urls,
    })
  } catch (error) {
    send(res, 500, {
      error: error.message,
    })
  }
}

async function getContent(req, res) {
  try {
    const {
      urls,
      importDetails,
    } = await json(req)
    if (!urls || urls.length < 1) {
      throw new Error(strings.urlsMissing)
    }
    const data = await getData()
    const pages = data
      .filter(({ url }) => urls.some((val) => val === url))
    let ezData
    if (pages.length > 0) {
      const ids = pages.map(({nodeId}) => nodeId)
      ezData = await getEZData(ids)
    }
    send(res, 200, {
      importDetails,
      pages: pages.map((page) => {
        const ezPage = ezData.find(({nodeId}) => nodeId === page.nodeId)
        if (!ezPage || !ezPage.fields) {
          return false
        }
        const fields = normalize({
          fields: ezPage.fields,
          category: page.category,
          ezContentType: ezPage.contentClass,
          ezObject: ezPage,
          page
        })
        const withoutFields = LISTING_PAGES.some((val) => val === page.category)
        if (!fields && !withoutFields) {
          return false
        }
        return {
          pageDetails: {
            contentType: page.category,
            ezContentType: ezPage.contentClass,
            id: page.objectId,
            url: `${page.urlFull}`,
            path: page.url
          },
          metaTags: getMetaTags(ezPage),
          content: withoutFields ? [] : fields.map((item) => {
            const {custom, ...rest} = item
            if (custom) {
              return rest
            }
            const {name, value} = item
            return {
              alias: name,
              value
            }
          }),
          // fields: ezPage.fields
        }
      }).filter(Boolean)
    })
  } catch (error) {
    send(res, 500, {
      error: error.message,
    })
  }
}

const notfound = (req, res) =>
  send(res, 404, {
    error: strings.notFound,
  })

module.exports = router()(
  get('/api/export/urls/:type', getUrls),
  post('/api/export/content', getContent),
  get('/*', notfound)
)
