const strip = require('striptags')
var dateFormat = require('dateformat')

const tsToDate = (ts) => dateFormat(new Date(parseInt(ts) * 1000), "yyyy-mm-dd'T'HH:MM:ss'Z'")

const getParent = (str) => {
  const list = str.split('/')
  return list.splice(0, list.length - 1).join('/')
}

const LISTING_PAGES = ['courseListPage', 'authorsListPage', 'articleListPage', 'undervisningstips']

// ezContentClass
function normalize({fields, category, ezContentType, ezObject, page}) {
  if (['news', 'article', 'textPage'].some(item => item === category) && ezContentType === 'article') {
    // Todo: get date
    const withImage = fields.some(({name}) => name === 'image')
    return fields.reduce((list, item) => {
      if (item.name === 'title') {
        if (ezObject.published) {
          list.push({
            name: "publishedDate",
            value: tsToDate(ezObject.published)
          })
        }
        return list.concat({
          ...item,
          name: 'headline'
        })
      }
      if (item.name === 'intro') {
        return list.concat({
          ...item,
          value: strip(item.value),
          name: 'teaser'
        })
      }
      if (item.name === 'body') {
        if (withImage) {
          const title = fields.find(({name}) => name === 'title').value
          const intro = fields.find(({name}) => name === 'intro')
          const caption = fields.find(({name}) => name === 'caption')
          list.push({
            name: "textAndImage",
            value: {
                layout: "image-left",
                alignment: "image-top",
                text: item.value,
                manchet: intro ? strip(intro.value) : null,
                image: {
                    url: fields.find(({name}) => name === 'image').value,
                    name: title,
                    altText: title,
                    caption: caption ? strip(caption.value) : null,
                }
            }
          })
        } else {
          return list.concat({
            ...item,
            value: {
              text: item.value
            },
            name: 'richTextEditor'
          })
        }
        
      }
      if (item.name === 'image_laying') {
        list.push({
          name: "heroShow",
          value: "true"
        })
        return list.concat({
          name: "heroBackgroundImage",
          value: item.value
        })
      }
      if (item.name === 'image') {
        return list.concat(item)
      }

      return list
    }, []).filter(Boolean)
  }
  if (['news', 'article'].some(item => item === category) && ezContentType === 'guux_article') {
    // Todo: get date
    return fields.reduce((list, item) => {
      if (item.name === 'title') {
        const hasOwnDate = fields.find(({name}) => name === 'date')
        if (!hasOwnDate) {
          if (ezObject.published) {
            list.push({
              name: "publishedDate",
              value: tsToDate(ezObject.published)
            })
          }
        }
        return list.concat({
          ...item,
          name: 'headline'
        })
      }
      if (item.name === 'intro') {
        return list.concat({
          ...item,
          value: strip(item.value),
          name: 'teaser'
        })
      }
      if (item.name === 'image') {
        list.push({
          name: "heroShow",
          value: "true"
        })
        list.push({
          name: "heroBackgroundImage",
          value: item.value
        })
        list.push({
          name: "heroHeadline",
          value: fields.find(({name}) => name === 'title').value
        })
        const intro = fields.find(({name}) => name === 'intro')
        if (intro) {
          list.push({
            name: "heroTeaser",
            value: strip(intro.value)
          })
        }
        return list.concat(item)
      }
      if (item.name === 'date') {
        return list.concat({
          name: "publishedDate",
          value: tsToDate(item.value)
        })
      }
      if (item.name === 'body') {
        return list.concat({
          ...item,
          value: {
            text: item.value
          },
          name: 'richTextEditor'
        })
      }
      return list
    }, []).filter(Boolean)
  }
  if (['news'].some(item => item === category)) {
    // Rest is not valid as news
    return false
  }
  if (['article'].some(item => item === category) && ezContentType === 'guux_tabs') {
    // Todo: get date
    return fields.reduce((list, item) => {
      if (item.name === 'title') {
        if (ezObject.published) {
          list.push({
            name: "publishedDate",
            value: tsToDate(ezObject.published)
          })
        }
        return list.concat({
          ...item,
          name: 'headline'
        })
      }
      if (item.name === 'intro') {
        return list.concat({
          ...item,
          value: strip(item.value),
          name: 'teaser'
        })
      }
      if (item.name === 'text') {
        return list.concat({
          ...item,
          value: {
            text: item.value
          },
          name: 'richTextEditor'
        })
      }
      return list
    }, []).filter(Boolean)
  }
  if (['article'].some(item => item === category)) {
    // Rest is not valid as news
    return false
  }
  if (['textPage'].some(item => item === category) && ezContentType === 'guux_task') {
    // Todo: get date
    return fields.reduce((list, item) => {
      if (item.name === 'name') {
        if (ezObject.published) {
          list.push({
            name: "publishedDate",
            value: tsToDate(ezObject.published)
          })
        }
        return list.concat({
          ...item,
          name: 'headline'
        })
      }
      if (item.name === 'intro') {
        return list.concat({
          ...item,
          value: strip(item.value),
          name: 'teaser'
        })
      }
      if (item.name === 'text') {
        return list.concat({
          ...item,
          value: {
            text: item.value
          },
          name: 'richTextEditor'
        })
      }
      if (item.name === 'image') {
        return list.concat(item)
      }
      return list
    }, []).filter(Boolean)
  }
  if (['textPage'].some(item => item === category) && ['guux_task_group', 'folder', 'file', 'guux_single_page', 'link'].some(item => item === ezContentType)) {
    // This is not valid as textPage
    return false
  }
  if (LISTING_PAGES.some(item => item === category)) {
    // This is not valid as textPage
    return false
  }
  if (['faq'].some(item => item === category) && ezContentType === 'guux_faq_article') {
    // Todo: get date
    return fields.reduce((list, item) => {
      if (item.name === 'question') {
        const answer = fields.find(({name}) => name === 'answer')
        return list.concat({
          custom: true,
          question: item.value,
          answer: answer ? answer.value : '',
          parent: getParent(page.url)
        })
      }
      return list
    }, []).filter(Boolean)
  }
  if (['faq'].some(item => item === category)) {
    // This is not valid as faq
    return false
  }
  if (['course'].some(item => item === category) && ezContentType === 'guux_course') {
    // Todo: get date
    return fields.reduce((list, item) => {
      if (item.name === 'title') {
        list.push({
          name: "subtitle",
          value: ""
        })
        list.push({
          name: "status",
          value: ""
        })
        list.push({
          name: "contact",
          value: ""
        })
        return list.concat({
          ...item,
          name: 'title'
        })
      }
      if (item.name === 'image') {
        return list.concat({
          ...item,
          value: item.value,
          name: 'image'
        })
      }
      if (item.name === 'date') {
        return list.concat({
          ...item,
          value: tsToDate(item.value),
          name: 'startDate'
        })
      }
      if (item.name === 'date_to') {
        return list.concat({
          ...item,
          value: tsToDate(item.value),
          name: 'endDate'
        })
      }
      if (item.name === 'signup_date') {
        return list.concat({
          ...item,
          value: tsToDate(item.value),
          name: 'registrationDeadline'
        })
      }
      if (item.name === 'price') {
        return list.concat({
          ...item,
          value: item.value,
          name: 'price'
        })
      }
      if (item.name === 'address') {
        const location = item.value
        const parts = location.split(', ')
        if (parts.length === 3) {
          const last = parts[2].split(' ')
          if (last.length > 1) {
            const [zip, ...rest] = last
            list.push({
              name: "zipCode",
              value: zip
            })
            list.push({
              name: "city",
              value: rest.join(' ')
            })
            return list.concat({
              ...item,
              value: `${parts[0]}, ${parts[1]}`,
              name: 'location'
            })
          }
        } else {
          return list.concat({
            ...item,
            value: location,
            name: 'location'
          })
        }
      }
      if (item.name === 'signup_link') {
        return list.concat({
          ...item,
          value: item.value,
          name: 'signupUrl'
        })
      }
      if (item.name === 'body') {
        const speakers = fields.find(({name}) => name === 'speakers')
        return list.concat({
          ...item,
          value: {
            text: `${item.value} ${speakers ? `<h2>Kursholdere</h2>${speakers.value}` : ''}`
          },
          name: 'richTextEditor'
        })
      }
      if (item.name === 'program') {
        const items = item.value.split('&')
        return list.concat({
          ...item,
          value: {
            headline: 'Program',
            items: items.map(item => {
              const [scheduleTime, scheduleTitle, scheduleDescription, speaker] = item.split('|')
              return {
                scheduleTime,
                scheduleTitle,
                speaker,
                scheduleDescription
              }
            })
          },
          name: 'schedule'
        })
      }

      
      return list
    }, []).filter(Boolean)
  }
  if (['course'].some(item => item === category)) {
    // This is not valid as faq
    return false
  }
  return fields
}

module.exports = {
  normalize,
  LISTING_PAGES
}
